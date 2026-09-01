/**
 * Detect when trailing (TTM) earnings look inflated by one-offs relative to
 * the latest full fiscal year — so checklist valuation does not treat a
 * depressed TTM P/E as "cheap".
 */

export interface EarningsQualityInput {
  /** Diluted EPS, trailing twelve months. */
  epsTtm: number | null;
  /** Diluted EPS, latest completed fiscal year. */
  epsFy: number | null;
  /** Net profit margin TTM (percent points, e.g. 22.05). */
  netMarginTtmPct: number | null;
  /** Net profit margin, latest FY (percent points). */
  netMarginFyPct: number | null;
  /** TTM net income (optional — enables operating vs net divergence check). */
  netIncomeTtm?: number | null;
  /** TTM operating income (optional). */
  operatingIncomeTtm?: number | null;
}

export interface EarningsQualityResult {
  /** True when TTM earnings look unusually rich vs FY (likely one-off). */
  suspect: boolean;
  /** Reasons for the flag (for logs / valuation notes). */
  reasons: string[];
}

/** TTM EPS at least this multiple of FY EPS → suspect. */
const EPS_RATIO_THRESHOLD = 1.45;
/** TTM net margin at least this multiple of FY → suspect. */
const MARGIN_RATIO_THRESHOLD = 1.45;
/** Absolute gap in margin points that reinforces a suspect flag. */
const MARGIN_GAP_PP = 6;
/** TTM net income above tax-adjusted operating by this ratio → suspect (≈20% gap). */
const NET_VS_OPERATING_THRESHOLD = 1.2;
/** Rough effective tax rate for net-vs-operating comparison. */
const EFFECTIVE_TAX_RATE = 0.19;

/**
 * Pure heuristic — no I/O. Missing inputs never force a suspect flag.
 */
export function evaluateEarningsQuality(
  input: EarningsQualityInput,
): EarningsQualityResult {
  const reasons: string[] = [];
  const {
    epsTtm,
    epsFy,
    netMarginTtmPct,
    netMarginFyPct,
    netIncomeTtm,
    operatingIncomeTtm,
  } = input;

  if (
    epsTtm != null &&
    epsFy != null &&
    epsFy > 0 &&
    Number.isFinite(epsTtm) &&
    Number.isFinite(epsFy) &&
    epsTtm / epsFy >= EPS_RATIO_THRESHOLD
  ) {
    reasons.push(
      `eps_ttm_vs_fy:${(epsTtm / epsFy).toFixed(2)}x`,
    );
  }

  if (
    netMarginTtmPct != null &&
    netMarginFyPct != null &&
    netMarginFyPct > 0 &&
    Number.isFinite(netMarginTtmPct) &&
    Number.isFinite(netMarginFyPct)
  ) {
    const ratio = netMarginTtmPct / netMarginFyPct;
    const gap = netMarginTtmPct - netMarginFyPct;
    if (ratio >= MARGIN_RATIO_THRESHOLD && gap >= MARGIN_GAP_PP) {
      reasons.push(`net_margin_ttm_vs_fy:${ratio.toFixed(2)}x`);
    }
  }

  if (
    netIncomeTtm != null &&
    operatingIncomeTtm != null &&
    operatingIncomeTtm > 0 &&
    netIncomeTtm > 0 &&
    Number.isFinite(netIncomeTtm) &&
    Number.isFinite(operatingIncomeTtm)
  ) {
    const taxAdjustedOperating = operatingIncomeTtm * (1 - EFFECTIVE_TAX_RATE);
    if (taxAdjustedOperating > 0) {
      const ratio = netIncomeTtm / taxAdjustedOperating;
      if (ratio >= NET_VS_OPERATING_THRESHOLD) {
        reasons.push(`net_vs_operating_ttm:${ratio.toFixed(2)}x`);
      }
    }
  }

  return { suspect: reasons.length > 0, reasons };
}

/**
 * Price / FY diluted EPS when both are usable. Used as a normalised multiple
 * when TTM earnings quality is suspect.
 */
export function computeNormalizedPe(
  price: number | null,
  epsFy: number | null,
): number | null {
  if (
    price == null ||
    epsFy == null ||
    !(price > 0) ||
    !(epsFy > 0) ||
    !Number.isFinite(price) ||
    !Number.isFinite(epsFy)
  ) {
    return null;
  }
  return price / epsFy;
}
