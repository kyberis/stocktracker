import { THESIS_RULESET_VERSION } from "@/lib/screening/thesis/schemas";
import type {
  ThesisAssessment,
  ThesisFact,
  ThesisSoftAssessment,
  ThesisVerdict,
} from "@/lib/screening/thesis/schemas";
import {
  grahamFairPe,
  scoreAttractiveness,
  type AttractivenessInputs,
} from "@/lib/screening/attractiveness";

function factValue(facts: ThesisFact[], fieldId: string): unknown {
  const row = facts.find((f) => f.field_id === fieldId);
  return row?.value ?? null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

export interface ScoreThesisAssessmentInput {
  facts: ThesisFact[];
  soft: ThesisSoftAssessment[];
  now?: string;
  sector?: string | null;
  industry?: string | null;
}

function inputsFromFacts(
  facts: ThesisFact[],
  opts: { sector?: string | null; industry?: string | null },
): AttractivenessInputs {
  const peCurrent =
    asNumber(factValue(facts, "calc:pe_current")) ??
    asNumber(factValue(facts, "calc:fwd_pe"));
  const histPe = asNumber(factValue(facts, "calc:hist_pe_avg"));
  const peerPe = asNumber(factValue(facts, "calc:peer_pe"));
  const epsCagr =
    asNumber(factValue(facts, "calc:eps_cagr")) != null
      ? (asNumber(factValue(facts, "calc:eps_cagr"))! <= 2
          ? asNumber(factValue(facts, "calc:eps_cagr"))! * 100
          : asNumber(factValue(facts, "calc:eps_cagr")))
      : null;
  const shareCagrRaw = asNumber(factValue(facts, "EQ:D7"));
  const shareCagrPct =
    shareCagrRaw == null
      ? null
      : Math.abs(shareCagrRaw) <= 2
        ? shareCagrRaw * 100
        : shareCagrRaw;

  return {
    peCurrent,
    histPeAvg: histPe,
    peerPe,
    epsCagrPct: epsCagr,
    opMarginDeltaPp: asNumber(factValue(facts, "calc:op_margin_delta_pp")),
    netMarginDeltaPp: asNumber(factValue(facts, "calc:net_margin_delta_pp")),
    marginYears: asNumber(factValue(facts, "calc:margin_years")),
    ndEbitda: asNumber(factValue(facts, "EQ:E1")),
    netCash: asBool(factValue(facts, "calc:net_cash")),
    interestCoverage: asNumber(factValue(facts, "EQ:E2")),
    moatScorePct: asNumber(factValue(facts, "calc:moat_score_pct")),
    shareCountCagrPct: shareCagrPct,
    buyback: asBool(factValue(facts, "calc:buyback")),
    severeDilution: (() => {
      const d7 = factValue(facts, "EQ:D7");
      if (d7 === true) return true;
      if (typeof d7 === "number" && d7 > 0.03 && Math.abs(d7) <= 2) return true;
      if (typeof d7 === "number" && d7 > 3) return true;
      return asBool(factValue(facts, "calc:severe_dilution"));
    })(),
    priceToBook: asNumber(factValue(facts, "calc:price_to_book")),
    sector: opts.sector ?? null,
    industry: opts.industry ?? null,
  };
}

/**
 * Pure assessment from the attractiveness checklist.
 * Gates map 1:1 to the eight checks. LLM must not compute this.
 */
export function scoreThesisAssessment(
  input: ScoreThesisAssessmentInput,
): ThesisAssessment {
  const computed_at = input.now ?? new Date().toISOString();
  const attrs = inputsFromFacts(input.facts, {
    sector: input.sector,
    industry: input.industry,
  });
  // Soft moat fallback when FMP moat missing
  if (attrs.moatScorePct == null) {
    const b7 = input.soft.find((s) => s.field_id === "EQ:B7");
    if (b7?.score != null) {
      attrs.moatScorePct = b7.score * 20;
    }
  }

  const scored = scoreAttractiveness(attrs);
  const fair = grahamFairPe(attrs.epsCagrPct);

  const gates: ThesisAssessment["gates"] = scored.checks.map((c) => ({
    field_id: c.id,
    passed:
      c.status === "skipped"
        ? null
        : c.status === "pass"
          ? true
          : c.status === "fail"
            ? false
            : null,
    value:
      c.id === "graham_rule"
        ? fair
        : c.id === "pe_vs_history"
          ? attrs.peCurrent
          : c.id === "eps_growth"
            ? attrs.epsCagrPct
            : c.id === "balance_sheet"
              ? attrs.ndEbitda
              : c.id === "moat"
                ? attrs.moatScorePct
                : c.id === "capital_allocation"
                  ? attrs.shareCountCagrPct
                  : c.id === "price_to_book"
                    ? attrs.priceToBook
                    : c.id === "margin_trend"
                      ? attrs.opMarginDeltaPp ?? attrs.netMarginDeltaPp
                      : null,
    threshold:
      c.id === "graham_rule"
        ? fair ?? undefined
        : c.id === "balance_sheet"
          ? 2.5
          : undefined,
    note: c.note,
  }));

  const gateFailed = scored.failedIds.length > 0;
  const passCount = scored.passedIds.length;
  const failCount = scored.failedIds.length;

  // Map pillar_scores for backward-compatible schema consumers
  const pillar_scores = {
    business_quality: scoreFromStatus(
      scored.checks.find((c) => c.id === "moat")?.status,
    ),
    growth: scoreFromStatus(
      scored.checks.find((c) => c.id === "eps_growth")?.status,
    ),
    earnings_quality: scoreFromStatus(
      scored.checks.find((c) => c.id === "margin_trend")?.status,
    ),
    balance_sheet: scoreFromStatus(
      scored.checks.find((c) => c.id === "balance_sheet")?.status,
    ),
    capital_allocation: scoreFromStatus(
      scored.checks.find((c) => c.id === "capital_allocation")?.status,
    ),
    valuation: avgNullable([
      scoreFromStatus(
        scored.checks.find((c) => c.id === "pe_vs_history")?.status,
      ),
      scoreFromStatus(
        scored.checks.find((c) => c.id === "graham_rule")?.status,
      ),
    ]),
  };

  let verdict: ThesisVerdict;
  if (scored.coveragePct < 40 || scored.total == null) {
    verdict = "insufficient_data";
  } else if (gateFailed && failCount >= 3) {
    verdict = "deteriorating";
  } else if (gateFailed) {
    verdict = "watchlist_gate_failed";
  } else if (
    scored.total >= 70 &&
    (pillar_scores.valuation ?? 0) >= 60
  ) {
    verdict = "high_quality_attractively_priced";
  } else if (scored.total >= 70) {
    verdict = "high_quality_richly_priced";
  } else if ((pillar_scores.growth ?? 0) >= 60) {
    verdict = "improving_fundamentals";
  } else if ((pillar_scores.valuation ?? 0) >= 65) {
    verdict = "value_with_open_questions";
  } else if (scored.total < 40) {
    verdict = "deteriorating";
  } else {
    verdict = "value_with_open_questions";
  }

  void passCount;

  return {
    ruleset_version: THESIS_RULESET_VERSION,
    gates,
    pillar_scores,
    penalties: [],
    total: scored.total,
    verdict,
    stale: false,
    coverage_pct: scored.coveragePct,
    computed_at,
  };
}

function scoreFromStatus(
  status: "pass" | "fail" | "unknown" | "skipped" | undefined,
): number | null {
  if (status === "pass") return 100;
  if (status === "fail") return 0;
  if (status === "unknown" || status === "skipped" || status == null) return null;
  return null;
}

function avgNullable(vals: Array<number | null>): number | null {
  const n = vals.filter((v): v is number => v != null);
  if (n.length === 0) return null;
  return n.reduce((a, b) => a + b, 0) / n.length;
}

export function maxConvictionForAssessment(assessment: ThesisAssessment): number {
  if (assessment.verdict === "watchlist_gate_failed") return 2;
  if (assessment.verdict === "insufficient_data") return 2;
  if (assessment.verdict === "deteriorating") return 2;
  return 5;
}
