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

  // 1 relativeValuation — prefer forward PE, fall back to TTM
  const pe = input.fwdPe ?? input.ownHistPe;
  if (pe != null) {
    if (pe > 0 && pe < 18) passed.push(1);
    else failed.push(1);
  }

  // 2 priceFundamentalsDivergence — upside vs consensus
  if (input.upsidePct != null) {
    if (input.upsidePct >= 10) passed.push(2);
    else if (input.upsidePct < -5) failed.push(2);
  }

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

  // 5 balanceSheetQuality — net cash or modest ND/EBITDA
  if (input.netCash === true || (input.ndEbitda != null && input.ndEbitda < 2)) {
    passed.push(5);
  } else if (input.ndEbitda != null && input.ndEbitda >= 4) {
    failed.push(5);
  }

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

function deriveVerdict(
  score: number,
  moatScorePct: number | null,
): "fuerte" | "watch" | null {
  if (score >= 5 && (moatScorePct == null || moatScorePct >= 50)) return "fuerte";
  if (score > 0) return "watch";
  return null;
}
