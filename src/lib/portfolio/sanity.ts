/**
 * Sanity gates before rendering metrics (TRF-102).
 * Suspicious values degrade to null so UI can show "—".
 */

export const DIVIDEND_YIELD_MAX_PCT = 15;
export const TTWROR_SIMPLE_MULTIPLIER = 3;

/** Price must be finite and > 0. */
export function sanitizePrice(price: number | null | undefined): number | null {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  return price;
}

/** Yield in percent; returns null outside [0, 15]. */
export function clampDividendYieldPct(yieldPct: number | null | undefined): number | null {
  if (yieldPct == null || !Number.isFinite(yieldPct)) return null;
  if (yieldPct < 0 || yieldPct > DIVIDEND_YIELD_MAX_PCT) return null;
  return yieldPct;
}

/** P/E must be finite and > 0. */
export function sanitizePe(pe: number | null | undefined): number | null {
  if (pe == null || !Number.isFinite(pe) || pe <= 0) return null;
  return pe;
}

/**
 * TTWROR vs simple return: if |ttwror| > 3× |simple|, treat as unavailable.
 * Values are fractions or percents — both sides must use the same unit.
 */
export function sanitizeTtwror(
  ttwror: number | null | undefined,
  simpleReturn: number | null | undefined,
): number | null {
  if (ttwror == null || !Number.isFinite(ttwror)) return null;
  if (simpleReturn == null || !Number.isFinite(simpleReturn)) return ttwror;
  const limit = Math.abs(simpleReturn) * TTWROR_SIMPLE_MULTIPLIER;
  if (limit > 0 && Math.abs(ttwror) > limit) return null;
  return ttwror;
}
