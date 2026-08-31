import { SCREENING_MAX_SCORE } from "@/lib/screening/criteria";
import {
  epsCagrPctFromSeries,
  marginDeltaFromSeries,
  scoreAttractiveness,
  type AttractivenessInputs,
} from "@/lib/screening/attractiveness";

/**
 * Deterministic scoring for the 8-point attractiveness checklist.
 * When a signal is missing the criterion stays unknown — never guess.
 */

export interface ChecklistScoringInputs {
  /** @deprecated Unused — kept for call-site compatibility. */
  rankScore?: number;
  fwdPe: number | null;
  ownHistPe: number | null;
  normalizedPe?: number | null;
  earningsQualitySuspect?: boolean | null;
  histPeAvg?: number | null;
  peerPe?: number | null;
  ndEbitda: number | null;
  netCash: boolean | null;
  interestCoverage?: number | null;
  moatScorePct: number | null;
  upsidePct?: number | null;
  datedCatalystCount?: number | null;
  insiderBias?: "buying" | "selling" | "mixed" | "none" | null;
  revenueGrowthHistoryPct?: readonly number[] | null;
  aboveMa200?: boolean | null;
  return1yPct?: number | null;
  annualSeries?: ReadonlyArray<{
    year?: number | null;
    eps?: number | null;
    operatingMarginPct?: number | null;
    netMarginPct?: number | null;
  }> | null;
  buyback?: boolean | null;
  severeDilution?: boolean | null;
  shareCountCagrPct?: number | null;
  priceToBook?: number | null;
  sector?: string | null;
  industry?: string | null;
  epsCagrPct?: number | null;
}

export interface ChecklistScoringResult {
  score: number;
  stepsPassed: number[];
  stepsFailed: number[];
  verdict: "fuerte" | "watch" | null;
  /** @deprecated Prefer margin / EPS checks; kept for card field. */
  earningsResilient: boolean | null;
}

export const ND_EBITDA_PASS_LT = 2.5;
export const ND_EBITDA_FAIL_GTE = 3.5;
export const FUERTE_MIN_SCORE = 6;

export function scoreChecklist(
  input: ChecklistScoringInputs,
): ChecklistScoringResult {
  const peCurrent =
    input.fwdPe ?? input.normalizedPe ?? input.ownHistPe ?? null;
  const margins = marginDeltaFromSeries(input.annualSeries ?? []);
  const epsCagr =
    input.epsCagrPct ?? epsCagrPctFromSeries(input.annualSeries ?? []);

  const attrs: AttractivenessInputs = {
    peCurrent,
    histPeAvg: input.histPeAvg ?? input.ownHistPe ?? null,
    peerPe: input.peerPe ?? null,
    epsCagrPct: epsCagr,
    opMarginDeltaPp: margins.opMarginDeltaPp,
    netMarginDeltaPp: margins.netMarginDeltaPp,
    marginYears: margins.marginYears,
    ndEbitda: input.ndEbitda,
    netCash: input.netCash,
    interestCoverage: input.interestCoverage ?? null,
    moatScorePct: input.moatScorePct,
    shareCountCagrPct: input.shareCountCagrPct ?? null,
    buyback: input.buyback ?? null,
    severeDilution: input.severeDilution ?? null,
    priceToBook: input.priceToBook ?? null,
    sector: input.sector ?? null,
    industry: input.industry ?? null,
  };

  const scored = scoreAttractiveness(attrs);
  const score = Math.min(SCREENING_MAX_SCORE, scored.passedIds.length);
  const verdict = deriveVerdict(score, input.moatScorePct ?? null);

  return {
    score,
    stepsPassed: scored.passedIds,
    stepsFailed: scored.failedIds,
    verdict,
    earningsResilient:
      scored.checks.find((c) => c.id === "eps_growth")?.status === "pass"
        ? true
        : scored.checks.find((c) => c.id === "eps_growth")?.status === "fail"
          ? false
          : null,
  };
}

/** @deprecated Absolute PE band — attractiveness now uses hist/peer + Graham. */
export function evaluateRelativeValuation(
  input: ChecklistScoringInputs,
): "pass" | "fail" | "unknown" {
  const r = scoreChecklist(input);
  if (r.stepsPassed.includes(1)) return "pass";
  if (r.stepsFailed.includes(1)) return "fail";
  return "unknown";
}

/** @deprecated Replaced by EPS growth + margins. */
export function evaluatePriceFundamentalsDivergence(
  _input: ChecklistScoringInputs,
): "pass" | "fail" | "unknown" {
  return "unknown";
}

export type FundamentalsTrend = "improving" | "flat" | "worse" | "unknown";

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
