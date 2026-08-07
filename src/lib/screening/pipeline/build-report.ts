import type { ScreeningAgentOutputRow } from "@/lib/db/screening";
import type { ScreeningRunRow } from "@/lib/db/screening";
import {
  hardDataOutputSchema,
  compilerReportDraftSchema,
  aggregateIrBusinessOutputSchema,
  screeningBriefSchema,
  screeningReportSchema,
  type ScreeningReport,
  type HardDataOutput,
  type CompilerReportDraft,
  type AggregateIrBusinessOutput,
  type ScreeningBrief,
  type ScreeningCandidateCard,
  type IrBusinessOutput,
} from "@/lib/screening/schemas";

/**
 * Compose the ScreeningReport from Hard Data + Compiler (+ optional IR
 * aggregate) outputs the orchestrator persisted (HLD §5.3).
 */
export interface ComposeReportInput {
  run: ScreeningRunRow;
  hardDataRow: ScreeningAgentOutputRow;
  compilerRow: ScreeningAgentOutputRow;
  /** Optional IR aggregate from Agent 2 (E4). */
  irAggregateRow?: ScreeningAgentOutputRow | null;
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
  // Empty Hard Data is a valid terminal outcome (brief too tight). Still compose
  // a report so the UI can show the Compiler's empty message instead of a 500.

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

  const irByTicker = new Map(
    (irAggregate?.tickers ?? []).map((t) => [t.ticker.toUpperCase(), t]),
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
    const primaryCatalyst = ir?.catalysts[0] ?? null;
    return {
      ticker: c.ticker,
      companyName: c.name || c.ticker,
      sector: c.sector || "—",
      country: c.country || "—",
      business: ir
        ? {
            summary: ir.businessOneLiner,
            employees: null,
            listedSince: null,
            website: null,
            irUrl: null,
            filings: null,
          }
        : null,
      mktCapUsd: c.marketCapUsd ?? null,
      currency: "USD",
      price: c.price ?? 0,
      priceAsOf: input.run.updatedAt,
      targetPrice: null,
      upsidePct: null,
      score: c.rankScore ?? null,
      verdict: null,
      stepsPassed: [],
      stepsFailed: [],
      catalyst: primaryCatalyst?.label ?? null,
      catalystDate: ir?.guidance.asOf ?? null,
      businessOneLiner: ir?.businessOneLiner,
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
        fwdPe: null,
        ownHistPe: null,
        peerPe: null,
        evEbitda: null,
        ndEbitda: null,
        growthNote: null,
      },
      flags: {
        netCash: null,
        buyback: null,
        dividendYield: null,
        moatScore: null,
      },
      thesis: bullet?.bullet ?? c.rankReason,
      risks: ir?.gaps ?? [],
      priorityReason: bullet?.headline ?? c.rankReason.slice(0, 120),
      citedFields: ir ? ["businessOneLiner", "guidance"] : [],
      sources: ir ? mapIrSources(ir) : [],
    };
  });

  const comparisonRows = cards.map((card) => ({
    ticker: card.ticker,
    companyName: card.companyName,
    valuationNote: "—",
    growthNote: "—",
    score: card.score,
    verdict: card.verdict,
  }));

  const locale = parsedBrief?.locale ?? draft.locale ?? "en";
  const hasIr = Boolean(irAggregate && irAggregate.tickers.length > 0);
  const methodologyNote = locale.startsWith("es")
    ? hasIr
      ? "Cribado con datos de FMP filtrados por brief, ranking Hard Data + investigación IR por ticker, resumen del Compiler."
      : "Cribado inicial con datos de FMP filtrados por brief, ranking por LLM. Los agentes de Web/Riesgo/QA llegan en próximas iteraciones."
    : hasIr
      ? "Screen from FMP data filtered by the brief, Hard Data ranking + per-ticker IR research, Compiler summary."
      : "Initial screen from FMP data filtered by the brief, ranked by an LLM. Web/Risk/QA agents come in later iterations.";

  const defaultPending = hasIr
    ? ["web_sentiment", "portfolio_context", "risk", "qa"]
    : ["ir_business", "web_sentiment", "portfolio_context", "risk", "qa"];

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
  if (!validated.success) return null;
  return validated.data;
}
