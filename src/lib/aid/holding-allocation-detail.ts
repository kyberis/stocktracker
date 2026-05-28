import type { ExchangeRates, Holding, QuoteData } from "@/lib/types";
import { convertCurrency, resolveQuoteCurrency } from "@/lib/utils";

export interface HoldingAllocRow {
  ticker: string;
  name: string;
  valueBase: number;
  percentOfType: number;
}

export function topHoldingsForAssetType(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
  typeKey: string,
  limit = 5,
): HoldingAllocRow[] {
  const filtered =
    typeKey === "cash"
      ? []
      : holdings.filter((h) => (h.assetType ?? "stock") === typeKey);

  const rows: HoldingAllocRow[] = [];
  for (const h of filtered) {
    const q = quotes[h.ticker];
    let valueBase = 0;
    if (q && q.regularMarketPrice > 0) {
      const cur = resolveQuoteCurrency(h.displayCurrency, q.currency);
      valueBase = convertCurrency(h.shares * q.regularMarketPrice, cur, baseCurrency, exchangeRates);
    } else {
      valueBase = convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
    }
    rows.push({ ticker: h.ticker, name: h.name, valueBase, percentOfType: 0 });
  }

  const typeTotal = rows.reduce((s, r) => s + r.valueBase, 0);
  return rows
    .map((r) => ({
      ...r,
      percentOfType: typeTotal > 0 ? (r.valueBase / typeTotal) * 100 : 0,
    }))
    .sort((a, b) => b.valueBase - a.valueBase)
    .slice(0, limit);
}
