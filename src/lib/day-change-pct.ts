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

const SLEEVE_KEYS = ["stock", "etf", "fund", "crypto"] as const;
const ALL_SLEEVE_KEYS = ["stock", "etf", "fund", "crypto", "fixed_return"] as const;

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
  // Guard: when prior is ~0 (e.g. capital appearing as day Δ), do not publish
  // abs — otherwise All Assets € today can go green while % stays flat/negative.
  if (bucket.priorValue <= 0) return { pct: 0, abs: 0 };
  return {
    pct: (bucket.dayPL / bucket.priorValue) * 100,
    abs: bucket.dayPL,
  };
}

/**
 * All Assets day move from sleeve abs + live current values (same numbers the UI shows).
 * prior_sleeve ≈ current − dayPL; allPct = Σ dayPL / Σ prior.
 */
export function reconcileAllFromSleeveCurrents(
  absBySleeve: Partial<Record<AssetFilter, number | undefined>>,
  currentBySleeve: Partial<Record<AssetFilter, number>>,
): { abs: number; pct: number; included: boolean } {
  let dayPL = 0;
  let prior = 0;
  let included = false;
  for (const key of ALL_SLEEVE_KEYS) {
    const a = absBySleeve[key];
    const current = currentBySleeve[key] ?? 0;
    if (a == null || !Number.isFinite(a) || current <= 0) continue;
    dayPL += a;
    prior += Math.max(0, current - a);
    included = true;
  }
  if (!included || prior <= 0) return { abs: 0, pct: 0, included: false };
  return { abs: dayPL, pct: (dayPL / prior) * 100, included: true };
}

/**
 * Single source of truth for portfolio day change (TRF-003).
 *
 * Call this ONCE per screen and pass the result into the hero, asset pills, and
 * performance matrix — never recompute in child components.
 *
 * - Day Δ = shares × (price − previousClose), converted to portfolio currency.
 * - Each class sleeve gets its own abs / %.
 * - All Assets is ALWAYS Σ(sleeve abs) / Σ(current − abs), using the same
 *   current values shown in the UI — so the headline cannot disagree with the pills.
 */
export function computeDayChangeByType(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
  _now?: Date,
  cashEntries?: CashEntry[],
  currentBySleeve?: Partial<Record<AssetFilter, number>>,
): DayChangeByType {
  const buckets: Record<HoldingAssetType, Bucket> = {
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
    if (prevClose == null || prevClose <= 0) continue;

    const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
    const dayDeltaLocal = h.shares * (quote.regularMarketPrice - prevClose);
    const priorLocal = Math.abs(h.shares * prevClose);
    const dayDeltaBase = convertCurrency(dayDeltaLocal, quoteCurrency, baseCurrency, exchangeRates);
    const priorBase = convertCurrency(priorLocal, quoteCurrency, baseCurrency, exchangeRates);
    if (!Number.isFinite(dayDeltaBase) || !Number.isFinite(priorBase) || priorBase <= 0) continue;

    const type = (h.assetType ?? "stock") as HoldingAssetType;
    const sleeve = buckets[type];
    if (!sleeve) continue;

    sleeve.dayPL += dayDeltaBase;
    sleeve.priorValue += priorBase;
    sleeve.included += 1;
  }

  const fr = fixedReturnDayChange(cashEntries, exchangeRates, baseCurrency);

  const pct: Partial<Record<AssetFilter, number>> = {};
  const abs: Partial<Record<AssetFilter, number | undefined>> = {};

  for (const key of SLEEVE_KEYS) {
    if (buckets[key].included === 0) continue;
    const finalized = finalizeBucket(buckets[key]);
    pct[key] = finalized.pct;
    abs[key] = finalized.abs;
  }

  if (fr.included > 0) {
    const frFinal = finalizeBucket(fr);
    pct.fixed_return = frFinal.pct;
    abs.fixed_return = frFinal.abs;
  }

  // Prefer live sleeve currents when provided (hero / pills / matrix share these).
  // Fallback: quote-prior buckets so callers without currents still get a consistent all.
  if (currentBySleeve) {
    const all = reconcileAllFromSleeveCurrents(abs, currentBySleeve);
    if (all.included) {
      pct.all = all.pct;
      abs.all = all.abs;
    } else {
      pct.all = 0;
      abs.all = undefined;
    }
  } else {
    let dayPL = 0;
    let prior = 0;
    let included = 0;
    for (const key of SLEEVE_KEYS) {
      dayPL += buckets[key].dayPL;
      prior += buckets[key].priorValue;
      included += buckets[key].included;
    }
    dayPL += fr.dayPL;
    prior += fr.priorValue;
    included += fr.included;
    if (included > 0) {
      pct.all = prior > 0 ? (dayPL / prior) * 100 : 0;
      abs.all = dayPL;
    }
  }

  return { pct, abs };
}

/** Pick headline abs/% for the active asset filter from the shared day-change result. */
export function dayChangeForFilter(
  dayChange: DayChangeByType,
  filter: AssetFilter = "all",
): { abs: number; pct: number } {
  return {
    abs: dayChange.abs[filter] ?? 0,
    pct: dayChange.pct[filter] ?? 0,
  };
}

/** Headline day P/L (All Assets). */
export function computeDayChangeHeadline(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
  now?: Date,
  cashEntries?: CashEntry[],
  currentBySleeve?: Partial<Record<AssetFilter, number>>,
): { abs: number; pct: number } {
  const byType = computeDayChangeByType(
    holdings,
    quotes,
    exchangeRates,
    baseCurrency,
    now,
    cashEntries,
    currentBySleeve,
  );
  return dayChangeForFilter(byType, "all");
}
