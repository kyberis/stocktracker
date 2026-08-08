import { describe, expect, it } from "vitest";

import type { QaEvaluationContext } from "../types";
import { r5SourceConflict } from "../r5-source-conflict";

function ctxFor(irPct: number, webPct: number): QaEvaluationContext {
  return {
    runId: "r",
    hardData: null,
    irAggregate: {
      tickers: [
        {
          ticker: "AAPL",
          businessOneLiner: "consumer tech",
          guidance: {
            summary: `Revenue growth ${irPct}% year on year`,
            direction: "up",
            asOf: "2026-01",
            sources: [],
          },
          catalysts: [],
          segments: [],
          contradictionWithHardData: false,
          confidence: "medium",
          bullets: ["b"],
          gaps: [],
        },
      ],
      generatedAt: "2026-01-01",
    },
    webAggregate: {
      tickers: [
        {
          ticker: "AAPL",
          signals: [],
          insiderSummary: { netBias: "none", notes: "n", sources: [] },
          sentimentSummary: `Recent commentary cites ${webPct}% growth`,
          gaps: [],
        },
      ],
      generatedAt: "2026-01-01",
    },
    technicalsAggregate: null,
    portfolioContext: null,
    risk: null,
    compilerDraft: null,
    report: null,
  };
}

describe("r5SourceConflict", () => {
  it("passes when IR and Web agree within 20%", () => {
    expect(r5SourceConflict(ctxFor(10, 11))).toEqual([]);
  });

  it("flags when IR and Web disagree by more than 20%", () => {
    const issues = r5SourceConflict(ctxFor(10, 30));
    expect(issues).toHaveLength(1);
    expect(issues[0].issueType).toBe("cross_agent_inconsistency");
  });
});
