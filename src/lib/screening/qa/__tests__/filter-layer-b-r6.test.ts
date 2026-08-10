import { describe, expect, it } from "vitest";
import {
  filterSpuriousLayerBR6Issues,
  filterSpuriousR6IssuesForDisplay,
} from "@/lib/screening/qa/filter-layer-b-r6";
import type { AggregateIrBusinessOutput, QaIssue } from "@/lib/screening/schemas";

const now = new Date("2026-08-10T12:00:00.000Z");

function r6Issue(overrides: Partial<QaIssue> = {}): QaIssue {
  return {
    issueType: "unconfirmed_source",
    ruleId: "R6",
    agentKind: "ir_business",
    ticker: "ZTS",
    claimPath: "guidance.asOf",
    expectedValue: "not in the future",
    actualValue: "2026-08-06",
    summary:
      "La fecha de asOf para el guidance es 2026-08-06, que está en el futuro.",
    blocking: true,
    ...overrides,
  };
}

function irWithAsOf(asOf: string): AggregateIrBusinessOutput {
  return {
    tickers: [
      {
        ticker: "ZTS",
        businessOneLiner: "Animal health company",
        guidance: {
          summary: "Maintained outlook",
          direction: "flat",
          asOf,
          sources: [],
        },
        catalysts: [],
        segments: [],
        contradictionWithHardData: false,
        confidence: "medium",
        bullets: ["Solid franchise"],
        gaps: [],
      },
    ],
    generatedAt: "2026-08-10T00:00:00.000Z",
  };
}

describe("filterSpuriousLayerBR6Issues", () => {
  it("drops Layer B R6 when asOf is a recent past date", () => {
    const kept = filterSpuriousLayerBR6Issues({
      layerBIssues: [r6Issue()],
      layerAIssues: [],
      irAggregate: irWithAsOf("2026-08-06"),
      now,
    });
    expect(kept).toHaveLength(0);
  });

  it("keeps Layer B R6 when asOf is genuinely stale", () => {
    const kept = filterSpuriousLayerBR6Issues({
      layerBIssues: [
        r6Issue({
          actualValue: "2024-01-01",
          expectedValue: "within the last 12 months",
          summary: "Guidance asOf 2024-01-01 is older than 12 months.",
        }),
      ],
      layerAIssues: [],
      irAggregate: irWithAsOf("2024-01-01"),
      now,
    });
    expect(kept).toHaveLength(1);
  });

  it("drops Layer B R6 duplicate when Layer A already flagged the ticker", () => {
    const kept = filterSpuriousLayerBR6Issues({
      layerBIssues: [r6Issue({ actualValue: "2024-01-01" })],
      layerAIssues: [r6Issue({ actualValue: "2024-01-01" })],
      irAggregate: irWithAsOf("2024-01-01"),
      now,
    });
    expect(kept).toHaveLength(0);
  });

  it("keeps non-R6 Layer B issues", () => {
    const other: QaIssue = {
      issueType: "cross_agent_inconsistency",
      ruleId: "R7",
      agentKind: "compiler",
      ticker: "ZTS",
      claimPath: "thesis",
      expectedValue: null,
      actualValue: null,
      summary: "Cause missing",
      blocking: true,
    };
    const kept = filterSpuriousLayerBR6Issues({
      layerBIssues: [other, r6Issue()],
      layerAIssues: [],
      irAggregate: irWithAsOf("2026-08-06"),
      now,
    });
    expect(kept).toEqual([other]);
  });
});

describe("filterSpuriousR6IssuesForDisplay", () => {
  it("hides persisted false-positive R6 future claims", () => {
    const kept = filterSpuriousR6IssuesForDisplay({
      issues: [r6Issue()],
      irAggregate: irWithAsOf("2026-08-06"),
      now,
    });
    expect(kept).toHaveLength(0);
  });
});
