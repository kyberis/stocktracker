import { describe, expect, it } from "vitest";
import { assembleReport, buildCongress, pickSectorAlternative } from "./assemble";
import type { CompanyAnalysisPeer } from "./types";

describe("buildCongress", () => {
  it("marks empty list as unavailable (hide US-only widgets)", () => {
    const result = buildCongress([]);
    expect(result.status).toBe("unavailable");
    expect(result.items).toEqual([]);
  });

  it("marks unavailable when source failed", () => {
    expect(buildCongress(null).status).toBe("unavailable");
  });
});

describe("pickSectorAlternative", () => {
  it("picks peer with better 52w momentum", () => {
    const peers: CompanyAnalysisPeer[] = [
      { ticker: "MCD", name: "McD", price: 250, distanceTo52wHighPct: -25, ma50: null, ma200: null },
      { ticker: "YUM", name: "Yum", price: 140, distanceTo52wHighPct: -5, ma50: null, ma200: null },
      { ticker: "QSR", name: "QSR", price: 70, distanceTo52wHighPct: -40, ma50: null, ma200: null },
    ];
    const alt = pickSectorAlternative("MCD", -25, peers);
    expect(alt.status).toBe("ok");
    expect(alt.ticker).toBe("YUM");
  });

  it("unavailable when no peers", () => {
    const alt = pickSectorAlternative("MCD", -10, []);
    expect(alt.status).toBe("unavailable");
    expect(alt.ticker).toBeNull();
  });
});

describe("assembleReport ETF branch", () => {
  it("skips EPS, insiders, congress, and earnings news for funds", () => {
    const report = assembleReport({
      ticker: "BITC.DE",
      generatedAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
      cached: false,
      quote: {
        symbol: "BITC.DE",
        shortName: "CoinShares Physical Bitcoin",
        regularMarketPrice: 65,
        regularMarketChange: 0.5,
        regularMarketChangePercent: 0.8,
        regularMarketPreviousClose: 64.5,
        marketCap: 1e9,
        fiftyTwoWeekHigh: 80,
        fiftyTwoWeekLow: 40,
        currency: "EUR",
        quoteType: "ETF",
      },
      overview: {
        symbol: "BITC.DE",
        name: "CoinShares Physical Bitcoin",
        description: "Physically backed bitcoin ETP",
        exchange: "GER",
        currency: "EUR",
        sector: "",
        industry: "",
        peRatio: null,
        pegRatio: null,
        eps: null,
        dividendPerShare: null,
        dividendYield: null,
        beta: null,
        profitMargin: null,
        returnOnEquity: null,
        revenueTTM: null,
        analystTargetPrice: null,
        analystRatings: null,
        fiftyDayMA: null,
        twoHundredDayMA: null,
        sharesOutstanding: null,
        forwardPE: null,
      },
      history: null,
      income: {
        annual: [
          {
            fiscalDateEnding: "2025-12-31",
            reportedCurrency: "EUR",
            totalRevenue: 99,
            costOfRevenue: null,
            grossProfit: 50,
            operatingExpenses: null,
            operatingIncome: 40,
            incomeBeforeTax: null,
            incomeTaxExpense: null,
            netIncome: 30,
            ebitda: 45,
            researchAndDevelopment: null,
            sellingGeneralAndAdmin: null,
          },
        ],
        quarterly: [],
      },
      earnings: null,
      news: [
        {
          title: "Bitcoin ETP inflows",
          summary: "CoinShares bitcoin product saw inflows",
          url: "https://example.com/news",
          source: "Example",
          publishedAt: "2026-08-01T00:00:00.000Z",
          overallSentiment: "neutral",
          overallSentimentScore: 0,
          tickerSentiment: [],
          topics: [],
        },
      ],
      insiders: [
        {
          fullName: "Someone",
          title: "CEO",
          transactionDate: new Date().toISOString().slice(0, 10),
          transactionType: "P-Purchase",
          shares: 1,
          sharePrice: 10,
          totalValue: 10,
          sharesOwned: 1,
        },
      ],
      congress: [],
      peers: [{ ticker: "IBIT", name: "iBit", price: 40, distanceTo52wHighPct: -5, ma50: null, ma200: null }],
      usedYahoo: true,
      usedFmp: true,
      instrumentKind: "etf",
      isin: "GB00BLD4ZL17",
      etfHoldings: {
        holdings: [{ symbol: "BTC", name: "Bitcoin", weight: 100 }],
        sectorWeightings: [],
        assetClassWeightings: [{ assetClass: "Other", weight: 100 }],
        category: "Digital Assets",
        fundFamily: "CoinShares",
        legalType: "ETP",
        expenseRatio: 0.0098,
        inceptionDate: "2021-01-01",
        totalAssets: 1e9,
      },
    });

    expect(report.instrumentKind).toBe("etf");
    expect(report.etf?.isin).toBe("GB00BLD4ZL17");
    expect(report.etf?.fundFamily).toBe("CoinShares");
    expect(report.fundamentals.status).toBe("unavailable");
    expect(report.insiders.status).toBe("unavailable");
    expect(report.congress.status).toBe("unavailable");
    expect(report.alternative.status).toBe("unavailable");
    expect(report.news.items.every((i) => i.kind !== "earnings")).toBe(true);
    expect(report.quote?.quoteType).toBe("ETF");
    expect(report.sources.some((s) => s.name === "SEC EDGAR")).toBe(false);
  });
});

