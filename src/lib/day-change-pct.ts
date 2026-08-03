import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
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
 * Day return (%) and absolute P/L per asset bucket using the same rules everywhere (TRF-003):
 * - Include every holding with a usable price; exclude from BOTH amount and % when price is missing.
 * - Prefer previousClose when present; otherwise derive prior as price − change.
 * - Return % = sum(day Δ) / sum(prior close value) — never mix scopes.
 * - `wasMarketOpenToday` only gates whether abs is labeled "active today"; math always includes quotes.
 */
export function computeDayChangeByType(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
  _now?: Date,
): DayChangeByType {
  const pct: Partial<Record<AssetFilter, number>> = {};
  const abs: Partial<Record<AssetFilter, number | undefined>> = {};
  const groups: AssetFilter[] = ["all", "stock", "etf", "fund", "crypto"];

  for (const group of groups) {
    const bucket = groupHoldings(holdings, group);
    if (bucket.length === 0) continue;

    let dayPL = 0;
    let priorValue = 0;
    let included = 0;

    for (const h of bucket) {
      const quote = quotes[h.ticker];
      if (!quote || quote.regularMarketPrice <= 0) continue;

      const change = quote.regularMarketChange;
      const prevClose =
        quote.regularMarketPreviousClose != null && quote.regularMarketPreviousClose > 0
          ? quote.regularMarketPreviousClose
          : change != null && Number.isFinite(change)
            ? quote.regularMarketPrice - change
            : null;
      // No prior close → exclude from BOTH amount and % (TRF-003).
      if (prevClose == null || prevClose <= 0) continue;

      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
      const dayDeltaLocal = h.shares * (quote.regularMarketPrice - prevClose);
      const priorLocal = Math.abs(h.shares * prevClose);
      const dayDeltaBase = convertCurrency(dayDeltaLocal, quoteCurrency, baseCurrency, exchangeRates);
      const priorBase = convertCurrency(priorLocal, quoteCurrency, baseCurrency, exchangeRates);

      dayPL += dayDeltaBase;
      priorValue += priorBase;
      included += 1;
    }

    pct[group] = priorValue > 0 ? (dayPL / priorValue) * 100 : 0;
    abs[group] = included > 0 ? dayPL : undefined;
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
