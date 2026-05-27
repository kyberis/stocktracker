import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import { wasMarketOpenToday } from "@/lib/market-hours";
import { convertCurrency, resolveQuoteCurrency } from "@/lib/utils";
import type { ExchangeRates, Holding, QuoteData } from "@/lib/types";

export interface DayChangeByType {
  pct: Partial<Record<AssetFilter, number>>;
  /** Absolute day P/L in portfolio base currency; undefined when no session today for that bucket */
  abs: Partial<Record<AssetFilter, number | undefined>>;
}

function groupHoldings(holdings: Holding[], group: AssetFilter): Holding[] {
  if (group === "all") return holdings;
  return holdings.filter((h) => (h.assetType ?? "stock") === group);
}

/**
 * Day return (%) and absolute P/L per asset bucket using the same rules everywhere:
 * - Include a holding's day delta only when its market was open today (crypto always).
 * - Return % = sum(day Δ) / sum(prior close value), not a quote-weighted average.
 */
export function computeDayChangeByType(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
  now?: Date,
): DayChangeByType {
  const pct: Partial<Record<AssetFilter, number>> = {};
  const abs: Partial<Record<AssetFilter, number | undefined>> = {};
  const groups: AssetFilter[] = ["all", "stock", "etf", "crypto"];

  for (const group of groups) {
    const bucket = groupHoldings(holdings, group);
    if (bucket.length === 0) continue;

    let dayPL = 0;
    let priorValue = 0;
    let activeToday = false;

    for (const h of bucket) {
      const quote = quotes[h.ticker];
      if (!quote || quote.regularMarketPrice <= 0) continue;

      const isCrypto = h.assetType === "crypto";
      const countsToday = isCrypto || wasMarketOpenToday(h.exchange, now);
      if (!countsToday) continue;

      activeToday = true;
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
      const posValue = Math.abs(h.shares * quote.regularMarketPrice);
      const posValueBase = convertCurrency(posValue, quoteCurrency, baseCurrency, exchangeRates);
      const dayDelta = h.shares * (quote.regularMarketChange ?? 0);
      const dayDeltaBase = convertCurrency(dayDelta, quoteCurrency, baseCurrency, exchangeRates);

      dayPL += dayDeltaBase;
      priorValue += posValueBase - dayDeltaBase;
    }

    pct[group] = priorValue > 0 ? (dayPL / priorValue) * 100 : 0;
    abs[group] = activeToday ? dayPL : undefined;
  }

  return { pct, abs };
}

/** Headline day P/L for a holdings list (same rules as the performance matrix). */
export function computeDayChangeHeadline(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
  now?: Date,
): { abs: number; pct: number } {
  const { pct, abs } = computeDayChangeByType(holdings, quotes, exchangeRates, baseCurrency, now);
  return { abs: abs.all ?? 0, pct: pct.all ?? 0 };
}
