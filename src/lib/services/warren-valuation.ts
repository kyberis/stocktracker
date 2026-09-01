import type { CompanyOverview } from "@/lib/api-providers/types";
import type { HoldingAssetType } from "@/lib/types";
import { isCryptoAssetRoute } from "@/lib/asset-detail-href";
import { deriveEarningsQualityFromIncome } from "@/lib/fundamentals/earnings-quality-from-income";
import { fetchFmpHistoricalPeAverage } from "@/lib/fundamentals/hist-pe-from-fmp";
import {
  forwardPeWasRejected,
  sanitizePeMultiples,
} from "@/lib/fundamentals/normalize-overview-pe";
import { holdingNeedsFundamentals } from "@/lib/holdings-research";
import { computeNormalizedPe } from "@/lib/screening/scoring/earnings-quality";
import { scoreCheap, type CheapLabel } from "@/lib/screening/scoring/categories";
import {
  ensureShareFundamentalsBatch,
  type ShareFundamentalsBundle,
} from "@/lib/services/share-fundamentals";
import { normalizeCurrency } from "@/lib/utils";

/** Cap portfolio valuation batch size so Warren tool steps finish before the chat stream idles out. */
export const WARREN_VALUATION_MAX_SYMBOLS = 6;

export function isEligibleForWarrenValuation(
  ticker: string,
  assetType?: string | null,
): boolean {
  const type = (assetType ?? "stock") as HoldingAssetType;
  if (!holdingNeedsFundamentals({ assetType: type })) return false;
  if (isCryptoAssetRoute(ticker)) return false;
  return true;
}

export function filterWarrenValuationSymbols(
  symbols: string[],
  assetTypes?: Map<string, string | undefined>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of symbols) {
    const symbol = raw.trim().toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    if (!isEligibleForWarrenValuation(symbol, assetTypes?.get(symbol))) continue;
    seen.add(symbol);
    out.push(symbol);
    if (out.length >= WARREN_VALUATION_MAX_SYMBOLS) break;
  }
  return out;
}

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
  earningsQualitySuspect: boolean;
  normalizedPe: number | null;
  /** Latest FY diluted EPS — used to refresh normalized P/E when a live quote arrives. */
  epsFy: number | null;
}

/** Analyst-target upside below this percent is treated as limited. */
export const LIMITED_UPSIDE_THRESHOLD_PCT = 5;

export interface QuoteUpsideFields {
  currentPrice: number | null;
  upsideToTargetPct: number | null;
  hasLimitedUpside: boolean;
}

export interface WarrenValuationItem extends QuoteUpsideFields {
  symbol: string;
  companyName: string;
  /** Quote/trading currency for currentPrice and analystTargetPrice (e.g. GBX, DKK, USD). */
  currency: string | null;
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
  earningsQuality?: Pick<
    ReturnType<typeof deriveEarningsQualityFromIncome>,
    "earningsQualitySuspect" | "normalizedPe" | "epsFy" | "reasons"
  >,
): ValuationMetrics {
  const { peRatio, forwardPE } = sanitizePeMultiples(overview.peRatio, overview.forwardPE);

  return {
    peRatio,
    forwardPE,
    pegRatio: overview.pegRatio,
    returnOnEquity: overview.returnOnEquity,
    profitMargin: overview.profitMargin,
    revenueTTM: overview.revenueTTM,
    beta: overview.beta,
    analystTargetPrice: overview.analystTargetPrice,
    dividendYield: overview.dividendYield,
    histPeAvg: null,
    histPeYears: null,
    earningsQualitySuspect: earningsQuality?.earningsQualitySuspect ?? false,
    normalizedPe: earningsQuality?.normalizedPe ?? null,
    epsFy: earningsQuality?.epsFy ?? null,
  };
}

function hasMultiYearHistPe(metrics: ValuationMetrics): boolean {
  return metrics.histPeAvg != null && (metrics.histPeYears ?? 0) >= 3;
}

export function applyHistoricalPeMetrics(
  metrics: ValuationMetrics,
  hist: { histPeAvg: number | null; histPeYears: number },
): ValuationMetrics {
  if (hist.histPeAvg == null || hist.histPeYears < 3) return metrics;
  return {
    ...metrics,
    histPeAvg: hist.histPeAvg,
    histPeYears: hist.histPeYears,
  };
}

export async function enrichValuationWithHistoricalPe(
  item: WarrenValuationItem,
): Promise<WarrenValuationItem> {
  if (hasMultiYearHistPe(item.metrics)) return item;

  const hist = await fetchFmpHistoricalPeAverage(item.symbol);
  if (hist.histPeAvg == null || hist.histPeYears < 3) return item;

  const metrics = applyHistoricalPeMetrics(item.metrics, hist);
  const scored = scoreValuation(metrics, {
    earningsQualityReasons: metrics.earningsQualitySuspect
      ? item.dataGaps
          .filter((g) => g.includes("trailing earnings quality suspect"))
          .map((g) =>
            g
              .replace(/^trailing earnings quality suspect \(/, "")
              .replace(/ — label uses forward.*$/, "")
              .replace(/\)$/, ""),
          )
      : undefined,
  });
  return {
    ...item,
    metrics,
    valuationLabel: scored.label,
    valuationSummary: scored.summary,
    dataGaps: scored.dataGaps,
  };
}

function applyLimitedUpsideToLabel(
  label: CheapLabel,
  upside: QuoteUpsideFields,
  dataGaps: string[],
): { label: CheapLabel; dataGaps: string[] } {
  if (
    label === "cheap" &&
    upside.hasLimitedUpside &&
    upside.upsideToTargetPct != null
  ) {
    return {
      label: "fair",
      dataGaps: [
        ...dataGaps,
        `analyst upside only ${upside.upsideToTargetPct}% — limited room vs consensus target`,
      ],
    };
  }
  return { label, dataGaps };
}

export function scoreValuation(
  metrics: ValuationMetrics,
  opts?: {
    rawForwardPE?: number | null;
    earningsQualityReasons?: string[];
  },
): { label: CheapLabel; summary: string; dataGaps: string[] } {
  const dataGaps: string[] = [];
  if (metrics.peRatio == null && metrics.forwardPE == null) {
    dataGaps.push("no trailing or forward P/E");
  }
  if (forwardPeWasRejected(metrics.peRatio, opts?.rawForwardPE ?? metrics.forwardPE)) {
    dataGaps.push(
      "forward P/E omitted (provider value inconsistent with trailing — common on LSE GBp tickers)",
    );
  }
  if (!hasMultiYearHistPe(metrics)) {
    dataGaps.push("no multi-year historical P/E average");
  }
  if (metrics.earningsQualitySuspect) {
    const reasons = opts?.earningsQualityReasons?.length
      ? opts.earningsQualityReasons.join("; ")
      : "one-off gains or non-operating items";
    dataGaps.push(
      `trailing earnings quality suspect (${reasons}) — label uses forward or FY-normalized P/E when available`,
    );
  }

  const multiYearHist = hasMultiYearHistPe(metrics);
  const suspect = metrics.earningsQualitySuspect;

  const cheap = scoreCheap({
    // Forward vs multi-year history when available; when earnings are suspect,
    // always prefer forward / normalized over depressed trailing TTM.
    fwdPe: suspect || multiYearHist ? metrics.forwardPE : null,
    ownHistPe: suspect ? null : metrics.peRatio,
    normalizedPe: metrics.normalizedPe,
    histPeAvg: metrics.histPeAvg,
    histPeYears: metrics.histPeYears,
    earningsQualitySuspect: suspect,
    moatScorePct: null,
  });

  const summary = valuationSummaryForLabel(
    cheap.label,
    cheap.currentPe,
    cheap.histPe,
    metrics,
    multiYearHist,
    suspect,
  );
  return { label: cheap.label, summary, dataGaps };
}

function valuationSummaryForLabel(
  label: CheapLabel,
  currentPe: number | null,
  histPe: number | null,
  metrics: ValuationMetrics,
  comparedForwardToHist: boolean,
  earningsQualitySuspect: boolean,
): string {
  const parts: string[] = [];
  if (comparedForwardToHist && currentPe != null && histPe != null) {
    parts.push(
      `Forward P/E ${currentPe.toFixed(1)}x vs ${metrics.histPeYears}y avg ~${histPe.toFixed(1)}x`,
    );
    if (metrics.peRatio != null) {
      parts.push(`trailing ${metrics.peRatio.toFixed(1)}x`);
    }
  } else if (currentPe != null) {
    const peKind =
      earningsQualitySuspect && metrics.forwardPE != null && currentPe === metrics.forwardPE
        ? "Forward P/E"
        : earningsQualitySuspect && metrics.normalizedPe != null && currentPe === metrics.normalizedPe
          ? "FY-normalized P/E"
          : "Trailing P/E";
    parts.push(`${peKind} ${currentPe.toFixed(1)}x`);
    if (histPe != null && Math.abs(histPe - currentPe) > 0.05) {
      parts.push(`vs ~${histPe.toFixed(1)}x`);
    }
    if (metrics.forwardPE != null && currentPe !== metrics.forwardPE) {
      parts.push(`forward ${metrics.forwardPE.toFixed(1)}x (separate from label)`);
    }
    if (earningsQualitySuspect && metrics.peRatio != null && currentPe !== metrics.peRatio) {
      parts.push(`trailing ${metrics.peRatio.toFixed(1)}x (distorted by one-offs)`);
    }
  }
  const peText = parts.length > 0 ? `${parts.join("; ")}.` : "";

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

export function computeUpsideToTarget(
  currentPrice: number | null | undefined,
  targetPrice: number | null | undefined,
): QuoteUpsideFields {
  const price =
    typeof currentPrice === "number" && Number.isFinite(currentPrice) && currentPrice > 0
      ? currentPrice
      : null;
  const target =
    typeof targetPrice === "number" && Number.isFinite(targetPrice) && targetPrice > 0
      ? targetPrice
      : null;
  if (price == null || target == null) {
    return { currentPrice: price, upsideToTargetPct: null, hasLimitedUpside: false };
  }
  const pct = Math.round(((target - price) / price) * 1000) / 10;
  return {
    currentPrice: price,
    upsideToTargetPct: pct,
    hasLimitedUpside: pct < LIMITED_UPSIDE_THRESHOLD_PCT,
  };
}

export function attachValuationQuoteUpside(
  item: WarrenValuationItem,
  currentPrice: number | null | undefined,
  currency?: string | null,
  opts?: { rawForwardPE?: number | null },
): WarrenValuationItem {
  const metrics = { ...item.metrics };
  if (metrics.earningsQualitySuspect && metrics.epsFy != null && currentPrice != null) {
    metrics.normalizedPe = computeNormalizedPe(currentPrice, metrics.epsFy);
  }

  const upside = computeUpsideToTarget(currentPrice, metrics.analystTargetPrice);
  const scored = scoreValuation(metrics, {
    rawForwardPE: opts?.rawForwardPE,
    earningsQualityReasons: item.dataGaps
      .filter((g) => g.startsWith("trailing earnings quality suspect"))
      .map((g) => g.replace(/^trailing earnings quality suspect \(/, "").replace(/\)$/, "")),
  });
  const adjusted = applyLimitedUpsideToLabel(scored.label, upside, scored.dataGaps);

  return {
    ...item,
    currency: currency != null ? normalizeCurrency(currency) : item.currency,
    metrics,
    ...upside,
    valuationLabel: adjusted.label,
    valuationSummary: scored.summary,
    dataGaps: adjusted.dataGaps,
  };
}

export interface ValuationQuoteSnapshot {
  price: number | null;
  currency: string | null;
}

export function enrichValuationItemsWithQuotes(
  items: WarrenValuationItem[],
  quotesBySymbol: Record<string, ValuationQuoteSnapshot | null | undefined>,
): WarrenValuationItem[] {
  return items.map((item) => {
    const quote =
      quotesBySymbol[item.symbol] ?? quotesBySymbol[item.symbol.toUpperCase()];
    return attachValuationQuoteUpside(item, quote?.price ?? null, quote?.currency ?? null);
  });
}

export function mapShareFundamentalsToValuation(bundle: ShareFundamentalsBundle): WarrenValuationItem {
  const overview = bundle.overview!;
  const earningsQuality = deriveEarningsQualityFromIncome(bundle.income, {
    sharesOutstanding: overview.sharesOutstanding,
    profitMargin: overview.profitMargin,
  });
  const metrics = buildValuationSnapshot(overview, earningsQuality);
  const scored = scoreValuation(metrics, {
    rawForwardPE: overview.forwardPE,
    earningsQualityReasons: earningsQuality.reasons,
  });

  return {
    symbol: bundle.symbol,
    companyName: bundle.overview?.name || bundle.symbol,
    currency: normalizeCurrency(overview.currency),
    provider: bundle.provider,
    cached: bundle.cached,
    fetchedAt: bundle.fetchedAt,
    metrics,
    valuationLabel: scored.label,
    valuationSummary: scored.summary,
    dataGaps: scored.dataGaps,
    ...computeUpsideToTarget(null, metrics.analystTargetPrice),
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
  if (normalized.length > WARREN_VALUATION_MAX_SYMBOLS) {
    return {
      ok: false,
      error: `Maximum ${WARREN_VALUATION_MAX_SYMBOLS} tickers per valuation request`,
      code: "invalid_input",
    };
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

  const enriched = await Promise.all(results.map((item) => enrichValuationWithHistoricalPe(item)));

  return { ok: true, results: enriched, errors };
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
      earningsQualitySuspect: false,
      normalizedPe: null,
      epsFy: null,
    };
    const scored = scoreValuation(metrics);
    return {
      symbol,
      companyName: symbol,
      currency: "USD",
      provider: "demo",
      cached: true,
      fetchedAt: "demo",
      metrics,
      valuationLabel: scored.label,
      valuationSummary: scored.summary,
      dataGaps: ["demo mode — not live market data"],
      ...computeUpsideToTarget(null, metrics.analystTargetPrice),
    };
  });
}