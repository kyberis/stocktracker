import type { CashEntry } from "@/lib/types";

/**
 * Cash that participates in dashboard net worth / widget total.
 * Manual assets (real_estate, savings, pension, …) are excluded — they appear
 * in allocation views but not in the hero "total including cash".
 */
export function investmentCashEntries(entries: CashEntry[]): CashEntry[] {
  return entries.filter((c) => !c.type || c.type === "cash");
}
