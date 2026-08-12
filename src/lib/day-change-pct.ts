import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import { convertCurrency, resolveQuoteCurrency, todayLocal } from "@/lib/utils";
import {
  cashAmountEUR,
  dayChangeFixedReturnCash,
  isFixedReturnCashEntry,
} from "@/lib/fixed-return-cash";
import type { CashEntry, ExchangeRates, Holding, QuoteData } from "@/lib/types";

export interface DayChangeByType {
  pct: Partial<Record<AssetFilter, number>>;
  /** Absolute day P/L in portfolio base currency; undefined when no session today for that bucket */
  abs: Partial<Record<AssetFilter, number | undefined>>;
}

function groupHoldings(holdings: Holding[], group: AssetFilter): Holding[] {
  if (group === "all") return holdings;
  if (group === "fixed_return") return [];
  return holdings.filter((h) => (h.assetType ?? "stock") === group);
}

function fixedReturnDayChange(
  cashEntries: CashEntry[] | undefined,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
): { dayPL: number; priorValue: number; included: number } {
  if (!cashEntries?.length) return { dayPL: 0, priorValue: 0, included: 0 };
  const asOf = todayLocal();
  let dayPL = 0;
  let priorValue = 0;
  let included = 0;
  for (const entry of cashEntries) {
    if (!isFixedReturnCashEntry(entry)) continue;
    const currentEUR = cashAmountEUR(entry, { asOf, rates: exchangeRates });
    const dayDeltaEUR = dayChangeFixedReturnCash(entry, asOf, exchangeRates);
    const currentBase = convertCurrency(currentEUR, "EUR", baseCurrency, exchangeRates);
    const dayDeltaBase = convertCurrency(dayDeltaEUR, "EUR", baseCurrency, exchangeRates);
    dayPL += dayDeltaBase;
    priorValue += Math.max(0, currentBase - dayDeltaBase);
    included += 1;
  }
  return { dayPL, priorValue, included };
}

/**
 * Day return (%) and absolute P/L per asset bucket using the same rules everywhere (TRF-003):
 * - Include every holding with a usable price; exclude from BOTH amount and % when price is missing.
 * - Prefer previousClose when present; otherwise derive prior as price − change.
 * - Return % = sum(day Δ) / sum(prior close value) — never mix scopes.
 * - `wasMarketOpenToday` only gates whether abs is labeled "active today"; math always includes quotes.
 * - Optional `cashEntries`: fixed-return accrual day change is added to `fixed_return` and `all`.
 */
export function computeDayChangeByType(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
  _now?: Date,
  cashEntries?: CashEntry[],
): DayChangeByType {
  const pct: Partial<Record<AssetFilter, number>> = {};
  const abs: Partial<Record<AssetFilter, number | undefined>> = {};
  const groups: AssetFilter[] = ["all", "stock", "etf", "fund", "crypto"];

  for (const group of groups) {
    const bucket = groupHoldings(holdings, group);
    if (bucket.length === 0 && group !== "all") continue;

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

    if (group === "all") {
      const fr = fixedReturnDayChange(cashEntries, exchangeRates, baseCurrency);
      dayPL += fr.dayPL;
      priorValue += fr.priorValue;
      included += fr.included;
    }

    if (included === 0 && group !== "all") continue;
    pct[group] = priorValue > 0 ? (dayPL / priorValue) * 100 : 0;
    abs[group] = included > 0 ? dayPL : undefined;
  }

  const fr = fixedReturnDayChange(cashEntries, exchangeRates, baseCurrency);
  if (fr.included > 0) {
    pct.fixed_return = fr.priorValue > 0 ? (fr.dayPL / fr.priorValue) * 100 : 0;
    abs.fixed_return = fr.dayPL;
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
  cashEntries?: CashEntry[],
): { abs: number; pct: number } {
  const { pct, abs } = computeDayChangeByType(holdings, quotes, exchangeRates, baseCurrency, now, cashEntries);
  return { abs: abs.all ?? 0, pct: pct.all ?? 0 };
}
