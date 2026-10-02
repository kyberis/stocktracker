/** Historical dividend used to estimate the next payment. */
export interface DividendHistoryPoint {
  date: string;
  amount: number;
}

const DAY_MS = 86_400_000;

/**
 * Use the last paid amount only when the upcoming ex-date lines up with the
 * gap between the two most recent payments. A single historical payment is
 * not enough to confirm cadence, and the annual dividend rate is never used.
 */
export function amountFromDividendHistory(
  upcomingExDate: string,
  history: readonly DividendHistoryPoint[],
): number | null {
  const sorted = history
    .filter((h) => h.amount > 0 && /^\d{4}-\d{2}-\d{2}/.test(h.date))
    .map((h) => ({ date: h.date.slice(0, 10), amount: h.amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;

  const last = sorted[sorted.length - 1]!;
  const prev = sorted[sorted.length - 2]!;
  const interval = Date.parse(last.date) - Date.parse(prev.date);
  const upcoming = Date.parse(upcomingExDate.slice(0, 10));
  if (!Number.isFinite(interval) || !Number.isFinite(upcoming)) return null;
  if (interval < 20 * DAY_MS || interval > 400 * DAY_MS) return null;

  const expected = Date.parse(last.date) + interval;
  const slack = Math.max(10 * DAY_MS, interval * 0.25);
  if (Math.abs(upcoming - expected) > slack) return null;
  return last.amount;
}
