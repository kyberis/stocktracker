/**
 * Canonical registry of the trefolio screening criteria.
 *
 * Reports persist numeric ids (compact, stable, locale-independent). The UI must
 * always resolve them to a name plus what the criterion measures — a bare digit
 * tells the reader nothing, and the score denominator (8, not 9) is only
 * explainable if `scored: false` is visible.
 */

export type ScreeningPillar =
  | "quality"
  | "financial_strength"
  | "valuation"
  | "divergence"
  | "alignment"
  | "context";

export type ScreeningCriterion = {
  id: number;
  key: string;
  pillar: ScreeningPillar;
  /** Context criteria are informative and never add to the score. */
  scored: boolean;
};

export const SCREENING_CRITERIA: readonly ScreeningCriterion[] = [
  { id: 1, key: "relativeValuation", pillar: "valuation", scored: true },
  { id: 2, key: "priceFundamentalsDivergence", pillar: "divergence", scored: true },
  { id: 3, key: "datedCatalyst", pillar: "divergence", scored: true },
  { id: 4, key: "earningsResilience", pillar: "quality", scored: true },
  { id: 5, key: "balanceSheetQuality", pillar: "financial_strength", scored: true },
  { id: 6, key: "insiderAlignment", pillar: "alignment", scored: true },
  { id: 7, key: "competitiveStructure", pillar: "quality", scored: true },
  { id: 8, key: "macroContext", pillar: "context", scored: false },
  { id: 9, key: "marketSignal", pillar: "alignment", scored: true },
] as const;

/** Max achievable score: context criteria do not count. */
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
