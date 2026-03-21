/**
 * Computes the percentage growth between two portfolio values.
 * Returns undefined only when growth cannot be meaningfully computed
 * (missing values, zero/negative start, or exactly zero change).
 * Returns negative values for portfolio declines.
 */
export function computeTrialGrowth(
  startValue: number | undefined | null,
  endValue: number | undefined | null,
): number | undefined {
  if (startValue == null || endValue == null) return undefined;
  if (startValue <= 0) return undefined;
  const pct = ((endValue - startValue) / startValue) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) return undefined;
  return rounded;
}
