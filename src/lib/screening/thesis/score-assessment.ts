import { THESIS_RULESET_VERSION } from "@/lib/screening/thesis/schemas";
import type {
  ThesisAssessment,
  ThesisFact,
  ThesisSoftAssessment,
  ThesisVerdict,
} from "@/lib/screening/thesis/schemas";

function factValue(facts: ThesisFact[], fieldId: string): unknown {
  const row = facts.find((f) => f.field_id === fieldId);
  return row?.value ?? null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function scoreRatioPass(
  value: number | null,
  good: number,
  bad: number,
  invert = false,
): number | null {
  if (value == null) return null;
  if (!invert) {
    if (value >= good) return 100;
    if (value <= bad) return 0;
    return clamp(((value - bad) / (good - bad)) * 100, 0, 100);
  }
  if (value <= good) return 100;
  if (value >= bad) return 0;
  return clamp(((bad - value) / (bad - good)) * 100, 0, 100);
}

export interface ScoreThesisAssessmentInput {
  facts: ThesisFact[];
  soft: ThesisSoftAssessment[];
  now?: string;
}

/**
 * Pure assessment: gates + pillars + penalties from Facts / SoftAssessments.
 * The LLM must not compute this.
 */
export function scoreThesisAssessment(
  input: ScoreThesisAssessmentInput,
): ThesisAssessment {
  const computed_at = input.now ?? new Date().toISOString();
  const fcfNi = asNumber(factValue(input.facts, "EQ:D1"));
  const ndEbitda = asNumber(factValue(input.facts, "EQ:E1"));
  const coverage = asNumber(factValue(input.facts, "EQ:E2"));
  const d7 = factValue(input.facts, "EQ:D7");
  const roic = asNumber(factValue(input.facts, "EQ:B1"));
  const cagr = asNumber(factValue(input.facts, "EQ:C1"));
  const moat = asNumber(factValue(input.facts, "calc:moat_score_pct"));
  const fwdPe = asNumber(factValue(input.facts, "calc:fwd_pe"));
  const histPe = asNumber(factValue(input.facts, "calc:hist_pe_avg"));
  const fcfYield = asNumber(factValue(input.facts, "calc:fcf_yield"));

  const a1 = input.soft.find((s) => s.field_id === "EQ:A1");
  const a1Passed =
    a1 == null || a1.confidence === "insufficient_evidence"
      ? null
      : a1.score != null && a1.score >= 3;

  const dilutionFail =
    d7 === true || (typeof d7 === "number" && d7 > 0.03);

  const gates: ThesisAssessment["gates"] = [
    {
      field_id: "EQ:A1",
      passed: a1Passed,
      value: a1?.score ?? null,
      note: a1Passed === false ? "Business not explainable from evidence" : undefined,
    },
    {
      field_id: "EQ:D1",
      passed: fcfNi == null ? null : fcfNi >= 0.8 ? true : fcfNi < 0.6 ? false : true,
      value: fcfNi,
      threshold: 0.8,
    },
    {
      field_id: "EQ:E1",
      passed: ndEbitda == null ? null : ndEbitda < 3,
      value: ndEbitda,
      threshold: 3,
    },
    {
      field_id: "EQ:E2",
      passed: coverage == null ? null : coverage > 4,
      value: coverage,
      threshold: 4,
    },
    {
      field_id: "EQ:D7",
      passed: d7 == null ? null : !dilutionFail,
      value: typeof d7 === "number" || typeof d7 === "boolean" ? d7 : null,
    },
  ];

  const gateFailed = gates.some((g) => g.passed === false);
  const known = gates.filter((g) => g.passed != null);
  const coveragePct = (known.length / gates.length) * 100;

  const penalties: ThesisAssessment["penalties"] = [];
  if (fcfNi != null && fcfNi < 0.6) {
    penalties.push({ flag: "fcf_ni_below_0_6", points: -10 });
  }
  if (dilutionFail) {
    penalties.push({ flag: "dilution_gt_3pct", points: -8 });
  }

  // Prefer computed ROIC (EQ:B1). MOAT cache is a fallback pillar input, not a verdict.
  const business_quality = scoreRatioPass(roic, 15, 5) ?? moat;
  const growth = scoreRatioPass(cagr != null ? cagr * 100 : null, 12, 0);
  const earnings_quality = scoreRatioPass(fcfNi, 1, 0.4);
  const balance_sheet = scoreRatioPass(ndEbitda, 1, 4, true);
  const capital_allocation =
    d7 == null ? null : dilutionFail ? 30 : 70;
  const valuation =
    fwdPe != null && histPe != null && histPe > 0
      ? scoreRatioPass(fwdPe / histPe, 0.85, 1.25, true)
      : scoreRatioPass(fcfYield != null ? fcfYield * 100 : null, 6, 1);

  const pillarVals = [
    business_quality,
    growth,
    earnings_quality,
    balance_sheet,
    capital_allocation,
    valuation,
  ].filter((v): v is number => v != null);
  const penaltySum = penalties.reduce((a, p) => a + p.points, 0);
  const rawTotal =
    pillarVals.length === 0
      ? null
      : clamp(
          pillarVals.reduce((a, b) => a + b, 0) / pillarVals.length + penaltySum,
          0,
          100,
        );

  let verdict: ThesisVerdict;
  if (gateFailed) verdict = "watchlist_gate_failed";
  else if (coveragePct < 40 || rawTotal == null) verdict = "insufficient_data";
  else if (rawTotal >= 70 && (valuation ?? 50) >= 60) {
    verdict = "high_quality_attractively_priced";
  } else if (rawTotal >= 70) verdict = "high_quality_richly_priced";
  else if ((growth ?? 0) >= 60 && (business_quality ?? 0) >= 50) {
    verdict = "improving_fundamentals";
  } else if ((valuation ?? 0) >= 65) verdict = "value_with_open_questions";
  else if (rawTotal < 40) verdict = "deteriorating";
  else verdict = "value_with_open_questions";

  return {
    ruleset_version: THESIS_RULESET_VERSION,
    gates,
    pillar_scores: {
      business_quality,
      growth,
      earnings_quality,
      balance_sheet,
      capital_allocation,
      valuation,
    },
    penalties,
    total: rawTotal,
    verdict,
    stale: false,
    coverage_pct: coveragePct,
    computed_at,
  };
}

export function maxConvictionForAssessment(assessment: ThesisAssessment): number {
  if (assessment.verdict === "watchlist_gate_failed") return 2;
  if (assessment.verdict === "insufficient_data") return 2;
  if (assessment.verdict === "deteriorating") return 2;
  return 5;
}
