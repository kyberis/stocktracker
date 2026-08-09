import {
  companyAnalysisReportCacheKey,
  getCompanyAnalysisDbCache,
  getMoatCacheForSymbols,
  type MoatCacheEntry,
} from "@/lib/db";
import type { CompanyAnalysisReport } from "@/lib/company-analysis/types";

/**
 * trefolio signals (MOAT + /analisis) for screening Hard Data.
 * Reads moat_cache only — callers that need a fill on miss should run
 * `ensureMoatForTickers` first (ops generation, no user quota).
 * Analysis remains cache-only (no fresh /analisis rebuild).
 */

export interface TrefolioTickerSignals {
  ticker: string;
  moatScorePct: number | null;
  moatVerdict: string | null;
  moatPassedCount: number | null;
  moatCriteriaCount: number | null;
  /** Short business description from cached /analisis or null. */
  analysisSummary: string | null;
  /** Revenue YoY % from cached analysis fundamentals, if present. */
  revenueYoyPct: number | null;
  hasAnalysisCache: boolean;
}

function summariseAnalysis(report: CompanyAnalysisReport): {
  summary: string | null;
  revenueYoyPct: number | null;
} {
  const desc = report.profile?.description?.trim() ?? "";
  const summary = desc
    ? desc.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 280)
    : null;
  const revenueYoyPct =
    report.fundamentals?.lastRevenueYoyPct != null &&
    Number.isFinite(report.fundamentals.lastRevenueYoyPct)
      ? report.fundamentals.lastRevenueYoyPct
      : null;
  return { summary, revenueYoyPct };
}

async function loadAnalysisSignals(
  ticker: string,
): Promise<Pick<TrefolioTickerSignals, "analysisSummary" | "revenueYoyPct" | "hasAnalysisCache">> {
  try {
    const row = await getCompanyAnalysisDbCache(
      companyAnalysisReportCacheKey(ticker),
    );
    if (!row?.payloadJson) {
      return {
        analysisSummary: null,
        revenueYoyPct: null,
        hasAnalysisCache: false,
      };
    }
    const parsed = JSON.parse(row.payloadJson) as CompanyAnalysisReport;
    const { summary, revenueYoyPct } = summariseAnalysis(parsed);
    return {
      analysisSummary: summary,
      revenueYoyPct,
      hasAnalysisCache: true,
    };
  } catch {
    return {
      analysisSummary: null,
      revenueYoyPct: null,
      hasAnalysisCache: false,
    };
  }
}

export async function loadTrefolioSignalsForTickers(
  tickers: readonly string[],
): Promise<Map<string, TrefolioTickerSignals>> {
  const unique = [...new Set(tickers.map((t) => t.toUpperCase().trim()).filter(Boolean))];
  const out = new Map<string, TrefolioTickerSignals>();
  if (unique.length === 0) return out;

  const moatMap = await getMoatCacheForSymbols(unique, 30);

  // Cap concurrent analysis cache reads.
  const CONCURRENCY = 8;
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const chunk = unique.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (ticker) => {
        const moat: MoatCacheEntry | undefined = moatMap.get(ticker);
        const analysis = await loadAnalysisSignals(ticker);
        return {
          ticker,
          moatScorePct: moat?.scorePct ?? null,
          moatVerdict: moat?.verdict ?? null,
          moatPassedCount: moat?.passedCount ?? null,
          moatCriteriaCount: moat?.criteriaCount ?? null,
          ...analysis,
        } satisfies TrefolioTickerSignals;
      }),
    );
    for (const row of results) out.set(row.ticker, row);
  }
  return out;
}
