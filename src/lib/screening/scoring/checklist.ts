import { SCREENING_MAX_SCORE } from "@/lib/screening/criteria";

/**
 * Deterministic scoring for the 8-point screening methodology checklist.
 *
 * The compose layer calls this with everything it can gather at read time:
 *   - Hard Data enrichment (FMP fundamentals, MOAT cache)
 *   - IR agent output (catalysts) — powers criterion 3
 *   - Web/Sentiment output (insider bias) — powers criterion 6
 *   - Technicals output (MA200, distance-from-high, 1y return) — refines 9
 *
 * All rules must be evidence-based. When a signal is missing the criterion
 * stays `unknown` in the UI — never guess a pass or fail.
 */

export interface ChecklistScoringInputs {
  /** LLM ranking confidence (0-100). Fallback for criterion 9. */
  rankScore: number;
  /** Forward P/E from FMP (preferred for criterion 1). */
  fwdPe: number | null;
  /** TTM P/E from FMP (fallback for criterion 1). */
  ownHistPe: number | null;
  /**
   * P/E on latest FY diluted EPS (preferred when TTM earnings quality is
   * suspect).
   */
  normalizedPe?: number | null;
  /** True when TTM earnings look inflated vs FY (one-offs). */
  earningsQualitySuspect?: boolean | null;
  /** Net debt / EBITDA (criterion 5). */
  ndEbitda: number | null;
  /** Net cash flag (criterion 5). */
  netCash: boolean | null;
  /** trefolio MOAT score (criterion 7). */
  moatScorePct: number | null;
  /** Upside vs consensus target (criterion 2). */
  upsidePct: number | null;

  /* ── Phase 1 additions ── */

  /** IR agent — number of dated catalysts with evidence. */
  datedCatalystCount?: number | null;
  /** Web/Sentiment agent — insider net bias. */
  insiderBias?: "buying" | "selling" | "mixed" | "none" | null;
  /** Last 5y annual revenue growth (percent points, newest first). */
  revenueGrowthHistoryPct?: readonly number[] | null;

  /* ── Phase 2 additions (technicals) ── */

  /** True when price is at/above the 200d SMA. */
  aboveMa200?: boolean | null;
  /** 1y trailing return (percent points). */
  return1yPct?: number | null;
}

export interface ChecklistScoringResult {
  score: number;
  stepsPassed: number[];
  stepsFailed: number[];
  verdict: "fuerte" | "watch" | null;
  /** Deterministic verdict for criterion 4 — surfaced on the card. */
  earningsResilient: boolean | null;
}

/** Pass balance sheet when ND/EBITDA is below this (aligned with intake preset). */
export const ND_EBITDA_PASS_LT = 2.5;
/** Fail balance sheet when ND/EBITDA is at/above this. */
export const ND_EBITDA_FAIL_GTE = 2.5;

/** Strong candidate requires this many passed scored criteria. */
export const FUERTE_MIN_SCORE = 6;

/**
 * Evaluate the deterministic checklist. Always returns a fresh score.
 * Callers should overwrite any existing `stepsPassed/stepsFailed/score` fields
 * with the result so re-scoring at compose time is authoritative.
 */
export function scoreChecklist(
  input: ChecklistScoringInputs,
): ChecklistScoringResult {
  const passed: number[] = [];
  const failed: number[] = [];

  // 1 relativeValuation — usable PE only (normalised when TTM quality is bad)
  const valuation = evaluateRelativeValuation(input);
  if (valuation === "pass") passed.push(1);
  else if (valuation === "fail") failed.push(1);

  // 2 priceFundamentalsDivergence — upside + weak price + improving fundamentals
  const divergence = evaluatePriceFundamentalsDivergence(input);
  if (divergence === "pass") passed.push(2);
  else if (divergence === "fail") failed.push(2);

  // 3 datedCatalyst — from IR agent (>=1 catalyst with evidence)
  if (input.datedCatalystCount != null) {
    if (input.datedCatalystCount >= 1) passed.push(3);
    else failed.push(3);
  }

  // 4 earningsResilience — no severe revenue decline in the last cycle
  const earningsResilient = evaluateEarningsResilience(
    input.revenueGrowthHistoryPct ?? null,
  );
  if (earningsResilient === true) passed.push(4);
  else if (earningsResilient === false) failed.push(4);

  // 5 balanceSheetQuality — net cash or ND/EBITDA < 2.5; present leverage ≥2.5 fails
  const balance = evaluateBalanceSheet(input);
  if (balance === "pass") passed.push(5);
  else if (balance === "fail") failed.push(5);

  // 6 insiderAlignment — Web/Sentiment insider net bias
  if (input.insiderBias === "buying") passed.push(6);
  else if (input.insiderBias === "selling") failed.push(6);

  // 7 competitiveStructure — trefolio MOAT
  if (input.moatScorePct != null) {
    if (input.moatScorePct >= 55) passed.push(7);
    else if (input.moatScorePct < 40) failed.push(7);
  }

  // 9 marketSignal — prefer deterministic technicals; fall back to LLM rank
  const marketSignal = evaluateMarketSignal(input);
  if (marketSignal === "pass") passed.push(9);
  else if (marketSignal === "fail") failed.push(9);

  const score = Math.min(SCREENING_MAX_SCORE, passed.length);
  const verdict = deriveVerdict(score, input.moatScorePct ?? null);

  return {
    score,
    stepsPassed: passed,
    stepsFailed: failed,
    verdict,
    earningsResilient,
  };
}

/**
 * Pick the PE used for criterion 1 and decide pass/fail/unknown.
 *
 * - Prefer forward PE when present and earnings quality is fine.
 * - When TTM quality is suspect, score on normalised (FY) PE; if that is
 *   missing, fail rather than pass on a depressed TTM multiple.
 * - Absolute band remains 0 < PE < 18.
 */
export function evaluateRelativeValuation(
  input: ChecklistScoringInputs,
): "pass" | "fail" | "unknown" {
  const suspect = input.earningsQualitySuspect === true;
  let pe: number | null = null;

  if (suspect) {
    pe = input.normalizedPe ?? input.fwdPe ?? null;
    if (pe == null) {
      // Unusable TTM-only cheapness — do not award the valuation point.
      if (input.ownHistPe != null && input.ownHistPe > 0 && input.ownHistPe < 18) {
        return "fail";
      }
      if (input.ownHistPe != null) return "fail";
      return "unknown";
    }
  } else {
    pe = input.fwdPe ?? input.ownHistPe ?? input.normalizedPe ?? null;
  }

  if (pe == null) return "unknown";
  if (pe > 0 && pe < 18) return "pass";
  return "fail";
}

/**
 * Price–fundamentals divergence (criterion 2).
 *
 * Pass only when consensus upside is material (≥10%), the share has been weak
 * over 1y, and recent revenue growth is clearly improving — not flat.
 * Fail when upside is deeply negative, or when a "cheap vs target" story
 * coincides with a weak price and flat/deteriorating fundamentals.
 */
export function evaluatePriceFundamentalsDivergence(
  input: ChecklistScoringInputs,
): "pass" | "fail" | "unknown" {
  const upside = input.upsidePct;
  if (upside == null) return "unknown";
  if (upside < -5) return "fail";
  if (upside < 10) return "unknown";

  const return1y = input.return1yPct;
  const fundamentals = classifyFundamentalsTrend(
    input.revenueGrowthHistoryPct ?? null,
  );

  // Material upside but we cannot check price/fundamentals → unknown.
  if (return1y == null || fundamentals === "unknown") return "unknown";

  const priceWeak = return1y <= -10;
  if (priceWeak && fundamentals === "improving") return "pass";
  if (priceWeak && (fundamentals === "flat" || fundamentals === "worse")) {
    return "fail";
  }
  // Upside without price weakness is not a divergence signal.
  return "unknown";
}

export type FundamentalsTrend = "improving" | "flat" | "worse" | "unknown";

/**
 * Latest-year revenue growth (percent points) → coarse trend.
 * Improving requires the *latest* year ≥ 3% (older years alone cannot pass).
 * Worse: latest < −5% or mean < −2%.
 * Flat: otherwise (including ~0–2% stagnation with a soft history).
 */
export function classifyFundamentalsTrend(
  history: readonly number[] | null,
): FundamentalsTrend {
  if (!history || history.length === 0) return "unknown";
  const finite = history.filter((n) => Number.isFinite(n));
  if (finite.length === 0) return "unknown";
  const latest = finite[0]!;
  const mean = finite.reduce((a, b) => a + b, 0) / finite.length;
  if (latest >= 3) return "improving";
  if (latest < -5 || mean < -2) return "worse";
  return "flat";
}

export function evaluateBalanceSheet(
  input: Pick<ChecklistScoringInputs, "netCash" | "ndEbitda">,
): "pass" | "fail" | "unknown" {
  if (input.netCash === true) return "pass";
  if (input.ndEbitda == null) return "unknown";
  if (input.ndEbitda < ND_EBITDA_PASS_LT) return "pass";
  if (input.ndEbitda >= ND_EBITDA_FAIL_GTE) return "fail";
  return "unknown";
}

/**
 * Deterministic earnings-resilience verdict from ≥3y of revenue growth.
 * Pass when no year in the window fell below −10% AND the mean is non-negative.
 * Fail when any year fell below −15% (real cyclical drawdown).
 * Unknown when we have less than 3 years of data.
 */
export function evaluateEarningsResilience(
  history: readonly number[] | null,
): boolean | null {
  if (!history || history.length < 3) return null;
  const finite = history.filter((n) => Number.isFinite(n));
  if (finite.length < 3) return null;
  const min = Math.min(...finite);
  if (min < -15) return false;
  const mean = finite.reduce((a, b) => a + b, 0) / finite.length;
  if (min >= -10 && mean >= 0) return true;
  return false;
}

function evaluateMarketSignal(
  input: ChecklistScoringInputs,
): "pass" | "fail" | "unknown" {
  const { aboveMa200, return1yPct } = input;
  const hasTechnicals = aboveMa200 != null && return1yPct != null;
  if (hasTechnicals) {
    if (aboveMa200 === true && (return1yPct as number) >= 0) return "pass";
    if (aboveMa200 === false && (return1yPct as number) <= -20) return "fail";
    // Otherwise fall through to LLM rank for a softer signal.
  }
  if (input.rankScore >= 70) return "pass";
  if (input.rankScore < 45) return "fail";
  return "unknown";
}

export function deriveVerdict(
  score: number,
  moatScorePct: number | null,
): "fuerte" | "watch" | null {
  if (
    score >= FUERTE_MIN_SCORE &&
    (moatScorePct == null || moatScorePct >= 50)
  ) {
    return "fuerte";
  }
  if (score > 0) return "watch";
  return null;
}
