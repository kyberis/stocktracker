import type { CashEntry, ExchangeRates, Holding, QuoteData } from "@/lib/types";
import { convertCurrency, resolveQuoteCurrency } from "@/lib/utils";

export interface ConcentrationSummary {
  topThreePercent: number;
  topTickers: string[];
}

export function computeTopHoldingsConcentration(
  holdings: Holding[],
  cashEntries: CashEntry[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
): ConcentrationSummary {
  const rows: { ticker: string; value: number }[] = [];

  for (const h of holdings) {
    const q = quotes[h.ticker];
    let value = h.valueInEUR;
    if (q?.regularMarketPrice) {
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, q.currency);
      value = convertCurrency(h.shares * q.regularMarketPrice, quoteCurrency, baseCurrency, exchangeRates);
    } else {
      value = convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
    }
    rows.push({ ticker: h.ticker, value });
  }

  for (const c of cashEntries) {
    rows.push({
      ticker: c.name || "Cash",
      value: convertCurrency(c.amountEUR, "EUR", baseCurrency, exchangeRates),
    });
  }

  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total <= 0) return { topThreePercent: 0, topTickers: [] };

  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const top3 = sorted.slice(0, 3);
  const topThreePercent = (top3.reduce((s, r) => s + r.value, 0) / total) * 100;

  return {
    topThreePercent,
    topTickers: top3.map((r) => r.ticker),
  };
}
