import type { CashEntry } from "@/lib/types";

/**
 * Cash that participates in dashboard net worth / widget total.
 * Includes plain cash and fixed-return investments (hybrid portfolio assets).
 * Other manual assets (real_estate, savings, pension) are excluded — they appear
 * in allocation views but not in the hero "total including cash".
 */
export function investmentCashEntries(entries: CashEntry[]): CashEntry[] {
  return entries.filter((c) => !c.type || c.type === "cash" || c.type === "fixed_return");
}

/**
 * Truly liquid cash (broker/manual cash balances) — shown as
 * "Cash available for investment". Fixed-return positions are invested
 * capital and must not appear here.
 */
export function liquidCashEntries(entries: CashEntry[]): CashEntry[] {
  return entries.filter((c) => !c.type || c.type === "cash");
}
