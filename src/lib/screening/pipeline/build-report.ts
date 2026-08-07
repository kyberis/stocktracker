import type { ScreeningAgentOutputRow } from "@/lib/db/screening";
import type { ScreeningRunRow } from "@/lib/db/screening";
import {
  hardDataOutputSchema,
  compilerReportDraftSchema,
  screeningBriefSchema,
  screeningReportSchema,
  type ScreeningReport,
  type HardDataOutput,
  type CompilerReportDraft,
  type ScreeningBrief,
  type ScreeningCandidateCard,
} from "@/lib/screening/schemas";

/**
 * Compose the ScreeningReport from the Hard Data + Compiler outputs the
 * orchestrator persisted (HLD §5.3). We fill only the fields the UI actually
 * renders in this slice; the rest of the report contract is null / empty so
 * the shape stays parseable by `screeningReportSchema`.
 */
export interface ComposeReportInput {
  run: ScreeningRunRow;
  hardDataRow: ScreeningAgentOutputRow;
  compilerRow: ScreeningAgentOutputRow;
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
  if (hardData.candidates.length === 0) return null;

  const requestedCount =
    input.candidateLimit && input.candidateLimit > 0
      ? Math.min(5, input.candidateLimit)
      : Math.min(5, hardData.candidates.length);

  const candidates = hardData.candidates.slice(0, requestedCount);
  const priorityOrder = candidates.map((c) => c.ticker);

  const bulletByTicker = new Map(
    draft.candidateBullets.map((b) => [b.ticker.toUpperCase(), b]),
  );

  const cards: ScreeningCandidateCard[] = candidates.map((c) => {
    const bullet = bulletByTicker.get(c.ticker.toUpperCase());
    return {
      ticker: c.ticker,
      companyName: c.name || c.ticker,
      sector: c.sector || "—",
      country: c.country || "—",
      business: null,
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
      catalyst: null,
      catalystDate: null,
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
      risks: [],
      priorityReason: bullet?.headline ?? c.rankReason.slice(0, 120),
      citedFields: [],
      sources: [],
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
  const methodologyNote =
    locale.startsWith("es")
      ? "Cribado inicial con datos de FMP filtrados por brief, ranking por LLM. Los agentes de IR/Web/Riesgo/QA llegan en próximas iteraciones."
      : "Initial screen from FMP data filtered by the brief, ranked by an LLM. IR/Web/Risk/QA agents come in later iterations.";

  const pending = input.pendingAgentKinds && input.pendingAgentKinds.length > 0
    ? input.pendingAgentKinds
    : ["ir_business", "web_sentiment", "portfolio_context", "risk", "qa"];

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
