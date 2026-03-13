import type { ExchangeRates, Holding, QuoteData, TaxonomyAllocation } from "@/lib/types";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";

const PIE_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#64748b",
];

export type TaxonomyCategory = "sector" | "region" | "assetClass" | "assetType";

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
