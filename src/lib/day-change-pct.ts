import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import { convertCurrency, resolveQuoteCurrency, todayLocal } from "@/lib/utils";
import {
  cashAmountEUR,
  dayChangeFixedReturnCash,
  isFixedReturnCashEntry,
} from "@/lib/fixed-return-cash";
import type { CashEntry, ExchangeRates, Holding, HoldingAssetType, QuoteData } from "@/lib/types";

export interface DayChangeByType {
  pct: Partial<Record<AssetFilter, number>>;
  /** Absolute day P/L in portfolio base currency; undefined when no positions contributed */
  abs: Partial<Record<AssetFilter, number | undefined>>;
}

type Bucket = { dayPL: number; priorValue: number; included: number };

function emptyBucket(): Bucket {
  return { dayPL: 0, priorValue: 0, included: 0 };
}

function fixedReturnDayChange(
  cashEntries: CashEntry[] | undefined,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
): Bucket {
  if (!cashEntries?.length) return emptyBucket();
  const asOf = todayLocal();
  const bucket = emptyBucket();
  for (const entry of cashEntries) {
    if (!isFixedReturnCashEntry(entry)) continue;
    const currentEUR = cashAmountEUR(entry, { asOf, rates: exchangeRates });
    const dayDeltaEUR = dayChangeFixedReturnCash(entry, asOf, exchangeRates);
    const currentBase = convertCurrency(currentEUR, "EUR", baseCurrency, exchangeRates);
    const dayDeltaBase = convertCurrency(dayDeltaEUR, "EUR", baseCurrency, exchangeRates);
    if (!Number.isFinite(currentBase) || !Number.isFinite(dayDeltaBase)) continue;
    bucket.dayPL += dayDeltaBase;
    bucket.priorValue += Math.max(0, currentBase - dayDeltaBase);
    bucket.included += 1;
  }
  return bucket;
}

function finalizeBucket(bucket: Bucket): { pct: number; abs: number | undefined } {
  if (bucket.included === 0) return { pct: 0, abs: undefined };
  return {
    pct: bucket.priorValue > 0 ? (bucket.dayPL / bucket.priorValue) * 100 : 0,
    abs: bucket.dayPL,
  };
}

/**
 * Day return (%) and absolute P/L per asset bucket using the same rules everywhere (TRF-003):
 * - Single pass over holdings so "all" is always the exact sum of the class sleeves.
 * - Include every holding with a usable price; exclude from BOTH amount and % when price/FX is missing.
 * - Prefer previousClose when present; otherwise derive prior as price − change.
 * - Day Δ prefers regularMarketChange when present (aligned with portfolio totals); else price − prevClose.
 * - Return % = sum(day Δ) / sum(prior close value) — never mix scopes.
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
  const buckets: Record<HoldingAssetType | "all", Bucket> = {
    all: emptyBucket(),
    stock: emptyBucket(),
    etf: emptyBucket(),
    fund: emptyBucket(),
    crypto: emptyBucket(),
  };

  for (const h of holdings) {
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
    const dayDeltaLocal =
      change != null && Number.isFinite(change)
        ? h.shares * change
        : h.shares * (quote.regularMarketPrice - prevClose);
    const priorLocal = Math.abs(h.shares * prevClose);
    const dayDeltaBase = convertCurrency(dayDeltaLocal, quoteCurrency, baseCurrency, exchangeRates);
    const priorBase = convertCurrency(priorLocal, quoteCurrency, baseCurrency, exchangeRates);
    if (!Number.isFinite(dayDeltaBase) || !Number.isFinite(priorBase) || priorBase <= 0) continue;

    const type: HoldingAssetType = h.assetType ?? "stock";
    buckets.all.dayPL += dayDeltaBase;
    buckets.all.priorValue += priorBase;
    buckets.all.included += 1;

    const sleeve = buckets[type];
    sleeve.dayPL += dayDeltaBase;
    sleeve.priorValue += priorBase;
    sleeve.included += 1;
  }

  const fr = fixedReturnDayChange(cashEntries, exchangeRates, baseCurrency);
  buckets.all.dayPL += fr.dayPL;
  buckets.all.priorValue += fr.priorValue;
  buckets.all.included += fr.included;

  const pct: Partial<Record<AssetFilter, number>> = {};
  const abs: Partial<Record<AssetFilter, number | undefined>> = {};

  for (const key of ["all", "stock", "etf", "fund", "crypto"] as const) {
    if (key !== "all" && buckets[key].included === 0) continue;
    const finalized = finalizeBucket(buckets[key]);
    // Always publish "all" (0 when empty) so headline and matrix share one key.
    if (key === "all" || buckets[key].included > 0) {
      pct[key] = finalized.pct;
      abs[key] = finalized.abs;
    }
  }

  if (fr.included > 0) {
    const frFinal = finalizeBucket(fr);
    pct.fixed_return = frFinal.pct;
    abs.fixed_return = frFinal.abs;
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
