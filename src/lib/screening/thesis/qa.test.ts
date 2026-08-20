import { describe, expect, it } from "vitest";
import { collectThesisQaIssues } from "./qa";
import { scoreThesisAssessment } from "./score-assessment";
import type { ThesisFact, ThesisSoftAssessment } from "./schemas";

function fact(field_id: ThesisFact["field_id"], value: ThesisFact["value"]): ThesisFact {
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

describe("collectThesisQaIssues", () => {
  it("blocks a soft score without a quote and does not auto-kill disputed facts", () => {
    const facts: ThesisFact[] = [
      { ...fact("EQ:D1", 1.1), disputed: true },
      fact("EQ:E1", 0.4),
    ];
    const soft: ThesisSoftAssessment[] = [
      {
        asset_id: "AAPL",
        field_id: "EQ:A1",
        score: 4,
        confidence: "medium",
        evidence: [],
        disconfirming_evidence: [],
        assessed_at: "2026-08-19T00:00:00.000Z",
        assessed_by: "test",
      },
    ];
    const assessment = scoreThesisAssessment({ facts, soft: [] });
    const { issues, degraded } = collectThesisQaIssues({
      evaluations: [
        {
          ticker: "AAPL",
          companyName: "Apple",
          assessment,
          thesis_draft: {
            ticker: "AAPL",
            statement:
              "I believe published cash conversion can hold for 36 months if leverage stays contained.",
            variant_perception: {
              consensus_view: "Gap",
              our_view: "Facts only",
              why_mispricing_persists: "No measured consensus.",
            },
            horizon_months: 36,
            conviction: 2,
            kill_criteria: [
              {
                metric_field_id: "EQ:D1",
                operator: "<",
                threshold: 0.6,
                action: "review",
              },
            ],
            premortem:
              "It is 2029 and this name is down 50 percent because cash conversion broke.",
            scenarios: [],
            key_risks: [],
            status: "draft",
            gaps: [],
            disclaimer: "Informational.",
          },
        },
      ],
      facts,
      soft,
    });
    expect(issues.some((i) => i.ruleId === "T-SOFT" && i.blocking)).toBe(true);
    expect(issues.some((i) => i.summary.toLowerCase().includes("disputed"))).toBe(
      false,
    );
    expect(degraded).toContain("AAPL");
  });

  it("blocks estimated facts that omit estimation_method", () => {
    const facts: ThesisFact[] = [
      {
        ...fact("EQ:D1", 0.9),
        method: "estimated",
        estimation_method: undefined,
      },
    ];
    const { issues } = collectThesisQaIssues({
      evaluations: [],
      facts,
      soft: [],
    });
    expect(issues.some((i) => i.ruleId === "T-EST" && i.blocking)).toBe(true);
  });
});
