import type { Transaction } from "@/lib/types";

/** Reject week-over-week delta if the latest snapshot is older than this many days before week start. */
export const DIGEST_BASELINE_MAX_AGE_DAYS = 14;

/** Calendar days from iso A to iso B (UTC), both YYYY-MM-DD. */
export function utcDaysBetween(isoDateA: string, isoDateB: string): number {
  const a = isoDateA.slice(0, 10);
  const b = isoDateB.slice(0, 10);
  const t0 = Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10)));
  const t1 = Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return Math.round((t1 - t0) / 86400000);
}

export function isDigestBaselineTooOld(snapshotDay: string, weekStart: string, maxAgeDays = DIGEST_BASELINE_MAX_AGE_DAYS): boolean {
  if (snapshotDay.length < 10 || weekStart.length < 10) return true;
  return utcDaysBetween(snapshotDay, weekStart) > maxAgeDays;
}

export function transactionAmountEUR(tx: Transaction): number {
  const cur = (tx.currency || "EUR").toUpperCase();
  if (cur === "EUR") return tx.totalAmount;
  if (tx.exchangeRateEur && tx.exchangeRateEur > 0) {
    return tx.totalAmount / tx.exchangeRateEur;
  }
  return 0;
}

function txInWeek(tx: Transaction, weekStart: string, weekEnd: string): boolean {
  const d = tx.date.slice(0, 10);
  return d >= weekStart && d <= weekEnd;
}

/**
 * Estimated net cash deployed into holdings this week: buy amounts minus sell proceeds (EUR).
 * Does not include dividends or fees. Use with week change to explain large moves.
 */
export function computeNetBuyFlowEUR(transactions: Transaction[], weekStart: string, weekEnd: string): number {
  let sum = 0;
  for (const tx of transactions) {
    if (!txInWeek(tx, weekStart, weekEnd)) continue;
    const eur = transactionAmountEUR(tx);
    if (tx.type === "buy") sum += eur;
    else if (tx.type === "sell") sum -= eur;
  }
  return Math.round(sum * 100) / 100;
}
