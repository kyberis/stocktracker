import { describe, expect, it } from "vitest";
import {
  ANALISIS_HUB_URL,
  analisisTickerUrl,
  buildAnalisisHubMetadata,
  buildAnalisisTickerDescription,
  buildAnalisisTickerJsonLd,
  buildAnalisisTickerTitle,
} from "./seo";
import type { CompanyAnalysisReport } from "./types";

function minimalReport(overrides?: Partial<CompanyAnalysisReport>): CompanyAnalysisReport {
  return {
    ticker: "AAPL",
    generatedAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    cached: true,
    quote: {
      price: 190,
      change: 1,
      changePercent: 0.5,
      dayHigh: null,
      dayLow: null,
      marketCap: 3e12,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      ma50: null,
      ma200: null,
      currency: "USD",
    },
    profile: {
      name: "Apple Inc.",
      sector: "Technology",
      industry: "Consumer Electronics",
      description: "Apple designs consumer electronics.",
      exchange: "NASDAQ",
      ipoDate: null,
    },
    fundamentals: {
      status: "ok",
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
    ...overrides,
  };
}

describe("company-analysis seo", () => {
  it("builds hub metadata with canonical", () => {
    const meta = buildAnalisisHubMetadata();
    expect(meta.title).toContain("trefolio");
    expect(meta.alternates.canonical).toBe(ANALISIS_HUB_URL);
    expect(meta.description.toLowerCase()).toContain("not investment advice");
  });

  it("builds ticker title/description from cache profile without live price", () => {
    const report = minimalReport();
    expect(buildAnalisisTickerTitle("AAPL", report)).toBe(
      "Apple Inc. (AAPL) stock analysis — trefolio",
    );
    const desc = buildAnalisisTickerDescription("AAPL", report);
    expect(desc).toContain("Technology");
    expect(desc).toContain("Consumer Electronics");
    expect(desc).not.toMatch(/190/);
    expect(desc.toLowerCase()).toContain("not investment advice");
  });

  it("falls back when cache is missing", () => {
    expect(buildAnalisisTickerTitle("MSFT", null)).toBe("MSFT stock analysis — trefolio");
    expect(buildAnalisisTickerDescription("MSFT", null)).toContain("MSFT");
    expect(analisisTickerUrl("msft")).toBe("https://trefolio.com/analisis/MSFT");
  });

  it("emits InvestmentFund JSON-LD and ETF title for funds", () => {
    const report = minimalReport({
      ticker: "BITC.DE",
      instrumentKind: "etf",
      profile: {
        name: "CoinShares Physical Bitcoin",
        sector: "",
        industry: "",
        description: "Bitcoin ETP",
        exchange: "XETRA",
        ipoDate: null,
      },
      etf: {
        isin: "GB00BLD4ZL17",
        fundFamily: "CoinShares",
        category: "Digital Assets",
        legalType: "ETP",
        expenseRatio: 0.0098,
        inceptionDate: "2021-01-01",
        totalAssets: 1e9,
        holdings: [],
        sectorWeightings: [],
        assetClassWeightings: [],
      },
    });
    expect(buildAnalisisTickerTitle("BITC", report)).toBe(
      "CoinShares Physical Bitcoin (BITC) ETF analysis — trefolio",
    );
    const desc = buildAnalisisTickerDescription("BITC", report);
    expect(desc).toContain("ETF analysis");
    expect(desc).toContain("CoinShares");
    expect(desc.toLowerCase()).toContain("not investment advice");
    const schemas = buildAnalisisTickerJsonLd({ ticker: "BITC", report });
    expect(schemas[0]["@type"]).toBe("InvestmentFund");
    expect(schemas[0].identifier).toBe("GB00BLD4ZL17");
  });

  it("emits Corporation + WebPage + BreadcrumbList JSON-LD", () => {
    const schemas = buildAnalisisTickerJsonLd({ ticker: "AAPL", report: minimalReport() });
    expect(schemas).toHaveLength(3);
    expect(schemas[0]["@type"]).toBe("Corporation");
    expect(schemas[0].tickerSymbol).toBe("AAPL");
    expect(schemas[1]["@type"]).toBe("WebPage");
    expect(schemas[2]["@type"]).toBe("BreadcrumbList");
  });

  it("never puts quote price or market cap into indexable strings", () => {
    const report = minimalReport({
      quote: {
        price: 190.42,
        change: 1.1,
        changePercent: 0.58,
        dayHigh: null,
        dayLow: null,
        marketCap: 2_987_654_321,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        ma50: null,
        ma200: null,
        currency: "USD",
      },
    });
    const title = buildAnalisisTickerTitle("AAPL", report);
    const desc = buildAnalisisTickerDescription("AAPL", report);
    const json = JSON.stringify(buildAnalisisTickerJsonLd({ ticker: "AAPL", report }));
    for (const haystack of [title, desc, json]) {
      expect(haystack).not.toMatch(/190/);
      expect(haystack).not.toMatch(/2987654321/);
      expect(haystack).not.toMatch(/0\.58/);
    }
  });
});
