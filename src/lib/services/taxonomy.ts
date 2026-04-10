import type { ExchangeRates, Holding, QuoteData, TaxonomyAllocation, ETFSectorWeight } from "@/lib/types";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";
import { holdingIsEtfLike } from "./etf-lookthrough";

function holdingValueEur(
  h: Holding,
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
): number {
  const q = quotes[h.ticker];
  if (q && q.regularMarketPrice > 0) {
    const qc = resolveQuoteCurrency(h.displayCurrency, q.currency);
    return convertToEUR(h.shares * q.regularMarketPrice, qc, exchangeRates);
  }
  return 0;
}

const PIE_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#64748b",
];

export type TaxonomyCategory = "sector" | "region" | "assetClass" | "assetType";

/** Normalize sector strings so Yahoo ETF keys (e.g. realestate) match stock labels (e.g. "Real Estate"). */
export function sectorAggregationKey(label: string): string {
  return label.toLowerCase().replace(/[\s_-]/g, "").replace(/[^a-z0-9]/g, "");
}

function pickPreferredSectorLabel(a: string, b: string): string {
  const aSpace = a.includes(" ");
  const bSpace = b.includes(" ");
  if (aSpace !== bSpace) return aSpace ? a : b;
  if (a.length !== b.length) return a.length > b.length ? a : b;
  const capCount = (s: string) => (s.match(/[A-Z]/g) ?? []).length;
  if (capCount(a) !== capCount(b)) return capCount(a) > capCount(b) ? a : b;
  return a;
}

function addMergedSectorBucket(
  buckets: Map<string, { valueEUR: number; displayLabel: string }>,
  rawLabel: string,
  deltaEUR: number,
): void {
  const key = sectorAggregationKey(rawLabel) || "\0";
  const prev = buckets.get(key);
  if (!prev) {
    buckets.set(key, { valueEUR: deltaEUR, displayLabel: rawLabel });
    return;
  }
  prev.valueEUR += deltaEUR;
  prev.displayLabel = pickPreferredSectorLabel(prev.displayLabel, rawLabel);
}

export function computeTaxonomyAllocations(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  category: TaxonomyCategory,
  unclassifiedLabel: string,
): TaxonomyAllocation[] {
  const buckets: Record<string, number> = {};
  let total = 0;

  holdings.forEach((h) => {
    const q = quotes[h.ticker];
    let valueEUR = 0;
    if (q && q.regularMarketPrice > 0) {
      const qc = resolveQuoteCurrency(h.displayCurrency, q.currency);
      valueEUR = convertToEUR(h.shares * q.regularMarketPrice, qc, exchangeRates);
    }
    total += valueEUR;

    let label: string;
    if (category === "assetType") {
      label = h.assetType === "etf" ? "ETF" : "Stock";
    } else {
      label = (h[category] as string) || unclassifiedLabel;
    }
    buckets[label] = (buckets[label] || 0) + valueEUR;
  });

  return Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .map(([label, valueEUR], i) => ({
      label,
      valueEUR,
      percent: total > 0 ? (valueEUR / total) * 100 : 0,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

/**
 * Sector view only: splits ETF position value across Yahoo fund sector weights when enabled.
 * Falls back to {@link computeTaxonomyAllocations} for non-sector categories or when disabled.
 */
export function computeTaxonomyAllocationsWithEtfSectorLookthrough(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  category: TaxonomyCategory,
  unclassifiedLabel: string,
  etfSectorWeights: Record<string, ETFSectorWeight[] | null | undefined>,
  etfLookthroughEnabled: boolean,
): TaxonomyAllocation[] {
  if (category !== "sector" || !etfLookthroughEnabled) {
    return computeTaxonomyAllocations(holdings, quotes, exchangeRates, category, unclassifiedLabel);
  }

  const buckets = new Map<string, { valueEUR: number; displayLabel: string }>();
  let total = 0;

  for (const h of holdings) {
    const valueEUR = holdingValueEur(h, quotes, exchangeRates);
    total += valueEUR;
    const q = quotes[h.ticker];
    const weights = etfSectorWeights[h.ticker.toUpperCase()];
    const useLookthrough = holdingIsEtfLike(h, q) && weights && weights.length > 0;

    if (useLookthrough && weights) {
      let sumW = 0;
      for (const { sector, weight } of weights) {
        if (!sector || weight <= 0) continue;
        sumW += weight;
        addMergedSectorBucket(buckets, sector, valueEUR * (weight / 100));
      }
      if (sumW < 99.5 && sumW > 0) {
        addMergedSectorBucket(buckets, unclassifiedLabel, valueEUR * ((100 - sumW) / 100));
      }
      continue;
    }

    const label = (h.sector as string) || unclassifiedLabel;
    addMergedSectorBucket(buckets, label, valueEUR);
  }

  return [...buckets.values()]
    .sort((a, b) => b.valueEUR - a.valueEUR)
    .map(({ displayLabel: label, valueEUR }, i) => ({
      label,
      valueEUR,
      percent: total > 0 ? (valueEUR / total) * 100 : 0,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

export function hasUnclassifiedHoldings(holdings: Holding[]): boolean {
  return holdings.some((h) => !h.sector && !h.region && !h.assetClass);
}

export interface DonutSegment {
  label: string;
  valueEUR: number;
  percent: number;
  color: string;
  start: number;
  end: number;
}

export function computeDonutSegments(allocations: TaxonomyAllocation[]): DonutSegment[] {
  let cumulative = 0;
  return allocations.map((a) => {
    const start = cumulative;
    cumulative += a.percent;
    return { ...a, start, end: cumulative };
  });
}

export function getDonutArc(startPct: number, endPct: number, r = 40, cx = 50, cy = 50): string {
  const startAngle = (startPct / 100) * 2 * Math.PI - Math.PI / 2;
  const endAngle = (endPct / 100) * 2 * Math.PI - Math.PI / 2;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endPct - startPct > 50 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}
