import type { CashEntry, ExchangeRates, Holding, HoldingAssetType, ManualAssetType, QuoteData, TaxonomyAllocation } from "@/lib/types";
import { convertCurrency, convertToEUR, resolveQuoteCurrency } from "@/lib/utils";

const PIE_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#64748b",
];

export interface TagAllocationLabels {
  untagged: string;
  crypto: string;
  manual: Record<ManualAssetType, string>;
}

function holdingValueInBase(
  h: Holding,
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
): number {
  const quote = quotes[h.ticker];
  if (quote && quote.regularMarketPrice > 0) {
    const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
    const valueInQuoteCurrency = h.shares * quote.regularMarketPrice;
    const currentBase = convertCurrency(valueInQuoteCurrency, quoteCurrency, baseCurrency, exchangeRates);
    const referenceEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
    const isSuspiciousGBXOutlier =
      h.displayCurrency === "GBX" && h.valueInEUR > 0 && referenceEUR > h.valueInEUR * 10;

    if (isSuspiciousGBXOutlier) {
      return convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
    }
    if (currentBase !== valueInQuoteCurrency || quoteCurrency === baseCurrency) {
      return currentBase;
    }
    return convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
  }
  return convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
}

/**
 * Buckets portfolio value by user tags (stock/ETF only), fixed Crypto and manual-asset buckets.
 * Multi-tag holdings split value equally across tags. Percentages are over total portfolio (holdings + cash).
 */
export function computeTagAllocations(
  holdings: Holding[],
  cashEntries: CashEntry[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
  labels: TagAllocationLabels,
): TaxonomyAllocation[] {
  const buckets = new Map<string, number>();

  for (const h of holdings) {
    const val = holdingValueInBase(h, quotes, exchangeRates, baseCurrency);
    if (val <= 0) continue;

    const type: HoldingAssetType = h.assetType ?? "stock";

    if (type === "crypto") {
      const k = labels.crypto;
      buckets.set(k, (buckets.get(k) ?? 0) + val);
      continue;
    }

    if (type === "stock" || type === "etf") {
      const rawTags = (h.tags ?? []).map((t) => t.trim()).filter(Boolean);
      if (rawTags.length === 0) {
        const k = labels.untagged;
        buckets.set(k, (buckets.get(k) ?? 0) + val);
      } else {
        const share = val / rawTags.length;
        for (const tag of rawTags) {
          buckets.set(tag, (buckets.get(tag) ?? 0) + share);
        }
      }
    }
  }

  for (const c of cashEntries) {
    const assetType: ManualAssetType = c.type ?? "cash";
    const valueBase = convertCurrency(c.amountEUR, "EUR", baseCurrency, exchangeRates);
    const label = labels.manual[assetType] ?? labels.manual.cash;
    buckets.set(label, (buckets.get(label) ?? 0) + valueBase);
  }

  const entries = [...buckets.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return entries.map(([label, valueEUR], i) => ({
    label,
    valueEUR,
    percent: total > 0 ? (valueEUR / total) * 100 : 0,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
}
