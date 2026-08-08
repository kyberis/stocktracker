import { describe, expect, it } from "vitest";

import type { QaEvaluationContext } from "../types";
import { r2SentimentNoise } from "../r2-sentiment-noise";

function ctxFor(
  noiseClaim: string,
  bulletText: string,
): QaEvaluationContext {
  return {
    runId: "r",
    hardData: null,
    irAggregate: null,
    webAggregate: {
      tickers: [
        {
          ticker: "MSFT",
          signals: [
            {
              kind: "noise",
              claim: noiseClaim,
              confirmation: "single_source_unconfirmed",
              sources: [],
            },
          ],
          insiderSummary: { netBias: "none", notes: "none", sources: [] },
          sentimentSummary: "n/a",
          gaps: [],
        },
      ],
      generatedAt: "2026-01-01",
    },
    technicalsAggregate: null,
    portfolioContext: null,
    risk: null,
    compilerDraft: {
      summary: "sample summary that talks about the company",
      candidateBullets: [
        { ticker: "MSFT", headline: "MSFT catalyst", bullet: bulletText },
      ],
      disclaimer: "d",
      locale: "en",
    },
    report: null,
  };
}

describe("r2SentimentNoise", () => {
  it("flags when the compiler bullet quotes a noise claim verbatim", () => {
    const noise = "Rumor says the CEO is buying stock via a shell company";
    const ctx = ctxFor(noise, `Bullet reads: ${noise}`);
    const issues = r2SentimentNoise(ctx);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe("R2");
    expect(issues[0].blocking).toBe(true);
  });

  it("does not flag when the bullet is unrelated prose", () => {
    const ctx = ctxFor(
      "Rumor says the CEO is buying stock via a shell company",
      "Segment strength keeps operating margin above peer average",
    );
    expect(r2SentimentNoise(ctx)).toEqual([]);
  });
});
