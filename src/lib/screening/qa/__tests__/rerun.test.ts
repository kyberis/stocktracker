import { describe, expect, it } from "vitest";

import { MAX_QA_ROUNDS, planReruns } from "../rerun";
import type { QaOutput } from "@/lib/screening/schemas";

function makeQa(partial: Partial<QaOutput> = {}): QaOutput {
  return {
    verdict: "fail",
    roundNumber: 1,
    issues: [],
    flaggedAgentKinds: [],
    degradedTickers: [],
    generatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("planReruns", () => {
  it("returns canRun=false when there are no blocking issues", () => {
    const plan = planReruns({
      qaOutput: makeQa({ verdict: "pass", issues: [] }),
      priorRounds: 0,
    });
    expect(plan.canRun).toBe(false);
    expect(plan.steps).toHaveLength(0);
    expect(plan.degradedTickers).toHaveLength(0);
  });

  it("degrades tickers when priorRounds >= MAX_QA_ROUNDS", () => {
    const plan = planReruns({
      qaOutput: makeQa({
        issues: [
          {
            issueType: "quant_mismatch",
            ruleId: "R4",
            agentKind: "hard_data",
            ticker: "AAPL",
            claimPath: "multiples.fwdPe",
            expectedValue: "25.0",
            actualValue: "12.3",
            summary: "P/E mismatch",
            blocking: true,
          },
        ],
      }),
      priorRounds: MAX_QA_ROUNDS,
    });
    expect(plan.canRun).toBe(false);
    expect(plan.degradedTickers).toEqual(["AAPL"]);
    expect(plan.steps).toHaveLength(0);
  });

  it("plans per-ticker + aggregate + compiler + qa steps for round 2", () => {
    const plan = planReruns({
      qaOutput: makeQa({
        issues: [
          {
            issueType: "quant_mismatch",
            ruleId: "R4",
            agentKind: "ir_business",
            ticker: "AAPL",
            claimPath: "guidance",
            expectedValue: null,
            actualValue: null,
            summary: "IR gap",
            blocking: true,
          },
          {
            issueType: "unconfirmed_source",
            ruleId: "R10",
            agentKind: "web_sentiment",
            ticker: "AAPL",
            claimPath: "signals",
            expectedValue: null,
            actualValue: null,
            summary: "no source",
            blocking: true,
          },
        ],
      }),
      priorRounds: 1,
    });
    expect(plan.canRun).toBe(true);
    const kinds = plan.steps.map((s) => s.agentKind);
    expect(kinds).toContain("ir_business");
    expect(kinds).toContain("web_sentiment");
    expect(kinds).toContain("aggregate_ir_business");
    expect(kinds).toContain("aggregate_web_sentiment");
    expect(kinds).toContain("compiler");
    expect(kinds).toContain("qa");
    const qaStep = plan.steps[plan.steps.length - 1];
    expect(qaStep.agentKind).toBe("qa");
    // qa depends on compiler
    const compiler = plan.steps.find((s) => s.agentKind === "compiler");
    expect(qaStep.dependsOn).toEqual([compiler!.id]);
  });

  it("still schedules a fresh compiler + qa when only compiler issues are flagged", () => {
    const plan = planReruns({
      qaOutput: makeQa({
        issues: [
          {
            issueType: "rule_violation",
            ruleId: "R2",
            agentKind: "compiler",
            ticker: null,
            claimPath: "summary",
            expectedValue: null,
            actualValue: null,
            summary: "noise leaked",
            blocking: true,
          },
        ],
      }),
      priorRounds: 1,
    });
    expect(plan.canRun).toBe(true);
    const kinds = plan.steps.map((s) => s.agentKind);
    // No per-ticker agents scheduled
    expect(kinds.filter((k) => k === "ir_business")).toHaveLength(0);
    // But compiler + qa still queued so the LLM can rewrite with the hint.
    expect(kinds).toEqual(["compiler", "qa"]);
  });
});
