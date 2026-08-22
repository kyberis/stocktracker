import type { CompanyOverview } from "@/lib/api-providers/types";

/** Plausible listed-equity P/E band for labeling (excludes penny-stock noise above this). */
export const PLAUSIBLE_PE_MIN = 0.5;
export const PLAUSIBLE_PE_MAX = 120;

/**
 * Forward P/E more than this multiple above trailing is treated as bad provider data
 * (common on LSE GBp quotes with USD reporting).
 */
export const FORWARD_PE_MAX_PREMIUM_VS_TRAILING = 3;

export function isPlausiblePe(pe: number | null | undefined): boolean {
  if (pe == null || !Number.isFinite(pe)) return false;
  return pe >= PLAUSIBLE_PE_MIN && pe <= PLAUSIBLE_PE_MAX;
}

/**
 * Drop trailing/forward P/E values outside a sane band and forward spikes that disagree
 * with trailing (e.g. SRB.L Yahoo forward 216x vs trailing 5x).
 */
export function sanitizePeMultiples(
  trailing: number | null | undefined,
  forward: number | null | undefined,
): { peRatio: number | null; forwardPE: number | null } {
  const peRatio = isPlausiblePe(trailing) ? trailing! : null;
  let forwardPE = isPlausiblePe(forward) ? forward! : null;

  if (peRatio != null && forwardPE != null) {
    if (forwardPE / peRatio > FORWARD_PE_MAX_PREMIUM_VS_TRAILING) {
      forwardPE = null;
    }
  }

  return { peRatio, forwardPE };
}

export function sanitizeOverviewPe(overview: CompanyOverview): CompanyOverview {
  const { peRatio, forwardPE } = sanitizePeMultiples(overview.peRatio, overview.forwardPE);
  if (peRatio === overview.peRatio && forwardPE === overview.forwardPE) {
    return overview;
  }
  return { ...overview, peRatio, forwardPE };
}

export function forwardPeWasRejected(
  rawTrailing: number | null | undefined,
  rawForward: number | null | undefined,
): boolean {
  if (rawForward == null || !Number.isFinite(rawForward)) return false;
  const sanitized = sanitizePeMultiples(rawTrailing, rawForward);
  return sanitized.forwardPE == null && isPlausiblePe(rawTrailing);
}
