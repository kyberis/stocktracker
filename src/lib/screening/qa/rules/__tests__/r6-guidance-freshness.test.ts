import { describe, expect, it } from "vitest";

import type { QaEvaluationContext } from "../types";
import type { AggregateIrBusinessOutput } from "@/lib/screening/schemas";
import {
  parseGuidanceAsOf,
  r6GuidanceFreshness,
} from "../r6-guidance-freshness";

function ctxWithGuidance(
  rows: Array<{ ticker: string; asOf: string | null }>,
): QaEvaluationContext {
  const irAggregate = {
    tickers: rows.map((r) => ({
      ticker: r.ticker,
      businessOneLiner: "test company",
      guidance: {
        summary: "test guidance",
        direction: "unclear" as const,
        asOf: r.asOf ?? "1970-01-01",
        sources: [],
      },
      catalysts: [],
      segments: [],
      contradictionWithHardData: false,
      confidence: "low" as const,
      bullets: ["placeholder"],
      gaps: [],
    })),
    generatedAt: "2026-08-08T00:00:00.000Z",
  } satisfies AggregateIrBusinessOutput;

  return {
    runId: "run-1",
    hardData: null,
    irAggregate,
    webAggregate: null,
    technicalsAggregate: null,
    portfolioContext: null,
    risk: null,
    compilerDraft: null,
    report: null,
  };
}

describe("parseGuidanceAsOf", () => {
  it("parses YYYY-MM-DD and YYYY-MM", () => {
    expect(parseGuidanceAsOf("2026-07-22")?.toISOString()).toBe(
      "2026-07-22T00:00:00.000Z",
    );
    expect(parseGuidanceAsOf("2026-07")?.toISOString()).toBe(
      "2026-07-01T00:00:00.000Z",
    );
  });

  it("returns null for garbage", () => {
    expect(parseGuidanceAsOf("soon")).toBeNull();
    expect(parseGuidanceAsOf("")).toBeNull();
  });
});

describe("r6GuidanceFreshness", () => {
  const now = new Date("2026-08-08T12:00:00.000Z");
  const rule = r6GuidanceFreshness(now);

  it("accepts a date a few weeks ago (not 'future')", () => {
    const issues = rule(ctxWithGuidance([{ ticker: "RPM", asOf: "2026-07-22" }]));
    expect(issues).toHaveLength(0);
  });

  it("flags guidance older than 12 months", () => {
    const issues = rule(
      ctxWithGuidance([{ ticker: "DFUSX", asOf: "2023-10-01" }]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe("R6");
    expect(issues[0]?.agentKind).toBe("ir_business");
    expect(issues[0]?.blocking).toBe(true);
  });

  it("flags dates meaningfully in the future", () => {
    const issues = rule(
      ctxWithGuidance([{ ticker: "AAA", asOf: "2026-12-01" }]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.summary).toMatch(/future/i);
  });
});
