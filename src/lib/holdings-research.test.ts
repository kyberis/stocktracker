import { describe, expect, it } from "vitest";
import type { Holding, QuoteData } from "@/lib/types";
import {
  buildResearchViews,
  compareNullable,
  emptyFundamentals,
  filterResearchViews,
  fundamentalsFromCache,
  fundamentalsFromOverview,
  holdingNeedsFundamentals,
  sortablePe,
  sortResearchViews,
} from "./holdings-research";
import type { ScreenerCacheRow } from "@/lib/db/screener";

function holding(partial: Partial<Holding> & Pick<Holding, "id" | "ticker">): Holding {
  return {
    name: partial.name ?? partial.ticker,
    isin: "",
    shares: 10,
    purchasePrice: 100,
    displayCurrency: "EUR",
    exchange: "",
    valueInEUR: 1000,
    assetType: "stock",
    ...partial,
  };
}

describe("holdings-research helpers", () => {
  it("sortablePe drops non-positive ratios", () => {
    expect(sortablePe(12.5)).toBe(12.5);
    expect(sortablePe(0)).toBeNull();
    expect(sortablePe(-4)).toBeNull();
    expect(sortablePe(null)).toBeNull();
  });

  it("compareNullable puts missing values last", () => {
    expect(compareNullable(null, 5, "asc")).toBe(1);
    expect(compareNullable(5, null, "asc")).toBe(-1);
    expect(compareNullable(2, 10, "asc")).toBeLessThan(0);
    expect(compareNullable(2, 10, "desc")).toBeGreaterThan(0);
  });

  it("holdingNeedsFundamentals is true for stock/etf only", () => {
    expect(holdingNeedsFundamentals({ assetType: "stock" })).toBe(true);
    expect(holdingNeedsFundamentals({ assetType: "etf" })).toBe(true);
    expect(holdingNeedsFundamentals({ assetType: "crypto" })).toBe(false);
    expect(holdingNeedsFundamentals({ assetType: "fund" })).toBe(false);
    expect(holdingNeedsFundamentals({})).toBe(true);
  });

  it("maps cache and overview into the same fundamentals shape", () => {
    const cache = fundamentalsFromCache({
      symbol: "AAPL",
      shortName: "Apple",
      sector: "Technology",
      industry: "Consumer Electronics",
      country: "US",
      exchange: "NMS",
      currency: "USD",
      marketCap: 3e12,
      peRatio: 28,
      forwardPe: 24,
      dividendYield: 0.005,
      dividendPerShare: 1,
      eps: 7,
      beta: 1.2,
      profitMargin: 0.25,
      returnOnEquity: 1.4,
      fiftyTwoWeekHigh: 260,
      fiftyTwoWeekLow: 160,
      regularMarketPrice: 200,
      regularMarketChangePercent: 1,
      analystStrongBuy: 10,
      analystBuy: 8,
      analystHold: 5,
      analystSell: 1,
      analystStrongSell: 0,
      updatedAt: "2026-08-01T00:00:00.000Z",
    } satisfies ScreenerCacheRow);
    expect(cache.source).toBe("cache");
    expect(cache.forwardPe).toBe(24);

    const ov = fundamentalsFromOverview({
      symbol: "MSFT",
      name: "Microsoft",
      description: "",
      exchange: "NMS",
      currency: "USD",
      sector: "Technology",
      industry: "Software",
      peRatio: 35,
      pegRatio: 2.1,
      eps: 12,
      dividendPerShare: 3,
      dividendYield: 0.007,
      beta: 0.9,
      profitMargin: 0.36,
      returnOnEquity: 0.35,
      revenueTTM: 1,
      analystTargetPrice: 500,
      analystRatings: { strongBuy: 12, buy: 10, hold: 4, sell: 0, strongSell: 0 },
      fiftyDayMA: 400,
      twoHundredDayMA: 380,
      sharesOutstanding: 7e9,
      forwardPE: 30,
    });
    expect(ov.source).toBe("overview");
    expect(ov.pegRatio).toBe(2.1);
    expect(ov.analystTargetPrice).toBe(500);
  });
});

describe("buildResearchViews + sort/filter", () => {
  const holdings = [
    holding({ id: "1", ticker: "AAA", name: "Alpha", shares: 10, purchasePrice: 50, valueInEUR: 1000 }),
    holding({ id: "2", ticker: "BBB", name: "Beta Co", shares: 5, purchasePrice: 200, valueInEUR: 500 }),
    holding({ id: "3", ticker: "CCC", name: "Crypto", assetType: "crypto", shares: 2, purchasePrice: 1, valueInEUR: 100 }),
  ];
  const quotes: Record<string, QuoteData> = {
    AAA: {
      symbol: "AAA",
      shortName: "Alpha",
      regularMarketPrice: 100,
      regularMarketChange: 2,
      regularMarketChangePercent: 2,
      currency: "EUR",
      regularMarketPreviousClose: 98,
      fiftyTwoWeekHigh: 120,
      fiftyTwoWeekLow: 80,
    },
    BBB: {
      symbol: "BBB",
      shortName: "Beta",
      regularMarketPrice: 150,
      regularMarketChange: -5,
      regularMarketChangePercent: -3,
      currency: "EUR",
      regularMarketPreviousClose: 155,
      fiftyTwoWeekHigh: 200,
      fiftyTwoWeekLow: 100,
    },
  };
  const funds = new Map([
    ["1", { ...emptyFundamentals(), peRatio: 12, dividendYield: 0.04, sector: "Energy", source: "cache" as const }],
    ["2", { ...emptyFundamentals(), peRatio: 40, dividendYield: 0.01, sector: "Tech", source: "cache" as const }],
  ]);

  it("computes weight, return, and estimated dividend income", () => {
    const views = buildResearchViews(holdings, funds, quotes, {});
    const alpha = views.find((v) => v.holding.id === "1")!;
    expect(alpha.valueEUR).toBe(1000);
    expect(alpha.returnPct).toBe(100);
    expect(alpha.estimatedDivIncomeEUR).toBeCloseTo(40);
    expect(alpha.weightPct).toBeCloseTo((1000 / 1850) * 100);
  });

  it("sorts by trailing P/E ascending with nulls last", () => {
    const views = buildResearchViews(holdings, funds, quotes, {});
    const sorted = sortResearchViews(views, "peRatio", "asc");
    expect(sorted.map((v) => v.holding.ticker)).toEqual(["AAA", "BBB", "CCC"]);
  });

  it("filters by asset type and search", () => {
    const views = buildResearchViews(holdings, funds, quotes, {});
    expect(filterResearchViews(views, { assetType: "crypto" })).toHaveLength(1);
    expect(filterResearchViews(views, { query: "alpha" }).map((v) => v.holding.ticker)).toEqual(["AAA"]);
  });
});
