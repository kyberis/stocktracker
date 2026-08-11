import type { CashEntry, ExchangeRates } from "@/lib/types";
import { convertToEUR, todayLocal } from "@/lib/utils";
import {
  dayChangeFixedReturn,
  valueFixedReturnAt,
  type FixedReturnParams,
} from "@/lib/fixed-return";

export function isFixedReturnCashEntry(entry: CashEntry): boolean {
  return entry.type === "fixed_return";
}

export function fixedReturnParamsFromCash(entry: CashEntry): FixedReturnParams | null {
  if (!isFixedReturnCashEntry(entry)) return null;
  const principal = entry.displayAmount ?? entry.amountEUR;
  const startDate = entry.startDate || "";
  const termMonths = entry.termMonths ?? 0;
  const totalReturnPct = entry.totalReturnPct ?? 0;
  if (!(principal >= 0) || !startDate || termMonths <= 0) return null;
  return { principal, startDate, termMonths, totalReturnPct };
}

/**
 * Recompute accrued `amountEUR` for a fixed-return cash entry.
 * Non-EUR without rates mirrors native amount (same convention as manual assets).
 */
export function enrichFixedReturnCashEntry(
  entry: CashEntry,
  opts?: { asOf?: string; rates?: ExchangeRates },
): CashEntry {
  if (!isFixedReturnCashEntry(entry)) return entry;
  const params = fixedReturnParamsFromCash(entry);
  if (!params) return entry;

  const asOf = opts?.asOf ?? todayLocal();
  const accruedNative = valueFixedReturnAt(params, asOf);
  const currency = entry.displayCurrency || "EUR";

  let amountEUR: number;
  if (currency === "EUR") {
    amountEUR = accruedNative;
  } else if (opts?.rates) {
    amountEUR = convertToEUR(accruedNative, currency, opts.rates);
  } else {
    amountEUR = accruedNative;
  }

  return { ...entry, amountEUR };
}

/** Recompute accrued EUR for every fixed-return row (browser-local "today"). */
export function enrichCashEntries(
  entries: CashEntry[],
  opts?: { asOf?: string; rates?: ExchangeRates },
): CashEntry[] {
  return entries.map((e) => enrichFixedReturnCashEntry(e, opts));
}

/** Current EUR value: schedule accrual for fixed_return, else stored amountEUR. */
export function cashAmountEUR(
  entry: CashEntry,
  opts?: { asOf?: string; rates?: ExchangeRates },
): number {
  if (!isFixedReturnCashEntry(entry)) return entry.amountEUR;
  return enrichFixedReturnCashEntry(entry, opts).amountEUR;
}

/** Sum of fixed-return accrued values as of a date (EUR when rates provided). */
export function sumFixedReturnValueAt(entries: CashEntry[], asOf: string, rates?: ExchangeRates): number {
  let sum = 0;
  for (const entry of entries) {
    if (!isFixedReturnCashEntry(entry)) continue;
    const params = fixedReturnParamsFromCash(entry);
    if (!params) continue;
    const native = valueFixedReturnAt(params, asOf);
    const currency = entry.displayCurrency || "EUR";
    if (currency === "EUR" || !rates) {
      sum += native;
    } else {
      sum += convertToEUR(native, currency, rates);
    }
  }
  return sum;
}

export function dayChangeFixedReturnCash(entry: CashEntry, asOf: string, rates?: ExchangeRates): number {
  const params = fixedReturnParamsFromCash(entry);
  if (!params) return 0;
  const nativeDelta = dayChangeFixedReturn(params, asOf);
  const currency = entry.displayCurrency || "EUR";
  if (currency === "EUR" || !rates) return nativeDelta;
  return convertToEUR(nativeDelta, currency, rates);
}

/** Principal in EUR for cost basis. */
export function fixedReturnPrincipalEUR(entry: CashEntry, rates?: ExchangeRates): number {
  const params = fixedReturnParamsFromCash(entry);
  if (!params) return entry.amountEUR;
  const currency = entry.displayCurrency || "EUR";
  if (currency === "EUR" || !rates) return params.principal;
  return convertToEUR(params.principal, currency, rates);
}
