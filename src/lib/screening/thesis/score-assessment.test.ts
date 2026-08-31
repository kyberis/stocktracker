import { describe, expect, it } from "vitest";
import {
  maxConvictionForAssessment,
  scoreThesisAssessment,
} from "./score-assessment";
import type { ThesisFact } from "./schemas";
import { thesisSoftAssessmentSchema } from "./schemas";

function fact(
  field_id: ThesisFact["field_id"],
  value: ThesisFact["value"],
): ThesisFact {
  return {
    asset_id: "AAPL",
    field_id,
    value,
    as_of: "2026-08-19T00:00:00.000Z",
    source: {
      type: "fmp",
      ref: "ratios-ttm",
      retrieved_at: "2026-08-19T00:00:00.000Z",
    },
    method: "derived",
  };
}

describe("scoreThesisAssessment", () => {
  it("fails balance_sheet and caps conviction when leverage is high", () => {
    const assessment = scoreThesisAssessment({
      facts: [
        fact("calc:pe_current", 18),
        fact("calc:hist_pe_avg", 20),
        fact("calc:eps_cagr", 0.1),
        fact("EQ:E1", 5.2),
        fact("EQ:E2", 1.5),
        fact("EQ:D7", 0),
        fact("calc:moat_score_pct", 60),
      ],
      soft: [],
      sector: "Technology",
      industry: "Software",
    });
    expect(
      assessment.gates.find((g) => g.field_id === "balance_sheet")?.passed,
    ).toBe(false);
    expect(assessment.verdict).toBe("watchlist_gate_failed");
    expect(maxConvictionForAssessment(assessment)).toBe(2);
  });

  it("rejects a scored soft assessment without a quote at the schema layer", () => {
    const parsed = thesisSoftAssessmentSchema.safeParse({
      asset_id: "AAPL",
      field_id: "EQ:A1",
      score: 4,
      confidence: "high",
      evidence: [],
      assessed_at: "2026-08-19T00:00:00.000Z",
      assessed_by: "llm:test",
    });
    expect(parsed.success).toBe(false);
  });

  it("allows insufficient_evidence with a null score", () => {
    const parsed = thesisSoftAssessmentSchema.safeParse({
      asset_id: "AAPL",
      field_id: "EQ:A1",
      score: null,
      confidence: "insufficient_evidence",
      evidence: [],
      assessed_at: "2026-08-19T00:00:00.000Z",
      assessed_by: "llm:test",
    });
    expect(parsed.success).toBe(true);
  });
});
