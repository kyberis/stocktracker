import { createNotification } from "@/lib/db/notifications";
import {
  completeReStep,
  failReStep,
  getReResult,
  getReScreeningRunUnscoped,
  leaseNextReStep,
  listReStepsForRun,
  updateReScreeningRun,
  upsertReResult,
  upsertListingCache,
  type ReStepRow,
} from "@/lib/db/real-estate-screening";
import type {
  CandidateCard,
  Cobertura,
  DiscardedListing,
  PhaseProgress,
  RealEstateScreeningParams,
  ReScreeningPhase,
  ScreeningReportPayload,
  ZonaIneDerived,
} from "../schemas";
import { RE_SCREENING_PHASES } from "../schemas";
import { loadZonaIneDerived } from "../services/ine";
import { classifyFlags, extractUsableAreaM2, isHardExcluded } from "../services/flags";
import { dualDiscount } from "../services/umbral";
import { estimateRent } from "../services/renta";
import { buildScenarios, costesCompra, loadImpuestos, pickFiscalRegime } from "../services/finanzas";
import { getPortalAdapter, type Listing, type ListingDetail, type RentListing } from "../services/portal";
import { verifyListingLink } from "../services/link-verify";
import type { ListingFlag } from "../schemas";

type DetailWithFlags = ListingDetail & { flags: ListingFlag[] };

interface RunContext {
  runId: string;
  userId: string;
  zonas: Array<{ geocod: string; nombre: string }>;
  params: RealEstateScreeningParams;
  ine?: ZonaIneDerived[];
  listings?: Listing[];
  details?: DetailWithFlags[];
  rents?: RentListing[];
  candidates?: CandidateCard[];
  discarded?: DiscardedListing[];
  cobertura?: Cobertura;
  payload?: ScreeningReportPayload;
}

function progressFromSteps(steps: ReStepRow[]): PhaseProgress[] {
  return RE_SCREENING_PHASES.map((phase) => {
    const step = steps.find((s) => s.phase === phase);
    return {
      phase,
      status: step?.status ?? "pending",
      label: phase,
      countLabel: undefined,
      error: step?.errorMessage,
    };
  });
}

function parseCtx(steps: ReStepRow[], base: RunContext): RunContext {
  const ctx = { ...base };
  for (const step of steps) {
    if (step.status !== "done" || !step.payloadJson) continue;
    try {
      const p = JSON.parse(step.payloadJson) as Partial<RunContext>;
      Object.assign(ctx, p);
    } catch {
      // ignore
    }
  }
  return ctx;
}

function conclusionsFrom(payload: Omit<ScreeningReportPayload, "conclusions">): ScreeningReportPayload["conclusions"] {
  const n = payload.candidates.length;
  const avgCf =
    n > 0
      ? payload.candidates.reduce((s, c) => s + (c.scenarios[0]?.cashflow ?? 0), 0) / n
      : 0;
  const failed = payload.zonas.filter((z) => z.failed).length;
  const gaps = payload.brechaPedidoVsFirmado.filter((g) => g.brechaPct != null && g.brechaPct > 25);
  const c1 =
    n === 0
      ? {
          title: "No listings cleared the filters",
          body: payload.emptyReason ?? "Tighten or loosen budget and size, then rerun.",
        }
      : {
          title: `${n} candidate${n === 1 ? "" : "s"} with modelled cash-flow`,
          body:
            avgCf >= 0
              ? `Typical modelled monthly cash-flow after vacancy, costs, IRS and the variable-rate installment is about €${avgCf.toFixed(0)}.`
              : `Typical modelled cash-flow is negative (about €${avgCf.toFixed(0)}/month) at the configured rate — stress the down payment before looking at yield.`,
        };
  const c2 = {
    title: gaps.length > 0 ? "Asking rents sit well above signed INE contracts" : "Asking vs signed rent is close",
    body:
      gaps.length > 0
        ? `${gaps.length} zone/typology pairs show advertised rent more than 25% above the INE new-contract median. Treat portal asking rent as a ceiling, not a close.`
        : "Where we have both figures, advertised rent is not far from the INE signed median.",
  };
  const c3 = {
    title: failed > 0 ? `${failed} zone(s) missing official series` : "Official INE coverage is complete for this cut",
    body:
      failed > 0
        ? "Those zones are declared in coverage; they were not interpolated."
        : "Every selected zone has a current INE sale or rent median in the cache.",
  };
  return [c1, c2, c3];
}

async function runIne(ctx: RunContext): Promise<Partial<RunContext>> {
  const ine = await loadZonaIneDerived(ctx.zonas);
  return { ine };
}

async function runListings(ctx: RunContext): Promise<Partial<RunContext>> {
  const portal = getPortalAdapter();
  const listings: Listing[] = [];
  const seen = new Set<string>();
  const zonasFallidas: Cobertura["zonasFallidas"] = [];
  for (const z of ctx.zonas) {
    try {
      const found = await portal.buscarVentas(z, ctx.params);
      for (const l of found) {
        if (seen.has(l.id)) continue;
        seen.add(l.id);
        listings.push(l);
        await upsertListingCache({
          portal: "stub",
          listingId: l.id,
          payloadJson: JSON.stringify(l),
        });
      }
    } catch (err) {
      zonasFallidas.push({
        geocod: z.geocod,
        nombre: z.nombre,
        reason: err instanceof Error ? err.message : "listing search failed",
      });
    }
  }
  const cobertura: Cobertura = {
    anunciosVistos: listings.length,
    anunciosUnicos: listings.length,
    zonasOk: ctx.zonas.filter((z) => !zonasFallidas.some((f) => f.geocod === z.geocod)).map((z) => z.geocod),
    zonasFallidas,
    muestral: true,
    notas: ["Listing coverage is a sample (stub adapter in production)."],
  };
  return { listings, cobertura };
}

async function runDiscounts(ctx: RunContext): Promise<Partial<RunContext>> {
  const portal = getPortalAdapter();
  const details: DetailWithFlags[] = [];
  const discarded: DiscardedListing[] = [];
  for (const listing of ctx.listings ?? []) {
    try {
      const detail = await portal.obtenerFicha(listing.id);
      const flags = classifyFlags(detail.description);
      if (isHardExcluded(flags)) {
        discarded.push({
          listingId: listing.id,
          titulo: detail.titulo,
          url: detail.url,
          geocod: listing.geocod,
          flags,
          reason: flags
            .filter((f) => f.severity === "hard")
            .map((f) => `${f.kind}: “${f.quote}”`)
            .join("; "),
        });
        continue;
      }
      details.push({ ...listing, ...detail, flags });
    } catch (err) {
      discarded.push({
        listingId: listing.id,
        titulo: listing.titulo,
        url: listing.url,
        geocod: listing.geocod,
        flags: [],
        reason: err instanceof Error ? err.message : "detail fetch failed",
      });
    }
  }
  return { details, discarded: [...(ctx.discarded ?? []), ...discarded] };
}

async function runRents(ctx: RunContext): Promise<Partial<RunContext>> {
  const portal = getPortalAdapter();
  const rents: RentListing[] = [];
  for (const z of ctx.zonas) {
    try {
      const found = await portal.buscarAlquileres(z, "T2");
      rents.push(...found);
    } catch {
      // declared in cobertura later
    }
  }
  return { rents };
}

async function runFinance(ctx: RunContext): Promise<Partial<RunContext>> {
  const cfg = loadImpuestos();
  const params = ctx.params;
  const candidates: CandidateCard[] = [];
  const discarded = [...(ctx.discarded ?? [])];

  for (const raw of ctx.details ?? []) {
    const detail = raw;
    const flags = detail.flags ?? classifyFlags(detail.description);
    const { areaUtilM2, areaUsadaM2 } = extractUsableAreaM2(detail.description, detail.areaM2);
    const zona = ctx.ine?.find((z) => z.geocod === detail.geocod);
    const eurM2 = areaUsadaM2 > 0 ? detail.precio / areaUsadaM2 : 0;
    const disc = dualDiscount(eurM2, zona?.precioM2Actual ?? null, zona?.precioM2Media5a ?? null);
    const rentEst = estimateRent({
      areaM2: areaUsadaM2,
      tipologia: detail.tipologia,
      comps: (ctx.rents ?? [])
        .filter((r) => r.geocod === detail.geocod)
        .map((r) => ({ id: r.id, m2: r.m2, rent: r.rent, tipologia: r.tipologia })),
      rentaIneM2: zona?.rentaM2 ?? null,
    });
    const renta = rentEst.afterNegotiation ?? rentEst.renta;
    const entradaEur = (params.entradaPct / 100) * detail.precio;
    const costes = costesCompra(detail.precio, params.tipoCompra, cfg);
    const cajaCierre = entradaEur + costes;
    const principal = Math.max(0, detail.precio - entradaEur);
    const nMonths = params.plazoCreditoAnios * 12;
    const fiscal = pickFiscalRegime({
      rentaPedida: renta ?? 0,
      areaM2: areaUsadaM2,
      rentaIneM2: zona?.rentaM2 ?? null,
      cfg,
    });
    const scenarios = renta
      ? buildScenarios({
          rentaFirmada: renta,
          precio: detail.precio,
          principal,
          nMonths,
          irsTasa: fiscal.mejor.tasa,
          cfg,
        })
      : [];
    const verify = await verifyListingLink(detail, {
      precio: detail.precio,
      tipologia: detail.tipologia,
    });
    const netYield =
      renta && detail.precio > 0
        ? ((renta * 12 * (1 - cfg.vacancia) - (scenarios[0]?.gastos ?? 0) * 12 - fiscal.mejor.irsAnual) /
            detail.precio) *
          100
        : null;

    candidates.push({
      listingId: detail.id,
      portal: "stub",
      url: verify.verified ? detail.url : detail.url,
      urlVerified: verify.verified,
      titulo: detail.titulo,
      concelho: detail.concelho,
      geocod: detail.geocod,
      precio: detail.precio,
      areaM2: detail.areaM2,
      areaUtilM2,
      areaUsadaM2,
      eurM2,
      tipologia: detail.tipologia,
      descuentoVsMedianaPct: disc.vsMedianaPct,
      descuentoVsMedia5aPct: disc.vsMedia5aPct,
      rentaEstimada: renta,
      rentaExplicacion: rentEst.explicacion,
      rentaBajaConfianza: rentEst.revisionManual,
      yieldNetaPct: netYield,
      cobertura: scenarios[0]?.cobertura ?? null,
      cajaCierre,
      scenarios,
      fiscalMejor: fiscal.mejor,
      fiscalAlternativa: fiscal.alternativa,
      flags,
      searchUrl: `https://www.idealista.pt/comprar-casas/${encodeURIComponent(detail.concelho.toLowerCase())}/com-preco-max_${params.presupuestoMaxEur},tamanho-min_${params.superficieMinM2}/`,
    });
  }

  return { candidates, discarded };
}

async function runReport(ctx: RunContext): Promise<Partial<RunContext>> {
  const cfg = loadImpuestos();
  const params = ctx.params;
  const examplePrice = params.presupuestoMaxEur;
  const entradaEur = (params.entradaPct / 100) * examplePrice;
  const costes = costesCompra(examplePrice, params.tipoCompra, cfg);
  const principal = examplePrice - entradaEur;
  const nMonths = params.plazoCreditoAnios * 12;
  const demo = buildScenarios({
    rentaFirmada: 1000,
    precio: examplePrice,
    principal,
    nMonths,
    irsTasa: cfg.rendaModeradaTasa,
    cfg,
  });

  const brechaPedidoVsFirmado: ScreeningReportPayload["brechaPedidoVsFirmado"] = [];
  for (const z of ctx.ine ?? []) {
    const rents = (ctx.rents ?? []).filter((r) => r.geocod === z.geocod);
    if (rents.length === 0) {
      brechaPedidoVsFirmado.push({
        geocod: z.geocod,
        nombre: z.nombre,
        tipologia: "T2",
        pedidoM2: null,
        firmadoM2: z.rentaM2,
        brechaPct: null,
      });
      continue;
    }
    const pedidoM2 = rents.reduce((s, r) => s + r.rent / r.m2, 0) / rents.length;
    const brechaPct =
      z.rentaM2 != null && z.rentaM2 > 0 ? ((pedidoM2 - z.rentaM2) / z.rentaM2) * 100 : null;
    brechaPedidoVsFirmado.push({
      geocod: z.geocod,
      nombre: z.nombre,
      tipologia: "T2",
      pedidoM2,
      firmadoM2: z.rentaM2,
      brechaPct,
    });
  }

  const emptyReason =
    (ctx.candidates ?? []).length === 0
      ? "No listings survived filters and hard flags at this budget and size. That can mean an efficient local market or a tight budget — not a system error."
      : null;

  const draft: Omit<ScreeningReportPayload, "conclusions"> = {
    arithmetic: {
      presupuestoMaxEur: params.presupuestoMaxEur,
      entradaPct: params.entradaPct,
      entradaEur,
      costesCompraTipicos: costes,
      cajaCierreTipica: entradaEur + costes,
      cuotaVariavel: demo[0]?.cuota ?? 0,
      cuotaFixa: demo[1]?.cuota ?? 0,
      cuotaStress: demo[2]?.cuota ?? 0,
    },
    brechaPedidoVsFirmado,
    zonas: ctx.ine ?? [],
    candidates: ctx.candidates ?? [],
    discarded: ctx.discarded ?? [],
    method: {
      supuestos: [
        `Vacancy ${(cfg.vacancia * 100).toFixed(0)}%, maintenance ${(cfg.mantenimientoSobreRenta * 100).toFixed(0)}% of signed rent.`,
        `Variable TAN ${(cfg.tipos.variavel * 100).toFixed(2)}%, fixed ${(cfg.tipos.fixa * 100).toFixed(2)}%, stress +${(cfg.tipos.stressAddPp * 100).toFixed(0)} pp.`,
        "IMT + 0.8% stamp + €2,000 registry from config/impuestos.json.",
        "INE points are never interpolated; null stays null.",
        "Listing source is the stub adapter (see ADR).",
      ],
      noCubierto: [
        "Micro-location rent adjustments (human).",
        "Live portal pagination beyond the fixture sample.",
        "Map / transport overlay.",
      ],
    },
    emptyReason,
  };

  const payload: ScreeningReportPayload = {
    ...draft,
    conclusions: conclusionsFrom(draft),
  };

  const failedZones = (ctx.ine ?? []).filter((z) => z.failed).map((z) => ({
    geocod: z.geocod,
    nombre: z.nombre,
    reason: z.failReason ?? "no INE data",
  }));
  const cobertura: Cobertura = {
    anunciosVistos: ctx.cobertura?.anunciosVistos ?? (ctx.listings?.length ?? 0),
    anunciosUnicos: ctx.candidates?.length ?? 0,
    zonasOk: (ctx.ine ?? []).filter((z) => !z.failed).map((z) => z.geocod),
    zonasFallidas: [...(ctx.cobertura?.zonasFallidas ?? []), ...failedZones],
    muestral: true,
    notas: ctx.cobertura?.notas ?? [],
  };

  await upsertReResult(ctx.runId, JSON.stringify(payload), JSON.stringify(cobertura));
  return { payload, cobertura };
}

const HANDLERS: Record<ReScreeningPhase, (ctx: RunContext) => Promise<Partial<RunContext>>> = {
  ine: runIne,
  listings: runListings,
  discounts: runDiscounts,
  rents: runRents,
  finance: runFinance,
  report: runReport,
};

export async function processOneReStep(runId?: string): Promise<{ processed: number; moreWork: boolean }> {
  const step = await leaseNextReStep(runId);
  if (!step) return { processed: 0, moreWork: false };

  const run = await getReScreeningRunUnscoped(step.runId);
  if (!run) {
    await failReStep(step.id, "run missing", step.attempts);
    return { processed: 1, moreWork: false };
  }

  const steps = await listReStepsForRun(run.id);
  let zonas: Array<{ geocod: string; nombre: string }> = [];
  try {
    zonas = JSON.parse(run.zonasJson) as typeof zonas;
  } catch {
    zonas = [];
  }
  let params = {} as RealEstateScreeningParams;
  try {
    params = JSON.parse(run.paramsJson) as RealEstateScreeningParams;
  } catch {
    // keep empty
  }

  const ctx = parseCtx(steps, {
    runId: run.id,
    userId: run.userId,
    zonas,
    params,
  });

  await updateReScreeningRun(run.id, {
    status: "running",
    phase: step.phase,
    progressJson: JSON.stringify(progressFromSteps(steps.map((s) => (s.id === step.id ? { ...s, status: "running" } : s)))),
  });

  try {
    const patch = await HANDLERS[step.phase](ctx);
    const merged = { ...ctx, ...patch };
    const slim: Record<string, unknown> = {};
    for (const key of ["ine", "listings", "details", "rents", "candidates", "discarded", "cobertura", "payload"] as const) {
      if (merged[key] !== undefined) slim[key] = merged[key];
    }
    await completeReStep(step.id, JSON.stringify(slim));
    const nextSteps = await listReStepsForRun(run.id);
    const allDone = nextSteps.every((s) => s.status === "done" || s.status === "failed" || s.status === "skipped");
    const anyFail = nextSteps.some((s) => s.status === "failed") || (merged.cobertura?.zonasFallidas.length ?? 0) > 0;
    if (allDone) {
      await updateReScreeningRun(run.id, {
        status: anyFail ? "partial" : "completed",
        phase: "report",
        progressJson: JSON.stringify(progressFromSteps(nextSteps)),
        finished: true,
      });
      try {
        await createNotification(run.userId, {
          type: "info",
          title: "Zone screening ready",
          titleEs: "Cribado de zona listo",
          message: "Your Portugal zone report is ready to open.",
          messageEs: "El informe de zona en Portugal ya se puede abrir.",
          link: `/real-estate/screening/runs/${run.id}`,
          linkLabel: "Open report",
          linkLabelEs: "Abrir informe",
        });
      } catch {
        // best-effort
      }
    } else {
      await updateReScreeningRun(run.id, {
        status: "running",
        phase: step.phase,
        progressJson: JSON.stringify(progressFromSteps(nextSteps)),
      });
    }
    return { processed: 1, moreWork: !allDone };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "phase failed";
    await failReStep(step.id, msg, step.attempts);
    const nextSteps = await listReStepsForRun(run.id);
    const exhausted = nextSteps.find((s) => s.id === step.id)?.status === "failed";
    if (exhausted && step.phase === "report") {
      await updateReScreeningRun(run.id, {
        status: "failed",
        error: msg,
        progressJson: JSON.stringify(progressFromSteps(nextSteps)),
        finished: true,
      });
    }
    return { processed: 1, moreWork: !exhausted };
  }
}

export { progressFromSteps, getReResult };
