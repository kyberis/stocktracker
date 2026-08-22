import { describe, it, expect } from "vitest";

import type { CompanyOverview } from "@/lib/api-providers/types";
import {
  analyzeValuationForWarren,
  attachValuationQuoteUpside,
  buildValuationSnapshot,
  computeUpsideToTarget,
  demoValuationItems,
  enrichValuationItemsWithQuotes,
  filterWarrenValuationSymbols,
  isEligibleForWarrenValuation,
  LIMITED_UPSIDE_THRESHOLD_PCT,
  scoreValuation,
  WARREN_VALUATION_MAX_SYMBOLS,
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

describe("isEligibleForWarrenValuation", () => {
  it("rejects crypto tickers and funds", () => {
    expect(isEligibleForWarrenValuation("BTC-EUR")).toBe(false);
    expect(isEligibleForWarrenValuation("AAPL", "crypto")).toBe(false);
    expect(isEligibleForWarrenValuation("VWCE", "fund")).toBe(false);
  });

  it("accepts stocks and etfs", () => {
    expect(isEligibleForWarrenValuation("GOOGL", "stock")).toBe(true);
    expect(isEligibleForWarrenValuation("VWCE", "etf")).toBe(true);
  });
});

describe("filterWarrenValuationSymbols", () => {
  it("skips crypto and caps batch size", () => {
    const symbols = [
      "UBER",
      "BTC-EUR",
      "GOOGL",
      "SRB.L",
      "OXY",
      "NOVO-B.CO",
      "W9C.DE",
      "ITX.MC",
      "MSFT",
    ];
    const filtered = filterWarrenValuationSymbols(symbols);
    expect(filtered).not.toContain("BTC-EUR");
    expect(filtered.length).toBe(WARREN_VALUATION_MAX_SYMBOLS);
    expect(filtered[0]).toBe("UBER");
  });
});

describe("computeUpsideToTarget", () => {
  it("computes percent upside and flags limited room", () => {
    expect(computeUpsideToTarget(100, 110)).toEqual({
      currentPrice: 100,
      upsideToTargetPct: 10,
      hasLimitedUpside: false,
    });
    expect(computeUpsideToTarget(100, 102)).toEqual({
      currentPrice: 100,
      upsideToTargetPct: 2,
      hasLimitedUpside: true,
    });
    expect(computeUpsideToTarget(100, 90)).toEqual({
      currentPrice: 100,
      upsideToTargetPct: -10,
      hasLimitedUpside: true,
    });
  });

  it("returns null upside when price or target is missing", () => {
    expect(computeUpsideToTarget(null, 110)).toEqual({
      currentPrice: null,
      upsideToTargetPct: null,
      hasLimitedUpside: false,
    });
    expect(computeUpsideToTarget(0, 110).upsideToTargetPct).toBeNull();
    expect(computeUpsideToTarget(100, null).upsideToTargetPct).toBeNull();
  });

  it("uses the limited-upside threshold", () => {
    expect(LIMITED_UPSIDE_THRESHOLD_PCT).toBe(5);
    expect(computeUpsideToTarget(100, 104.9).hasLimitedUpside).toBe(true);
    expect(computeUpsideToTarget(100, 105).hasLimitedUpside).toBe(false);
  });
});

describe("enrichValuationItemsWithQuotes", () => {
  it("attaches quote upside onto valuation items", () => {
    const [demo] = demoValuationItems(["KO"]);
    const withTarget = attachValuationQuoteUpside(
      { ...demo!, metrics: { ...demo!.metrics, analystTargetPrice: 70 } },
      65,
    );
    expect(withTarget.currentPrice).toBe(65);
    expect(withTarget.upsideToTargetPct).toBeCloseTo(7.7, 1);
    expect(withTarget.hasLimitedUpside).toBe(false);

    const [enriched] = enrichValuationItemsWithQuotes([demo!], { KO: 50 });
    expect(enriched?.currentPrice).toBe(50);
  });
});

describe("analyzeValuationForWarren", () => {
  it("rejects crypto-only symbol lists", async () => {
    const result = await analyzeValuationForWarren("u1", ["BTC-EUR"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.toLowerCase()).toMatch(/equity|fundamental|valuation/);
    }
  });
});
