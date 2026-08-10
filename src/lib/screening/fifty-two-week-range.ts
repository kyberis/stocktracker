/**
 * Position of `price` within [low, high] as a 0–100 percentage.
 * Returns null when the range is invalid or price is not finite.
 */
export function rangePositionPct(
  price: number,
  low: number,
  high: number,
): number | null {
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(low) ||
    !Number.isFinite(high) ||
    high <= low
  ) {
    return null;
  }
  const raw = ((price - low) / (high - low)) * 100;
  return Math.min(100, Math.max(0, raw));
}

/** Format an ISO-ish date (YYYY-MM-DD…) for display; falls back to the raw string. */
export function formatRangeDate(
  isoDate: string | null | undefined,
  locale: string,
): string | null {
  if (!isoDate) return null;
  const day = isoDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return isoDate;
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString(locale || "en", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
