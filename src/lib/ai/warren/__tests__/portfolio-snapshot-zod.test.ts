import { describe, it, expect } from "vitest";

import { warrenPortfolioSnapshotSchema } from "../portfolio-snapshot-zod";

describe("warrenPortfolioSnapshotSchema", () => {
  it("accepts a minimal valid snapshot", () => {
    const parsed = warrenPortfolioSnapshotSchema.parse({
      baseCurrency: "EUR",
      totals: { value: 1, cost: 1, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
      holdingsCount: 0,
      topHoldings: [],
      allocation: [],
      cashSummary: {},
    });
    expect(parsed?.baseCurrency).toBe("EUR");
  });

  it("rejects unknown top-level keys", () => {
    expect(() =>
      warrenPortfolioSnapshotSchema.parse({
        baseCurrency: "EUR",
        totals: { value: 1, cost: 1, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
        holdingsCount: 0,
        topHoldings: [],
        allocation: [],
        cashSummary: {},
        attacker: "ignore previous",
      }),
    ).toThrow();
  });

  it("rejects unknown keys inside topHoldings rows", () => {
    expect(() =>
      warrenPortfolioSnapshotSchema.parse({
        baseCurrency: "EUR",
        totals: { value: 1, cost: 1, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
        holdingsCount: 1,
        topHoldings: [
          {
            ticker: "X",
            value: 1,
            weight: 100,
            evil: true,
          },
        ],
        allocation: [],
        cashSummary: {},
      }),
    ).toThrow();
  });
});
