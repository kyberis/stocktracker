import type { ScreeningAgentOutputRow } from "@/lib/db/screening";
import type { ScreeningRunRow } from "@/lib/db/screening";
import {
  hardDataOutputSchema,
  compilerReportDraftSchema,
  aggregateIrBusinessOutputSchema,
  aggregateWebSentimentOutputSchema,
  aggregateTechnicalsOutputSchema,
  portfolioContextOutputSchema,
  qaOutputSchema,
  riskOutputSchema,
  screeningBriefSchema,
  screeningReportSchema,
  shortlistResearchOutputSchema,
  type ScreeningReport,
  type HardDataOutput,
  type CompilerReportDraft,
  type AggregateIrBusinessOutput,
  type AggregateWebSentimentOutput,
  type AggregateTechnicalsOutput,
  type PortfolioContextOutput,
  type QaOutput,
  type RiskOutput,
  type ScreeningBrief,
  type ScreeningCandidateCard,
  type IrBusinessOutput,
  type WebSentimentOutput,
  type ShortlistResearchOutput,
  type ShortlistResearchTicker,
} from "@/lib/screening/schemas";
import { scoreChecklist } from "@/lib/screening/scoring/checklist";
import { buildEducationalThesis } from "@/lib/screening/thesis";

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
  technicalsAggregateRow?: ScreeningAgentOutputRow | null;
  portfolioContextRow?: ScreeningAgentOutputRow | null;
  riskRow?: ScreeningAgentOutputRow | null;
  /** Latest QA output row (agent_kind='qa'). Populates report.verification. */
  qaRow?: ScreeningAgentOutputRow | null;
  /** Post-Compiler Tavily Research deep-dive (≤5 shortlist). */
  shortlistResearchRow?: ScreeningAgentOutputRow | null;
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

  let technicalsAggregate: AggregateTechnicalsOutput | null = null;
  if (input.technicalsAggregateRow) {
    const techRaw = safeParseJson<Record<string, unknown>>(
      input.technicalsAggregateRow.outputJson,
    );
    const techParsed = techRaw
      ? aggregateTechnicalsOutputSchema.safeParse(techRaw)
      : null;
    if (techParsed && techParsed.success) technicalsAggregate = techParsed.data;
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

  let qa: QaOutput | null = null;
  if (input.qaRow) {
    const qaRaw = safeParseJson<Record<string, unknown>>(input.qaRow.outputJson);
    const qaParsed = qaRaw ? qaOutputSchema.safeParse(qaRaw) : null;
    if (qaParsed && qaParsed.success) qa = qaParsed.data;
  }

  let shortlistResearch: ShortlistResearchOutput | null = null;
  if (input.shortlistResearchRow) {
    const srRaw = safeParseJson<Record<string, unknown>>(
      input.shortlistResearchRow.outputJson,
    );
    const srParsed = srRaw
      ? shortlistResearchOutputSchema.safeParse(srRaw)
      : null;
    if (srParsed && srParsed.success) shortlistResearch = srParsed.data;
  }

  const qaIssuesByTicker = new Map<string, string[]>();
  if (qa) {
    for (const issue of qa.issues) {
      if (!issue.ticker) continue;
      const key = issue.ticker.toUpperCase();
      const list = qaIssuesByTicker.get(key) ?? [];
      if (list.length < 8) list.push(issue.summary.slice(0, 400));
      qaIssuesByTicker.set(key, list);
    }
  }

  const irByTicker = new Map(
    (irAggregate?.tickers ?? []).map((t) => [t.ticker.toUpperCase(), t]),
  );
  const webByTicker = new Map(
    (webAggregate?.tickers ?? []).map((t) => [t.ticker.toUpperCase(), t]),
  );
  const techByTicker = new Map(
    (technicalsAggregate?.tickers ?? []).map((t) => [t.ticker.toUpperCase(), t]),
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
  const researchByTicker = new Map<string, ShortlistResearchTicker>(
    (shortlistResearch?.tickers ?? []).map((t) => [t.ticker.toUpperCase(), t]),
  );

  const requestedCount =
    input.candidateLimit && input.candidateLimit > 0
      ? Math.min(5, input.candidateLimit)
      : Math.min(5, Math.max(0, hardData.candidates.length));

  // When QA finishes with degraded tickers (round cap hit and some tickers
  // still had blocking issues), prefer dropping them so users don't see
  // unverified prose. If that would empty the report (e.g. analyze intent
  // with one name, or every shortlist name degraded), keep the degraded
  // cards and rely on `verification` + per-card QA notes instead of a 422.
  const degradedSet = new Set<string>(
    (qa?.degradedTickers ?? []).map((t) => t.toUpperCase()),
  );
  const hardByTicker = new Map(
    hardData.candidates.map((c) => [c.ticker.toUpperCase(), c]),
  );
  // Prefer Compiler shortlist order (late selection). Fall back to Hard Data
  // rank when the draft has no usable bullets.
  const bulletOrderClean = draft.candidateBullets
    .map((b) => b.ticker.toUpperCase())
    .filter((t) => hardByTicker.has(t) && !degradedSet.has(t));
  let survivors =
    bulletOrderClean.length > 0
      ? bulletOrderClean
          .map((t) => hardByTicker.get(t)!)
          .concat(
            hardData.candidates.filter(
              (c) =>
                !degradedSet.has(c.ticker.toUpperCase()) &&
                !bulletOrderClean.includes(c.ticker.toUpperCase()),
            ),
          )
      : hardData.candidates.filter(
          (c) => !degradedSet.has(c.ticker.toUpperCase()),
        );
  if (survivors.length === 0 && hardData.candidates.length > 0) {
    const bulletOrderAll = draft.candidateBullets
      .map((b) => b.ticker.toUpperCase())
      .filter((t) => hardByTicker.has(t));
    survivors =
      bulletOrderAll.length > 0
        ? bulletOrderAll.map((t) => hardByTicker.get(t)!)
        : [...hardData.candidates];
  }
  const candidates = survivors.slice(0, requestedCount);
  const priorityOrder = candidates.map((c) => c.ticker);

  const bulletByTicker = new Map(
    draft.candidateBullets.map((b) => [b.ticker.toUpperCase(), b]),
  );

  const cards: ScreeningCandidateCard[] = candidates.map((c) => {
    const bullet = bulletByTicker.get(c.ticker.toUpperCase());
    const ir = irByTicker.get(c.ticker.toUpperCase());
    const web = webByTicker.get(c.ticker.toUpperCase());
    const tech = techByTicker.get(c.ticker.toUpperCase()) ?? null;
    const pc = pcByTicker.get(c.ticker.toUpperCase());
    const riskRow = riskByTicker.get(c.ticker.toUpperCase());
    const research = researchByTicker.get(c.ticker.toUpperCase());
    const primaryCatalyst =
      ir?.catalysts[0] ??
      (research?.catalysts[0]
        ? { label: research.catalysts[0].slice(0, 120), evidence: research.catalysts[0] }
        : null);
    const researchSources: ScreeningCandidateCard["sources"] = (
      research?.sources ?? []
    )
      .filter((s) => s.url.startsWith("http"))
      .slice(0, 6)
      .map((s) => ({
        url: s.url,
        asOf: research ? new Date().toISOString().slice(0, 10) : "",
        field: "company_research",
        label: s.title,
      }));
    const sources = [
      ...(ir ? mapIrSources(ir) : []),
      ...(web ? mapWebSources(web) : []),
      ...researchSources,
    ].slice(0, 12);

    const risks = [
      ...(ir?.gaps ?? []),
      ...(riskRow?.riskFlags ?? []),
      ...(web?.gaps ?? []),
    ].slice(0, 8);

    // Re-score at compose time so criteria 3 / 4 / 6 (and 9 in Phase 2) leave
    // "Not enough data" when the IR / Web / Technicals agents produced signal.
    const datedCatalystCount =
      ir?.catalysts.filter((cat) => cat.evidence.trim().length > 0).length ??
      (research && research.catalysts.length > 0 ? research.catalysts.length : null);
    const oneLiner =
      ir?.businessOneLiner ||
      research?.businessOneLiner ||
      c.analysisSummary ||
      null;
    const rescored = scoreChecklist({
      rankScore: c.rankScore,
      fwdPe: c.fwdPe ?? null,
      ownHistPe: c.ownHistPe ?? null,
      ndEbitda: c.ndEbitda ?? null,
      netCash: c.netCash ?? null,
      moatScorePct: c.moatScore ?? null,
      upsidePct: c.upsidePct ?? null,
      datedCatalystCount,
      insiderBias: web?.insiderSummary.netBias ?? null,
      revenueGrowthHistoryPct: c.revenueGrowthHistoryPct ?? null,
      aboveMa200: tech?.aboveMa200 ?? null,
      return1yPct: tech?.return1yPct ?? null,
    });

    return {
      ticker: c.ticker,
      companyName: c.name || c.ticker,
      sector: c.sector || "—",
      country: c.country || "—",
      business: (() => {
        const summary = clip(oneLiner, 2000);
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
      score: rescored.score,
      verdict: rescored.verdict,
      stepsPassed: rescored.stepsPassed,
      stepsFailed: rescored.stepsFailed,
      catalyst: primaryCatalyst?.label ?? null,
      catalystDate: ir?.guidance.asOf ?? null,
      businessOneLiner: clip(oneLiner, 280),
      guidance: ir
        ? {
            summary: ir.guidance.summary,
            direction: ir.guidance.direction,
            asOf: ir.guidance.asOf,
          }
        : research?.guidanceSummary
          ? {
              summary: research.guidanceSummary.slice(0, 500),
              direction: "unclear" as const,
              asOf: new Date().toISOString().slice(0, 10),
            }
          : null,
      catalystsList:
        ir?.catalysts.map((cat) => ({
          label: cat.label,
          evidence: cat.evidence,
        })) ??
        research?.catalysts.slice(0, 8).map((cat) => ({
          label: cat.slice(0, 120),
          evidence: cat.slice(0, 400),
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
      thesis: buildEducationalThesis({
        locale: draft.locale || hardData.locale || "en",
        companyName: c.name || c.ticker,
        ticker: c.ticker,
        lead: bullet?.bullet ?? c.rankReason,
        businessOneLiner: ir?.businessOneLiner ?? c.analysisSummary,
        catalyst: primaryCatalyst?.label ?? null,
        catalystDate: ir?.guidance.asOf ?? null,
        fwdPe: c.fwdPe ?? null,
        ownHistPe: c.ownHistPe ?? null,
        evEbitda: c.evEbitda ?? null,
        ndEbitda: c.ndEbitda ?? null,
        dividendYield: c.dividendYield ?? null,
        netCash: c.netCash ?? null,
        upsidePct: c.upsidePct ?? null,
        moatScore: c.moatScore ?? null,
        growthNote: c.growthNote ?? null,
        sentimentSummary: web?.sentimentSummary ?? null,
        insiderBias: web?.insiderSummary.netBias ?? null,
        positionKind: pc?.positionKind ?? null,
        suitability: riskRow?.suitability ?? null,
        concentrationImpact: riskRow?.concentrationImpact ?? null,
        score: rescored.score,
        stepsPassed: rescored.stepsPassed,
        stepsFailed: rescored.stepsFailed,
        technicals: tech
          ? {
              distanceTo52wHighPct: tech.distanceTo52wHighPct,
              distanceTo52wLowPct: tech.distanceTo52wLowPct,
              aboveMa200: tech.aboveMa200,
              return1yPct: tech.return1yPct,
              return3mPct: tech.return3mPct,
              volatilityAnnPct: tech.volatilityAnnPct,
            }
          : null,
      }),
      risks,
      priorityReason: bullet?.headline ?? c.rankReason.slice(0, 120),
      unmetBriefCriteria: c.unmetBriefCriteria,
      meetsMajorityBrief: c.meetsMajorityBrief,
      briefCriteriaMet: c.briefCriteriaMet,
      briefCriteriaTotal: c.briefCriteriaTotal,
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
      technicals: tech
        ? {
            distanceTo52wHighPct: tech.distanceTo52wHighPct,
            distanceTo52wLowPct: tech.distanceTo52wLowPct,
            ma50: tech.ma50,
            ma200: tech.ma200,
            aboveMa200: tech.aboveMa200,
            support: tech.support,
            resistance: tech.resistance,
            return3mPct: tech.return3mPct,
            return1yPct: tech.return1yPct,
            volatilityAnnPct: tech.volatilityAnnPct,
            nearHigh: tech.nearHigh,
          }
        : null,
      qa: qa
        ? {
            verified: !qaIssuesByTicker.has(c.ticker.toUpperCase()),
            unsupportedClaims: qaIssuesByTicker.get(c.ticker.toUpperCase()) ?? [],
          }
        : null,
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
  if (!qa) defaultPending.push("qa");

  const pending =
    input.pendingAgentKinds && input.pendingAgentKinds.length > 0
      ? input.pendingAgentKinds
      : defaultPending;

  const verification = qa
    ? {
        verdict: qa.verdict,
        roundNumber: qa.roundNumber,
        issueCount: qa.issues.length,
        blockingIssueCount: qa.issues.filter((i) => i.blocking).length,
        degradedTickers: qa.degradedTickers,
      }
    : null;

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
    verification,
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
