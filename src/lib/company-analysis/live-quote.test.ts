import { describe, expect, it, vi } from "vitest";
import { mapQuote } from "./assemble";
import type { CompanyAnalysisReport } from "./types";

vi.mock("@/lib/quote-cache", () => ({
  getQuotesWithCache: vi.fn(async () => ({
    AAPL: {
      symbol: "AAPL",
      shortName: "Apple",
      regularMarketPrice: 201.5,
      regularMarketChange: 2.5,
      regularMarketChangePercent: 1.25,
      currency: "USD",
      regularMarketPreviousClose: 199,
      fiftyTwoWeekHigh: 220,
      fiftyTwoWeekLow: 150,
      marketCap: 3.1e12,
    },
  })),
}));

import { withLiveQuote } from "./live-quote";

function baseReport(): CompanyAnalysisReport {
  return {
    ticker: "AAPL",
    generatedAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    cached: true,
    quote: {
      price: 100,
      change: 0,
      changePercent: 0,
      dayHigh: null,
      dayLow: null,
      marketCap: 1e12,
      fiftyTwoWeekHigh: 200,
      fiftyTwoWeekLow: 100,
      ma50: 180,
      ma200: 170,
      currency: "USD",
    },
    profile: null,
    fundamentals: {
      status: "unavailable",
      lastQuarterLabel: null,
      lastReportDate: null,
      rows: [],
      nextQuarterLabel: null,
      nextReportDate: null,
      companyGuidanceRevenue: null,
      companyGuidanceRevenueVarPct: null,
      companyGuidanceSourceUrl: null,
      consensusRevenue: null,
      consensusRevenueVarPct: null,
      consensusEps: null,
      consensusEpsVarPct: null,
      lastEps: null,
      lastEpsVsConsensusPct: null,
      lastEpsSourceUrl: null,
      lastRevenue: null,
      lastRevenueYoyPct: null,
    },
    technicals: {
      status: "unavailable",
      closeHigh12m: null,
      closeHigh12mDate: null,
      distanceToCloseHigh12mPct: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      ma50: null,
      ma200: null,
      support: null,
      resistance: null,
      latestVolume: null,
      avgVolume: null,
      nextCatalystDate: null,
    },
    news: { status: "unavailable", items: [] },
    insiders: { status: "unavailable", items: [] },
    congress: { status: "unavailable", items: [] },
    alternative: {
      status: "unavailable",
      ticker: null,
      name: null,
      tagline: null,
      why: null,
      distanceTo52wHighPct: null,
      price: null,
      peersConsidered: [],
    },
    sources: [],
  };
}

describe("withLiveQuote", () => {
  it("overlays live price while keeping cached moving averages", async () => {
    const out = await withLiveQuote(baseReport());
    expect(out.quote?.price).toBe(201.5);
    expect(out.quote?.changePercent).toBe(1.25);
    expect(out.quote?.ma50).toBe(180);
    expect(out.quote?.ma200).toBe(170);
    // Sanity: mapQuote shape matches overlay expectations
    const mapped = mapQuote(
      {
        symbol: "AAPL",
        shortName: "Apple",
        regularMarketPrice: 201.5,
        regularMarketChange: 2.5,
        regularMarketChangePercent: 1.25,
        currency: "USD",
        regularMarketPreviousClose: 199,
        fiftyTwoWeekHigh: 220,
        fiftyTwoWeekLow: 150,
        marketCap: 3.1e12,
      },
      null,
    );
    expect(mapped?.price).toBe(201.5);
  });
});
