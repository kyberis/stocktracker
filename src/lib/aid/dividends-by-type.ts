import type { ExchangeRates, Holding, QuoteData } from "@/lib/types";
import { computeEstimatedDividends } from "@/lib/services/dividend-calculator";

const TYPE_LABELS: Record<string, string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  cash: "Cash",
};

export interface DividendYieldByType {
  typeKey: string;
  label: string;
  portfolioYield: number;
  annualIncomeEUR: number;
}

export function computeDividendYieldByAssetType(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
): DividendYieldByType[] {
  const estimated = computeEstimatedDividends(holdings, quotes, exchangeRates);
  const byTicker = Object.fromEntries(estimated.map((e) => [e.ticker, e]));

  const buckets: Record<string, { incomeEUR: number; valueEUR: number }> = {};

  for (const h of holdings) {
    const typeKey = h.assetType ?? "stock";
    const est = byTicker[h.ticker];
    const q = quotes[h.ticker];
    const valueEUR = q && q.regularMarketPrice > 0 ? h.shares * q.regularMarketPrice : h.valueInEUR;
    if (!buckets[typeKey]) buckets[typeKey] = { incomeEUR: 0, valueEUR: 0 };
    buckets[typeKey].valueEUR += valueEUR;
    if (est) buckets[typeKey].incomeEUR += est.annualIncomeEUR;
  }

  return Object.entries(buckets)
    .map(([typeKey, { incomeEUR, valueEUR }]) => ({
      typeKey,
      label: TYPE_LABELS[typeKey] ?? typeKey,
      portfolioYield: valueEUR > 0 ? (incomeEUR / valueEUR) * 100 : 0,
      annualIncomeEUR: incomeEUR,
    }))
    .filter((row) => row.annualIncomeEUR > 0 || row.portfolioYield > 0)
    .sort((a, b) => b.annualIncomeEUR - a.annualIncomeEUR);
}
