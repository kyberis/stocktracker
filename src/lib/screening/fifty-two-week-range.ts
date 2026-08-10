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

/**
 * Reconstruct 12m high/low from distance percentages when absolute levels
 * were not persisted on older screening cards.
 *
 * `distanceTo52wHighPct` = (price − high) / high × 100
 * `distanceTo52wLowPct`  = (price − low) / low × 100
 */
export function levelsFromDistancePct(opts: {
  price: number;
  distanceTo52wHighPct: number | null | undefined;
  distanceTo52wLowPct: number | null | undefined;
  closeHigh12m?: number | null;
  closeLow12m?: number | null;
}): { low: number; high: number } | null {
  const { price } = opts;
  if (!Number.isFinite(price) || price <= 0) return null;

  let high =
    opts.closeHigh12m != null && Number.isFinite(opts.closeHigh12m)
      ? opts.closeHigh12m
      : null;
  let low =
    opts.closeLow12m != null && Number.isFinite(opts.closeLow12m)
      ? opts.closeLow12m
      : null;

  if (
    high == null &&
    opts.distanceTo52wHighPct != null &&
    Number.isFinite(opts.distanceTo52wHighPct)
  ) {
    const denom = 1 + opts.distanceTo52wHighPct / 100;
    if (denom > 0) high = price / denom;
  }
  if (
    low == null &&
    opts.distanceTo52wLowPct != null &&
    Number.isFinite(opts.distanceTo52wLowPct)
  ) {
    const denom = 1 + opts.distanceTo52wLowPct / 100;
    if (denom > 0) low = price / denom;
  }

  if (high == null || low == null || high <= low) return null;
  return { low, high };
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
