/**
 * Canonical registry of the trefolio attractiveness checklist (8 scored checks).
 * Reports persist numeric ids. UI resolves them via copy.criteria.labels.
 */

export type ScreeningPillar =
  | "quality"
  | "financial_strength"
  | "valuation"
  | "growth"
  | "capital"
  | "context";

export type ScreeningCriterion = {
  id: number;
  key: string;
  pillar: ScreeningPillar;
  /** Context criteria are informative and never add to the score. */
  scored: boolean;
};

export const SCREENING_CRITERIA: readonly ScreeningCriterion[] = [
  { id: 1, key: "peVsHistory", pillar: "valuation", scored: true },
  { id: 2, key: "epsGrowth", pillar: "growth", scored: true },
  { id: 3, key: "marginTrend", pillar: "quality", scored: true },
  { id: 4, key: "grahamRule", pillar: "valuation", scored: true },
  { id: 5, key: "balanceSheetQuality", pillar: "financial_strength", scored: true },
  { id: 6, key: "moat", pillar: "quality", scored: true },
  { id: 7, key: "capitalAllocation", pillar: "capital", scored: true },
  { id: 8, key: "priceToBook", pillar: "valuation", scored: true },
] as const;

/** Max achievable score. */
export const SCREENING_MAX_SCORE = SCREENING_CRITERIA.filter((c) => c.scored).length;

export type CriterionStatus = "pass" | "fail" | "not_scored" | "unknown";

export function criterionStatus(
  criterion: ScreeningCriterion,
  passed: readonly number[],
  failed: readonly number[],
): CriterionStatus {
  if (!criterion.scored) return "not_scored";
  if (passed.includes(criterion.id)) return "pass";
  if (failed.includes(criterion.id)) return "fail";
  return "unknown";
}
