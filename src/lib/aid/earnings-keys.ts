/** Earnings digest rows are immutable once reported — long cache TTL. */
export const EARNINGS_REPORT_LOOKBACK_DAYS = 21;
export const EARNINGS_CACHE_TTL_MS = 90 * 24 * 3600 * 1000;

export function earningsEventKey(ticker: string, reportDate: string): string {
  return `earnings:${reportDate}`;
}

export function reportDateFromEarningsEventKey(eventKey: string): string | null {
  if (!eventKey.startsWith("earnings:")) return null;
  const d = eventKey.slice("earnings:".length);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export function earningsExpiresAt(): string {
  return new Date(Date.now() + EARNINGS_CACHE_TTL_MS).toISOString();
}

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function earningsReportWindow(): { from: string; to: string; today: string } {
  const today = new Date().toISOString().slice(0, 10);
  return {
    from: isoDateDaysAgo(EARNINGS_REPORT_LOOKBACK_DAYS),
    to: today,
    today,
  };
}
