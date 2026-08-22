import { describe, it, expect } from "vitest";

import type { CompanyOverview } from "@/lib/api-providers/types";
import {
  buildValuationSnapshot,
  scoreValuation,
  demoValuationItems,
} from "@/lib/services/warren-valuation";

const baseOverview: CompanyOverview = {
  symbol: "KO",
  name: "Coca-Cola",
  description: "",
  exchange: "NYSE",
  currency: "USD",
  sector: "Consumer",
  industry: "Beverages",
  peRatio: 24,
  forwardPE: 22,
  pegRatio: 2.1,
  eps: 2.5,
  dividendPerShare: 1.8,
  dividendYield: 0.03,
  beta: 0.6,
  profitMargin: 0.22,
  returnOnEquity: 0.4,
  revenueTTM: 45000000000,
  analystTargetPrice: 70,
  analystRatings: null,
  fiftyDayMA: null,
  twoHundredDayMA: null,
  sharesOutstanding: 4300000000,
};

describe("buildValuationSnapshot", () => {
  it("maps overview fields into valuation metrics", () => {
    const metrics = buildValuationSnapshot(baseOverview);
    expect(metrics.peRatio).toBe(24);
    expect(metrics.forwardPE).toBe(22);
    expect(metrics.returnOnEquity).toBe(0.4);
  });
});

describe("scoreValuation", () => {
  it("labels high P/E as expensive", () => {
    const metrics = buildValuationSnapshot({
      ...baseOverview,
      peRatio: 35,
      forwardPE: 32,
    });
    const scored = scoreValuation(metrics);
    expect(scored.label).toBe("expensive");
    expect(scored.summary).toContain("expensive");
  });

  it("labels low P/E as cheap", () => {
    const metrics = buildValuationSnapshot({
      ...baseOverview,
      peRatio: 12,
      forwardPE: 11,
    });
    const scored = scoreValuation(metrics);
    expect(scored.label).toBe("cheap");
  });

  it("returns unknown when no multiples exist", () => {
    const scored = scoreValuation({
      peRatio: null,
      forwardPE: null,
      pegRatio: null,
      returnOnEquity: null,
      profitMargin: null,
      revenueTTM: null,
      beta: null,
      analystTargetPrice: null,
      dividendYield: null,
      histPeAvg: null,
      histPeYears: null,
    });
    expect(scored.label).toBe("unknown");
    expect(scored.dataGaps.length).toBeGreaterThan(0);
  });
});

describe("demoValuationItems", () => {
  it("returns one demo item per ticker", () => {
    const items = demoValuationItems(["ko", "MSFT"]);
    expect(items).toHaveLength(2);
    expect(items[0]?.symbol).toBe("KO");
    expect(items[1]?.symbol).toBe("MSFT");
    expect(items[0]?.dataGaps[0]).toContain("demo");
  });
});
