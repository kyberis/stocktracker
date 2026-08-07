import type { ScreeningAgentOutputRow } from "@/lib/db/screening";
import type { ScreeningRunRow } from "@/lib/db/screening";
import {
  hardDataOutputSchema,
  compilerReportDraftSchema,
  aggregateIrBusinessOutputSchema,
  aggregateWebSentimentOutputSchema,
  portfolioContextOutputSchema,
  riskOutputSchema,
  screeningBriefSchema,
  screeningReportSchema,
  type ScreeningReport,
  type HardDataOutput,
  type CompilerReportDraft,
  type AggregateIrBusinessOutput,
  type AggregateWebSentimentOutput,
  type PortfolioContextOutput,
  type RiskOutput,
  type ScreeningBrief,
  type ScreeningCandidateCard,
  type IrBusinessOutput,
  type WebSentimentOutput,
} from "@/lib/screening/schemas";

/**
 * Compose the ScreeningReport from Hard Data + Compiler (+ optional IR / Web /
 * Portfolio Context / Risk) outputs the orchestrator persisted (HLD §5.3).
 */
export interface ComposeReportInput {
  run: ScreeningRunRow;
  hardDataRow: ScreeningAgentOutputRow;
  compilerRow: ScreeningAgentOutputRow;
  /** Optional IR aggregate from Agent 2 (E4). */
  irAggregateRow?: ScreeningAgentOutputRow | null;
  webAggregateRow?: ScreeningAgentOutputRow | null;
  portfolioContextRow?: ScreeningAgentOutputRow | null;
  riskRow?: ScreeningAgentOutputRow | null;
  /** Which agent kinds are still pending — surfaced as `partial=true` in UI. */
  pendingAgentKinds?: string[];
  /** How many candidates the caller asked for (defaults to all). */
  candidateLimit?: number;
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Clip optional prose to schema max lengths (Hard Data analysisSummary is 400; card one-liner is 280). */
function clip(value: string | null | undefined, max: number): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function mapIrSources(
  ir: IrBusinessOutput,
): ScreeningCandidateCard["sources"] {
  const out: ScreeningCandidateCard["sources"] = [];
  for (const s of ir.guidance.sources) {
    if (!s.url || !s.url.startsWith("http")) continue;
    try {
      out.push({
        url: s.url,
        asOf: s.asOf || ir.guidance.asOf,
        field: "guidance",
        label: s.label,
      });
    } catch {
      // skip invalid urls
    }
  }
  for (const c of ir.catalysts) {
    for (const s of c.sources) {
      if (!s.url || !s.url.startsWith("http")) continue;
      try {
        out.push({
          url: s.url,
          asOf: s.asOf || ir.guidance.asOf,
          field: "catalyst",
          label: s.label ?? c.label,
        });
      } catch {
        // skip
      }
    }
  }
  return out.slice(0, 12);
}

function mapWebSources(
  web: WebSentimentOutput,
): ScreeningCandidateCard["sources"] {
  const out: ScreeningCandidateCard["sources"] = [];
  for (const signal of web.signals) {
    for (const s of signal.sources) {
      if (!s.url || !s.url.startsWith("http")) continue;
      try {
        out.push({
          url: s.url,
          asOf: s.asOf || new Date().toISOString().slice(0, 10),
          field: "sentiment",
          label: s.label ?? signal.kind,
        });
      } catch {
        // skip
      }
    }
  }
  for (const s of web.insiderSummary.sources) {
    if (!s.url || !s.url.startsWith("http")) continue;
    try {
      out.push({
        url: s.url,
        asOf: s.asOf || new Date().toISOString().slice(0, 10),
        field: "insider",
        label: s.label,
      });
    } catch {
      // skip
    }
  }
  return out.slice(0, 12);
}

export function composeScreeningReport(
  input: ComposeReportInput,
): ScreeningReport | null {
  const brief = safeParseJson<Record<string, unknown>>(input.run.briefJson);
  const briefParsed = brief ? screeningBriefSchema.safeParse(brief) : null;
  const parsedBrief: ScreeningBrief | null =
    briefParsed && briefParsed.success ? briefParsed.data : null;

  const hardRaw = safeParseJson<Record<string, unknown>>(input.hardDataRow.outputJson);
  const hardParsed = hardRaw ? hardDataOutputSchema.safeParse(hardRaw) : null;
  const hardData: HardDataOutput | null =
    hardParsed && hardParsed.success ? hardParsed.data : null;

  const draftRaw = safeParseJson<Record<string, unknown>>(input.compilerRow.outputJson);
  const draftParsed = draftRaw ? compilerReportDraftSchema.safeParse(draftRaw) : null;
  const draft: CompilerReportDraft | null =
    draftParsed && draftParsed.success ? draftParsed.data : null;

  if (!hardData || !draft) return null;

  let irAggregate: AggregateIrBusinessOutput | null = null;
  if (input.irAggregateRow) {
    const irRaw = safeParseJson<Record<string, unknown>>(
      input.irAggregateRow.outputJson,
    );
    const irParsed = irRaw
      ? aggregateIrBusinessOutputSchema.safeParse(irRaw)
      : null;
    if (irParsed && irParsed.success) irAggregate = irParsed.data;
  }

  let webAggregate: AggregateWebSentimentOutput | null = null;
  if (input.webAggregateRow) {
    const webRaw = safeParseJson<Record<string, unknown>>(
      input.webAggregateRow.outputJson,
    );
    const webParsed = webRaw
      ? aggregateWebSentimentOutputSchema.safeParse(webRaw)
      : null;
    if (webParsed && webParsed.success) webAggregate = webParsed.data;
  }

  let portfolioContext: PortfolioContextOutput | null = null;
  if (input.portfolioContextRow) {
    const pcRaw = safeParseJson<Record<string, unknown>>(
      input.portfolioContextRow.outputJson,
    );
    const pcParsed = pcRaw
      ? portfolioContextOutputSchema.safeParse(pcRaw)
      : null;
    if (pcParsed && pcParsed.success) portfolioContext = pcParsed.data;
  }

  let risk: RiskOutput | null = null;
  if (input.riskRow) {
    const riskRaw = safeParseJson<Record<string, unknown>>(
      input.riskRow.outputJson,
    );
    const riskParsed = riskRaw ? riskOutputSchema.safeParse(riskRaw) : null;
    if (riskParsed && riskParsed.success) risk = riskParsed.data;
  }

  const irByTicker = new Map(
    (irAggregate?.tickers ?? []).map((t) => [t.ticker.toUpperCase(), t]),
  );
  const webByTicker = new Map(
    (webAggregate?.tickers ?? []).map((t) => [t.ticker.toUpperCase(), t]),
  );
  const pcByTicker = new Map(
    (portfolioContext?.perCandidate ?? []).map((c) => [
      c.ticker.toUpperCase(),
      c,
    ]),
  );
  const riskByTicker = new Map(
    (risk?.perCandidate ?? []).map((c) => [c.ticker.toUpperCase(), c]),
  );

  const requestedCount =
    input.candidateLimit && input.candidateLimit > 0
      ? Math.min(5, input.candidateLimit)
      : Math.min(5, Math.max(0, hardData.candidates.length));

  const candidates = hardData.candidates.slice(0, requestedCount);
  const priorityOrder = candidates.map((c) => c.ticker);

  const bulletByTicker = new Map(
    draft.candidateBullets.map((b) => [b.ticker.toUpperCase(), b]),
  );

  const cards: ScreeningCandidateCard[] = candidates.map((c) => {
    const bullet = bulletByTicker.get(c.ticker.toUpperCase());
    const ir = irByTicker.get(c.ticker.toUpperCase());
    const web = webByTicker.get(c.ticker.toUpperCase());
    const pc = pcByTicker.get(c.ticker.toUpperCase());
    const riskRow = riskByTicker.get(c.ticker.toUpperCase());
    const primaryCatalyst = ir?.catalysts[0] ?? null;
    const sources = [
      ...(ir ? mapIrSources(ir) : []),
      ...(web ? mapWebSources(web) : []),
    ].slice(0, 12);

    const risks = [
      ...(ir?.gaps ?? []),
      ...(riskRow?.riskFlags ?? []),
      ...(web?.gaps ?? []),
    ].slice(0, 8);

    return {
      ticker: c.ticker,
      companyName: c.name || c.ticker,
      sector: c.sector || "—",
      country: c.country || "—",
      business: (() => {
        const summary = clip(
          ir?.businessOneLiner ?? c.analysisSummary,
          2000,
        );
        if (!summary) return null;
        return {
          summary,
          employees: null,
          listedSince: null,
          website: null,
          irUrl: null,
          filings: null,
        };
      })(),
      mktCapUsd: c.marketCapUsd ?? null,
      currency: c.currency || "USD",
      price: c.price ?? 0,
      priceAsOf: input.run.updatedAt,
      targetPrice: c.targetPrice ?? null,
      upsidePct: c.upsidePct ?? null,
      score: c.checklistScore ?? Math.min(8, Math.round((c.rankScore ?? 0) / 12.5)),
      verdict: c.reportVerdict ?? null,
      stepsPassed: c.stepsPassed ?? [],
      stepsFailed: c.stepsFailed ?? [],
      catalyst: primaryCatalyst?.label ?? null,
      catalystDate: ir?.guidance.asOf ?? null,
      businessOneLiner: clip(
        ir?.businessOneLiner ?? c.analysisSummary,
        280,
      ),
      guidance: ir
        ? {
            summary: ir.guidance.summary,
            direction: ir.guidance.direction,
            asOf: ir.guidance.asOf,
          }
        : null,
      catalystsList: ir?.catalysts.map((cat) => ({
        label: cat.label,
        evidence: cat.evidence,
      })),
      multiples: {
        fwdPe: c.fwdPe ?? null,
        ownHistPe: c.ownHistPe ?? null,
        peerPe: null,
        evEbitda: c.evEbitda ?? null,
        ndEbitda: c.ndEbitda ?? null,
        growthNote: c.growthNote ?? null,
      },
      flags: {
        netCash: c.netCash ?? null,
        buyback: null,
        dividendYield: c.dividendYield ?? null,
        moatScore: c.moatScore ?? null,
      },
      thesis: bullet?.bullet ?? c.rankReason,
      risks,
      priorityReason: bullet?.headline ?? c.rankReason.slice(0, 120),
      citedFields: [
        ...(c.fwdPe != null ? ["multiples.fwdPe"] : []),
        ...(c.evEbitda != null ? ["multiples.evEbitda"] : []),
        ...(c.moatScore != null ? ["flags.moatScore"] : []),
        ...(c.targetPrice != null ? ["targetPrice"] : []),
        ...(ir ? ["businessOneLiner", "guidance"] : []),
        ...(c.analysisSummary && !ir ? ["analysisSummary"] : []),
        ...(web ? ["sentimentSummary"] : []),
        ...(pc ? ["positionKind"] : []),
        ...(riskRow ? ["suitability"] : []),
      ],
      sources,
      positionKind: pc?.positionKind,
      topUpTicker: pc?.topUpTicker ?? null,
      illustrativeAllocationEur: pc?.illustrativeAllocationEur ?? null,
      illustrativeAllocation: pc
        ? `€${Math.round(pc.illustrativeAllocationEur.min)}–€${Math.round(pc.illustrativeAllocationEur.max)}`
        : undefined,
      sentimentSummary: clip(web?.sentimentSummary, 500),
      webSignals: web?.signals.slice(0, 3).map((s) => ({
        kind: s.kind,
        claim: s.claim.trim().slice(0, 280),
        confirmation: s.confirmation,
      })),
      insiderBias: web?.insiderSummary.netBias,
      riskFlags: riskRow?.riskFlags,
      suitability: riskRow?.suitability ?? null,
      illustrativeWeightPct: riskRow?.illustrativeWeightPct ?? null,
      concentrationImpact: riskRow?.concentrationImpact ?? null,
    };
  });

  const comparisonRows = cards.map((card, i) => {
    const hd = candidates[i];
    return {
      ticker: card.ticker,
      companyName: card.companyName,
      valuationNote:
        hd?.valuationNote ??
        (card.multiples.fwdPe != null
          ? `Fwd P/E ${card.multiples.fwdPe.toFixed(1)}x`
          : "—"),
      growthNote: hd?.growthNote ?? card.multiples.growthNote ?? "—",
      score: card.score,
      verdict: card.verdict,
    };
  });

  const locale = parsedBrief?.locale ?? draft.locale ?? "en";
  const hasIr = Boolean(irAggregate && irAggregate.tickers.length > 0);
  const hasWeb = Boolean(webAggregate && webAggregate.tickers.length > 0);
  const hasPc = Boolean(portfolioContext);
  const hasRisk = Boolean(risk);

  const methodologyNote = locale.startsWith("es")
    ? hasWeb || hasPc || hasRisk
      ? "Cribado FMP + ranking Hard Data, IR y Web/Sentimiento por ticker, contexto de cartera y riesgo, resumen del Compiler."
      : hasIr
        ? "Cribado con datos de FMP filtrados por brief, ranking Hard Data + investigación IR por ticker, resumen del Compiler."
        : "Cribado inicial con datos de FMP filtrados por brief, ranking por LLM. Los agentes de Web/Riesgo/QA llegan en próximas iteraciones."
    : hasWeb || hasPc || hasRisk
      ? "Screen from FMP data, Hard Data ranking, per-ticker IR + Web/Sentiment, portfolio fit and risk checks, Compiler summary."
      : hasIr
        ? "Screen from FMP data filtered by the brief, Hard Data ranking + per-ticker IR research, Compiler summary."
        : "Initial screen from FMP data filtered by the brief, ranked by an LLM. Web/Risk/QA agents come in later iterations.";

  const defaultPending: string[] = [];
  if (!hasIr) defaultPending.push("ir_business");
  if (!hasWeb) defaultPending.push("web_sentiment");
  if (!hasPc) defaultPending.push("portfolio_context");
  if (!hasRisk) defaultPending.push("risk");
  defaultPending.push("qa");

  const pending =
    input.pendingAgentKinds && input.pendingAgentKinds.length > 0
      ? input.pendingAgentKinds
      : defaultPending;

  const raw = {
    jobId: input.run.id,
    mode: "user_report" as const,
    locale,
    generatedAt: input.compilerRow.createdAt || input.run.updatedAt,
    methodologyNote,
    executiveSummary: draft.summary,
    priorityOrder,
    comparisonRows,
    cards,
    disclaimer: draft.disclaimer,
    partial: pending.length > 0,
    pendingAgentKinds: pending,
  };

  const validated = screeningReportSchema.safeParse(raw);
  if (!validated.success) {
    console.error(
      "[screening] composeScreeningReport schema failed",
      validated.error.issues.slice(0, 12),
    );
    return null;
  }
  return validated.data;
}
