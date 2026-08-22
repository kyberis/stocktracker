import { describe, expect, it, vi } from "vitest";

import { buildValuationPrefetchAppendix, wantsValuationIntent } from "./valuation-intent";

vi.mock("@/lib/db", () => ({
  listHoldings: vi.fn(),
}));

describe("valuation-intent", () => {
  it("detects Spanish portfolio expensive question", () => {
    expect(wantsValuationIntent("Quiero saber que stock parecen caras")).toBe(true);
  });

  it("detects English cheap/expensive wording", () => {
    expect(wantsValuationIntent("Which of my holdings look expensive on fundamentals?")).toBe(true);
  });

  it("does not steal moat screener ideas prompts", () => {
    expect(wantsValuationIntent("dame ideas del moat screener con P/E bajo 15")).toBe(false);
  });

  it("ignores unrelated portfolio questions", () => {
    expect(wantsValuationIntent("What is my total portfolio value?")).toBe(false);
  });

  it("buildValuationPrefetchAppendix returns instructions without fetching market data", async () => {
    const appendix = await buildValuationPrefetchAppendix("qué stocks parecen caras", {
      userId: "u1",
      snapshot: {
        baseCurrency: "EUR",
        totals: { value: 1, cost: 1, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
        holdingsCount: 2,
        topHoldings: [
          { ticker: "AAPL", value: 100, weight: 60 },
          { ticker: "MSFT", value: 50, weight: 40 },
        ],
        allocation: [],
        cashSummary: {},
      },
    });
    expect(appendix).toContain("analyzeValuation");
    expect(appendix).toContain("AAPL");
    expect(appendix).toContain("Do NOT call");
  });
});
