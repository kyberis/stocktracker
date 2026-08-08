import { describe, expect, it } from "vitest";

import type { QaEvaluationContext } from "../types";
import { r1InsiderClassification } from "../r1-insider-classification";

function baseCtx(overrides: Partial<QaEvaluationContext> = {}): QaEvaluationContext {
  return {
    runId: "run",
    hardData: null,
    irAggregate: null,
    webAggregate: null,
    technicalsAggregate: null,
    portfolioContext: null,
    risk: null,
    compilerDraft: null,
    report: null,
    ...overrides,
  };
}

describe("r1InsiderClassification", () => {
  it("passes when web output is missing", () => {
    expect(r1InsiderClassification(baseCtx())).toEqual([]);
  });

  it("flags a `buying` bias with no notes or sources", () => {
    const ctx = baseCtx({
      webAggregate: {
        tickers: [
          {
            ticker: "AAPL",
            signals: [],
            insiderSummary: { netBias: "buying", notes: "", sources: [] },
            sentimentSummary: "sample",
            gaps: [],
          },
        ],
        generatedAt: "2026-01-01",
      },
    });
    const issues = r1InsiderClassification(ctx);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe("R1");
    expect(issues[0].blocking).toBe(true);
  });

  it("flags a `buying` bias when notes describe RSU/option activity", () => {
    const ctx = baseCtx({
      webAggregate: {
        tickers: [
          {
            ticker: "AAPL",
            signals: [],
            insiderSummary: {
              netBias: "buying",
              notes: "Officer tax withholding on RSU vesting",
              sources: [{ url: "https://example.com", asOf: "2026-01" }],
            },
            sentimentSummary: "sample",
            gaps: [],
          },
        ],
        generatedAt: "2026-01-01",
      },
    });
    const issues = r1InsiderClassification(ctx);
    expect(issues).toHaveLength(1);
    expect(issues[0].summary).toContain("RSU/option");
  });

  it("does not flag a plausible open-market buy claim", () => {
    const ctx = baseCtx({
      webAggregate: {
        tickers: [
          {
            ticker: "AAPL",
            signals: [],
            insiderSummary: {
              netBias: "buying",
              notes: "CEO open market purchase filed via Form 4",
              sources: [{ url: "https://example.com", asOf: "2026-01" }],
            },
            sentimentSummary: "sample",
            gaps: [],
          },
        ],
        generatedAt: "2026-01-01",
      },
    });
    expect(r1InsiderClassification(ctx)).toEqual([]);
  });
});
