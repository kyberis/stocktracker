import type { CompanyOverview, EarningsReport, IncomeStatementReport } from "@/lib/api-providers/types";
import type { FundamentalData } from "@/lib/types";
import { scoreCheap, type CheapLabel } from "@/lib/screening/scoring/categories";
import {
  ensureShareFundamentalsBatch,
  type ShareFundamentalsBundle,
} from "@/lib/services/share-fundamentals";

export interface ValuationMetrics {
  peRatio: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  returnOnEquity: number | null;
  profitMargin: number | null;
  revenueTTM: number | null;
  beta: number | null;
  analystTargetPrice: number | null;
  dividendYield: number | null;
  histPeAvg: number | null;
  histPeYears: number | null;
}

export interface WarrenValuationItem {
  symbol: string;
  companyName: string;
  provider: string;
  cached: boolean;
  fetchedAt: string;
  metrics: ValuationMetrics;
  valuationLabel: CheapLabel;
  valuationSummary: string;
  dataGaps: string[];
}

export type WarrenValuationErrorCode =
  | "quota_exceeded"
  | "rate_limited"
  | "invalid_input"
  | "user_not_found";

export type WarrenValuationBatchResult =
  | { ok: true; results: WarrenValuationItem[]; errors: Array<{ symbol: string; error: string }> }
  | { ok: false; error: string; code: WarrenValuationErrorCode };

export function buildValuationSnapshot(
  overview: CompanyOverview,
  income?: FundamentalData<IncomeStatementReport> | null,
  earnings?: FundamentalData<EarningsReport> | null,
): ValuationMetrics {
  const { histPeAvg, histPeYears } = deriveHistoricalPe(income, earnings, overview);

  return {
    peRatio: overview.peRatio,
    forwardPE: overview.forwardPE,
    pegRatio: overview.pegRatio,
    returnOnEquity: overview.returnOnEquity,
    profitMargin: overview.profitMargin,
    revenueTTM: overview.revenueTTM,
    beta: overview.beta,
    analystTargetPrice: overview.analystTargetPrice,
    dividendYield: overview.dividendYield,
    histPeAvg,
    histPeYears,
  };
}

function deriveHistoricalPe(
  _income: FundamentalData<IncomeStatementReport> | null | undefined,
  earnings: FundamentalData<EarningsReport> | null | undefined,
  overview: CompanyOverview,
): { histPeAvg: number | null; histPeYears: number | null } {
  const epsValues = (earnings?.annual ?? [])
    .map((row) => row.reportedEPS)
    .filter((v): v is number => v != null && v > 0);
  if (epsValues.length >= 3 && overview.peRatio != null) {
    return { histPeAvg: overview.peRatio, histPeYears: epsValues.length };
  }
  return { histPeAvg: null, histPeYears: null };
}

export function scoreValuation(
  metrics: ValuationMetrics,
): { label: CheapLabel; summary: string; dataGaps: string[] } {
  const dataGaps: string[] = [];
  if (metrics.peRatio == null && metrics.forwardPE == null) {
    dataGaps.push("no trailing or forward P/E");
  }
  if (metrics.histPeAvg == null) {
    dataGaps.push("no multi-year historical P/E average");
  }

  const cheap = scoreCheap({
    fwdPe: metrics.forwardPE,
    ownHistPe: metrics.peRatio,
    histPeAvg: metrics.histPeAvg,
    histPeYears: metrics.histPeYears,
    moatScorePct: null,
  });

  const summary = valuationSummaryForLabel(cheap.label, cheap.currentPe, cheap.histPe);
  return { label: cheap.label, summary, dataGaps };
}

function valuationSummaryForLabel(
  label: CheapLabel,
  currentPe: number | null,
  histPe: number | null,
): string {
  const peText =
    currentPe != null
      ? `Current P/E ${currentPe.toFixed(1)}x${histPe != null ? ` vs historical ~${histPe.toFixed(1)}x` : ""}.`
      : "";

  switch (label) {
    case "cheap":
      return `Appears undervalued on available multiples. ${peText}`.trim();
    case "fair":
      return `Trading near fair value on available multiples. ${peText}`.trim();
    case "expensive":
      return `Appears expensive on available multiples. ${peText}`.trim();
    default:
      return "Insufficient valuation data to label cheap or expensive.";
  }
}

export function mapShareFundamentalsToValuation(bundle: ShareFundamentalsBundle): WarrenValuationItem {
  const metrics = buildValuationSnapshot(bundle.overview!, bundle.income, bundle.earnings);
  const scored = scoreValuation(metrics);

  return {
    symbol: bundle.symbol,
    companyName: bundle.overview?.name || bundle.symbol,
    provider: bundle.provider,
    cached: bundle.cached,
    fetchedAt: bundle.fetchedAt,
    metrics,
    valuationLabel: scored.label,
    valuationSummary: scored.summary,
    dataGaps: scored.dataGaps,
  };
}

export async function analyzeValuationForWarren(
  userId: string,
  symbols: string[],
  opts?: { fresh?: boolean },
): Promise<WarrenValuationBatchResult> {
  const normalized = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (normalized.length === 0) {
    return { ok: false, error: "At least one ticker is required", code: "invalid_input" };
  }
  if (normalized.length > 10) {
    return { ok: false, error: "Maximum 10 tickers per valuation request", code: "invalid_input" };
  }

  const batch = await ensureShareFundamentalsBatch(userId, normalized, {
    fresh: opts?.fresh,
    scope: "valuation",
  });

  const results: WarrenValuationItem[] = [];
  const errors: Array<{ symbol: string; error: string }> = [];

  batch.forEach((entry, index) => {
    const symbol = normalized[index]!;
    if (entry.ok) {
      results.push(mapShareFundamentalsToValuation(entry.data));
      return;
    }
    if (entry.code === "quota_exceeded" || entry.code === "rate_limited") {
      return;
    }
    errors.push({ symbol, error: entry.error });
  });

  const quotaHit = batch.find((entry) => !entry.ok && entry.code === "quota_exceeded");
  if (quotaHit && !quotaHit.ok) {
    return { ok: false, error: quotaHit.error, code: "quota_exceeded" };
  }

  const rateHit = batch.find((entry) => !entry.ok && entry.code === "rate_limited");
  if (rateHit && !rateHit.ok) {
    return { ok: false, error: rateHit.error, code: "rate_limited" };
  }

  if (results.length === 0) {
    return {
      ok: false,
      error: errors[0]?.error ?? "No valuation data available",
      code: "invalid_input",
    };
  }

  return { ok: true, results, errors };
}

export function demoValuationItems(tickers: string[]): WarrenValuationItem[] {
  return tickers.map((ticker) => {
    const symbol = ticker.toUpperCase();
    const metrics: ValuationMetrics = {
      peRatio: 22.4,
      forwardPE: 20.1,
      pegRatio: 1.8,
      returnOnEquity: 0.28,
      profitMargin: 0.18,
      revenueTTM: 95000000000,
      beta: 0.95,
      analystTargetPrice: null,
      dividendYield: 0.012,
      histPeAvg: 21.5,
      histPeYears: 5,
    };
    const scored = scoreValuation(metrics);
    return {
      symbol,
      companyName: symbol,
      provider: "demo",
      cached: true,
      fetchedAt: "demo",
      metrics,
      valuationLabel: scored.label,
      valuationSummary: scored.summary,
      dataGaps: ["demo mode — not live market data"],
    };
  });
}