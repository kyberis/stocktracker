import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("yahoo-finance2", () => {
  const mockQuote = vi.fn();
  const mockSearch = vi.fn();
  const mockChart = vi.fn();
  const mockQuoteSummary = vi.fn();

  return {
    default: class {
      quote = mockQuote;
      search = mockSearch;
      chart = mockChart;
      quoteSummary = mockQuoteSummary;
    },
    __mockQuote: mockQuote,
    __mockSearch: mockSearch,
    __mockChart: mockChart,
    __mockQuoteSummary: mockQuoteSummary,
  };
});

vi.mock("@/lib/metrics", () => ({
  providerRequestsTotal: { inc: vi.fn() },
  providerRequestDuration: { startTimer: () => vi.fn() },
}));

vi.mock("@/lib/db/historical-cache", () => ({
  getCachedHistorical: vi.fn().mockResolvedValue([]),
  cacheHistoricalPoints: vi.fn().mockResolvedValue(undefined),
}));

import { YahooProvider, clearYahooApiMemoryCache } from "@/lib/api-providers/yahoo";
import { providerRequestsTotal } from "@/lib/metrics";

const {
  __mockQuote: mockQuote,
  __mockSearch: mockSearch,
  __mockChart: mockChart,
  __mockQuoteSummary: mockQuoteSummary,
} = await import("yahoo-finance2") as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe("Yahoo Finance chaos", () => {
  let provider: YahooProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    clearYahooApiMemoryCache();
    mockQuote.mockReset();
    mockChart.mockReset();
    mockSearch.mockReset();
    mockQuoteSummary.mockReset();
    provider = new YahooProvider();
  });

  describe("getQuote", () => {
    it("propagates errors and records error metric", async () => {
      mockQuote.mockRejectedValueOnce(new Error("Yahoo is down"));

      await expect(provider.getQuote("AAPL")).rejects.toThrow("Yahoo is down");

      expect(providerRequestsTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "yahoo", operation: "quote", status: "error" }),
      );
    });

    it("coerces undefined fields to 0", async () => {
      mockQuote.mockResolvedValueOnce({
        symbol: "AAPL",
        regularMarketPrice: undefined,
        regularMarketChange: undefined,
        regularMarketChangePercent: undefined,
        currency: undefined,
        regularMarketPreviousClose: undefined,
        fiftyTwoWeekHigh: undefined,
        fiftyTwoWeekLow: undefined,
        marketCap: undefined,
      });

      const result = await provider.getQuote("AAPL");

      expect(result.regularMarketPrice).toBe(0);
      expect(result.regularMarketChange).toBe(0);
      expect(result.regularMarketChangePercent).toBe(0);
      expect(result.currency).toBe("USD");
      expect(result.regularMarketPreviousClose).toBe(0);
      expect(result.fiftyTwoWeekHigh).toBe(0);
      expect(result.fiftyTwoWeekLow).toBe(0);
      expect(result.marketCap).toBe(0);
    });

    it("maps regularMarketTime from Date objects", async () => {
      const tradedAt = new Date("2026-08-14T20:00:00.000Z");
      mockQuote.mockResolvedValueOnce({
        symbol: "AAPL",
        shortName: "Apple Inc.",
        regularMarketPrice: 150,
        regularMarketChange: 2,
        regularMarketChangePercent: 1.3,
        currency: "USD",
        regularMarketPreviousClose: 148,
        fiftyTwoWeekHigh: 180,
        fiftyTwoWeekLow: 120,
        marketCap: 2_400_000_000_000,
        regularMarketTime: tradedAt,
      });

      const result = await provider.getQuote("AAPL");
      expect(result.regularMarketTime).toBe(tradedAt.getTime());
    });

    it("records success metric on successful call", async () => {
      mockQuote.mockResolvedValueOnce({
        symbol: "AAPL",
        shortName: "Apple Inc.",
        regularMarketPrice: 150,
        regularMarketChange: 2,
        regularMarketChangePercent: 1.3,
        currency: "USD",
        regularMarketPreviousClose: 148,
        fiftyTwoWeekHigh: 180,
        fiftyTwoWeekLow: 120,
        marketCap: 2_400_000_000_000,
      });

      await provider.getQuote("AAPL");

      expect(providerRequestsTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({ status: "success" }),
      );
    });
  });

  describe("search", () => {
    it("returns empty array when quotes list is empty", async () => {
      mockSearch.mockResolvedValueOnce({ quotes: [] });

      const results = await provider.search("nonexistent");
      expect(results).toEqual([]);
    });

    it("returns empty array when quotes is undefined", async () => {
      mockSearch.mockResolvedValueOnce({});

      const results = await provider.search("something");
      expect(results).toEqual([]);
    });

    it("propagates errors", async () => {
      mockSearch.mockRejectedValueOnce(new Error("rate limited"));

      await expect(provider.search("AAPL")).rejects.toThrow("rate limited");
    });
  });

  describe("getHistorical", () => {
    it("propagates errors and records error metric", async () => {
      mockChart.mockRejectedValueOnce(new Error("service unavailable"));

      await expect(provider.getHistorical("AAPL", "1m")).rejects.toThrow(
        "service unavailable",
      );

      expect(providerRequestsTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({ operation: "historical", status: "error" }),
      );
    });

    it("handles empty result array", async () => {
      mockChart.mockResolvedValueOnce({ quotes: [] });

      const results = await provider.getHistorical("AAPL", "1m");
      expect(results).toEqual([]);
    });

    it("coerces undefined numeric fields in results", async () => {
      mockChart.mockResolvedValueOnce({
        quotes: [
          {
            date: new Date("2024-01-01"),
            open: undefined,
            high: undefined,
            low: undefined,
            close: 10,
            volume: undefined,
          },
        ],
      });

      const results = await provider.getHistorical("AAPL", "1w");
      expect(results[0].open).toBe(0);
      expect(results[0].close).toBe(10);
      expect(results[0].volume).toBe(0);
    });
  });

  describe("getClassification", () => {
    it("returns null on error without throwing", async () => {
      mockQuoteSummary.mockRejectedValueOnce(new Error("not found"));

      const result = await provider.getClassification("INVALID");
      expect(result).toBeNull();
    });

    it("handles missing profile fields", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        assetProfile: {},
        quoteType: { quoteType: "EQUITY" },
      });

      const result = await provider.getClassification("AAPL");
      expect(result).toEqual({ sector: "", region: "", assetClass: "Equity" });
    });

    it("identifies ETF asset class", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        assetProfile: { sector: "Technology", country: "US" },
        quoteType: { quoteType: "ETF" },
      });

      const result = await provider.getClassification("VTI");
      expect(result!.assetClass).toBe("ETF");
    });
  });

  describe("getExchangeRate", () => {
    it("propagates errors", async () => {
      mockQuote.mockRejectedValueOnce(new Error("fx service down"));

      await expect(provider.getExchangeRate("USD", "EUR")).rejects.toThrow(
        "fx service down",
      );
    });

    it("returns 0 when price is undefined", async () => {
      mockQuote.mockResolvedValueOnce({ regularMarketPrice: undefined });

      const rate = await provider.getExchangeRate("USD", "EUR");
      expect(rate).toBe(0);
    });

    it("returns price on success", async () => {
      mockQuote.mockResolvedValueOnce({ regularMarketPrice: 0.92 });

      const rate = await provider.getExchangeRate("USD", "EUR");
      expect(rate).toBe(0.92);
    });
  });

  describe("search (success paths)", () => {
    it("filters results by quoteType EQUITY", async () => {
      mockSearch.mockResolvedValueOnce({
        quotes: [
          { symbol: "AAPL", shortname: "Apple", exchange: "NASDAQ", quoteType: "EQUITY" },
          { symbol: "BTCUSD", shortname: "Bitcoin", exchange: "", quoteType: "CRYPTOCURRENCY" },
          { symbol: "NO_TYPE", shortname: "NoType" },
        ],
      });

      const results = await provider.search("apple");
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe("AAPL");
    });

    it("includes crypto when option set", async () => {
      mockSearch.mockResolvedValueOnce({
        quotes: [
          { symbol: "AAPL", shortname: "Apple", exchange: "NASDAQ", quoteType: "EQUITY" },
          { symbol: "BTCUSD", shortname: "Bitcoin", exchange: "CCC", quoteType: "CRYPTOCURRENCY" },
        ],
      });

      const results = await provider.search("a", { includeCrypto: true });
      expect(results).toHaveLength(2);
    });
  });

  describe("getQuote (success paths)", () => {
    it("returns full quote data", async () => {
      mockQuote.mockResolvedValueOnce({
        symbol: "AAPL",
        shortName: "Apple Inc.",
        longName: "Apple Inc.",
        regularMarketPrice: 175.5,
        regularMarketChange: 2.3,
        regularMarketChangePercent: 1.32,
        currency: "USD",
        regularMarketPreviousClose: 173.2,
        fiftyTwoWeekHigh: 199.62,
        fiftyTwoWeekLow: 143.9,
        marketCap: 2_800_000_000_000,
        trailingAnnualDividendRate: 0.96,
        trailingAnnualDividendYield: 0.0055,
      });

      const result = await provider.getQuote("AAPL");
      expect(result.symbol).toBe("AAPL");
      expect(result.shortName).toBe("Apple Inc.");
      expect(result.regularMarketPrice).toBe(175.5);
      expect(result.currency).toBe("USD");
      expect(result.trailingAnnualDividendRate).toBe(0.96);
      expect(result.trailingAnnualDividendYield).toBe(0.0055);
    });
  });

  describe("getHistorical (period mapping)", () => {
    it.each(["1w", "1m", "3m", "6m", "1y", "all"] as const)("handles period %s", async (period) => {
      mockChart.mockResolvedValueOnce({
        quotes: [{ date: new Date("2024-06-01"), open: 100, high: 105, low: 99, close: 103, volume: 50000 }],
      });

      const results = await provider.getHistorical("AAPL", period);
      expect(results).toHaveLength(1);
      expect(results[0].date).toBe("2024-06-01");
      expect(results[0].close).toBe(103);
    });

    it("filters out items with null close", async () => {
      mockChart.mockResolvedValueOnce({
        quotes: [
          { date: new Date("2024-06-01"), open: 100, high: 105, low: 99, close: 103, volume: 50000 },
          { date: new Date("2024-06-02"), open: 101, high: 106, low: 100, close: null, volume: 40000 },
        ],
      });

      const results = await provider.getHistorical("AAPL", "1w");
      expect(results).toHaveLength(1);
    });
  });

  describe("getClassification (success)", () => {
    it("returns full classification", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        assetProfile: { sector: "Technology", country: "United States" },
        quoteType: { quoteType: "EQUITY" },
      });

      const result = await provider.getClassification("AAPL");
      expect(result).toEqual({ sector: "Technology", region: "United States", assetClass: "Equity" });
    });

    it("identifies MUTUALFUND asset class", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        assetProfile: { sector: "Financial", country: "US" },
        quoteType: { quoteType: "MUTUALFUND" },
      });

      const result = await provider.getClassification("VFIAX");
      expect(result!.assetClass).toBe("Fund");
    });

    it("identifies CRYPTOCURRENCY asset class", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        assetProfile: {},
        quoteType: { quoteType: "CRYPTOCURRENCY" },
      });

      const result = await provider.getClassification("BTC-USD");
      expect(result!.assetClass).toBe("Cryptocurrency");
    });

    it("defaults to Equity when quoteType is empty", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        assetProfile: {},
        quoteType: {},
      });

      const result = await provider.getClassification("XYZ");
      expect(result!.assetClass).toBe("Equity");
    });
  });

  describe("getOverview", () => {
    it("returns full overview on success", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        summaryProfile: {
          longBusinessSummary: "Apple designs consumer electronics.",
          sector: "Technology",
          industry: "Consumer Electronics",
        },
        summaryDetail: {
          currency: "USD",
          trailingPE: 28.5,
          dividendRate: 0.96,
          dividendYield: 0.0055,
          beta: 1.2,
          fiftyDayAverage: 175,
          twoHundredDayAverage: 165,
        },
        financialData: {
          financialCurrency: "USD",
          revenuePerShare: 6.5,
          profitMargins: 0.25,
          returnOnEquity: 1.5,
          totalRevenue: 400_000_000_000,
          targetMeanPrice: 200,
        },
        defaultKeyStatistics: {
          pegRatio: 2.1,
          sharesOutstanding: 16_000_000_000,
          forwardPE: 25,
        },
        recommendationTrend: {
          trend: [
            {
              period: "0m",
              strongBuy: 10,
              buy: 15,
              hold: 8,
              sell: 2,
              strongSell: 1,
            },
          ],
        },
      });

      const result = await provider.getOverview("AAPL");
      expect(result).not.toBeNull();
      expect(result!.symbol).toBe("AAPL");
      expect(result!.description).toBe("Apple designs consumer electronics.");
      expect(result!.sector).toBe("Technology");
      expect(result!.industry).toBe("Consumer Electronics");
      expect(result!.currency).toBe("USD");
      expect(result!.peRatio).toBe(28.5);
      expect(result!.pegRatio).toBe(2.1);
      expect(result!.eps).toBe(6.5);
      expect(result!.dividendPerShare).toBe(0.96);
      expect(result!.dividendYield).toBe(0.0055);
      expect(result!.beta).toBe(1.2);
      expect(result!.profitMargin).toBe(0.25);
      expect(result!.returnOnEquity).toBe(1.5);
      expect(result!.revenueTTM).toBe(400_000_000_000);
      expect(result!.analystTargetPrice).toBe(200);
      expect(result!.analystRatings).toEqual({
        strongBuy: 10,
        buy: 15,
        hold: 8,
        sell: 2,
        strongSell: 1,
      });
      expect(result!.fiftyDayMA).toBe(175);
      expect(result!.twoHundredDayMA).toBe(165);
      expect(result!.sharesOutstanding).toBe(16_000_000_000);
      expect(result!.forwardPE).toBe(25);
    });

    it("returns null when quoteSummary throws", async () => {
      mockQuoteSummary.mockRejectedValueOnce(new Error("not found"));

      const result = await provider.getOverview("INVALID");
      expect(result).toBeNull();
    });

    it("handles missing modules with defaults", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        summaryProfile: {},
        summaryDetail: {},
        financialData: {},
        defaultKeyStatistics: {},
        recommendationTrend: {},
      });

      const result = await provider.getOverview("AAPL");
      expect(result).not.toBeNull();
      expect(result!.symbol).toBe("AAPL");
      expect(result!.description).toBe("");
      expect(result!.currency).toBe("USD");
      expect(result!.peRatio).toBeNull();
      expect(result!.analystRatings).toBeNull();
    });
  });

  describe("getHistorical (default period)", () => {
    it("uses 1d interval for unknown period", async () => {
      mockChart.mockResolvedValueOnce({
        quotes: [{ date: new Date("2024-06-01"), open: 100, high: 105, low: 99, close: 102, volume: 50000 }],
      });

      const results = await provider.getHistorical("AAPL", "5d" as "1m");
      expect(results).toHaveLength(1);
      expect(mockChart).toHaveBeenCalledWith(
        "AAPL",
        expect.objectContaining({
          interval: "1d",
        }),
      );
    });
  });

  describe("getExchangeRate (success path)", () => {
    it("formats symbol as FROMTO=X and returns regularMarketPrice", async () => {
      mockQuote.mockResolvedValueOnce({ regularMarketPrice: 1.08 });

      const rate = await provider.getExchangeRate("EUR", "USD");
      expect(rate).toBe(1.08);
      expect(mockQuote).toHaveBeenCalledWith("EURUSD=X");
    });
  });

  describe("getIncomeStatement", () => {
    it("returns annual and quarterly data on success", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        incomeStatementHistory: {
          incomeStatementHistory: [
            {
              endDate: "2024-09-30",
              totalRevenue: 100_000,
              netIncome: 20_000,
            },
          ],
        },
        incomeStatementHistoryQuarterly: {
          incomeStatementHistory: [
            {
              endDate: "2024-09-30",
              totalRevenue: 25_000,
              netIncome: 5_000,
            },
          ],
        },
      });

      const result = await provider.getIncomeStatement("AAPL");
      expect(result).not.toBeNull();
      expect(result!.annual).toHaveLength(1);
      expect(result!.annual[0].fiscalDateEnding).toBe("2024-09-30");
      expect(result!.annual[0].totalRevenue).toBe(100_000);
      expect(result!.annual[0].netIncome).toBe(20_000);
      expect(result!.quarterly).toHaveLength(1);
      expect(result!.quarterly[0].totalRevenue).toBe(25_000);
    });

    it("returns null on error", async () => {
      mockQuoteSummary.mockRejectedValueOnce(new Error("service unavailable"));

      const result = await provider.getIncomeStatement("INVALID");
      expect(result).toBeNull();
    });
  });

  describe("getBalanceSheet", () => {
    it("returns annual and quarterly data on success", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        balanceSheetHistory: {
          balanceSheetStatements: [
            {
              endDate: "2024-09-30",
              totalAssets: 350_000,
              totalLiab: 250_000,
            },
          ],
        },
        balanceSheetHistoryQuarterly: {
          balanceSheetStatements: [
            {
              endDate: "2024-09-30",
              totalAssets: 340_000,
            },
          ],
        },
      });

      const result = await provider.getBalanceSheet("AAPL");
      expect(result).not.toBeNull();
      expect(result!.annual).toHaveLength(1);
      expect(result!.annual[0].fiscalDateEnding).toBe("2024-09-30");
      expect(result!.annual[0].totalAssets).toBe(350_000);
      expect(result!.annual[0].totalLiabilities).toBe(250_000);
      expect(result!.quarterly).toHaveLength(1);
    });

    it("returns null on error", async () => {
      mockQuoteSummary.mockRejectedValueOnce(new Error("not found"));

      const result = await provider.getBalanceSheet("INVALID");
      expect(result).toBeNull();
    });
  });

  describe("getCashFlow", () => {
    it("returns annual and quarterly data on success", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        cashflowStatementHistory: {
          cashflowStatements: [
            {
              endDate: "2024-09-30",
              totalCashFromOperatingActivities: 100_000,
              freeCashFlow: 80_000,
            },
          ],
        },
        cashflowStatementHistoryQuarterly: {
          cashflowStatements: [
            {
              endDate: "2024-09-30",
              capitalExpenditures: -5_000,
            },
          ],
        },
      });

      const result = await provider.getCashFlow("AAPL");
      expect(result).not.toBeNull();
      expect(result!.annual).toHaveLength(1);
      expect(result!.annual[0].fiscalDateEnding).toBe("2024-09-30");
      expect(result!.annual[0].operatingCashflow).toBe(100_000);
      expect(result!.annual[0].freeCashFlow).toBe(80_000);
      expect(result!.quarterly).toHaveLength(1);
    });

    it("returns null on error", async () => {
      mockQuoteSummary.mockRejectedValueOnce(new Error("rate limited"));

      const result = await provider.getCashFlow("INVALID");
      expect(result).toBeNull();
    });
  });

  describe("getEarnings", () => {
    it("returns quarterly earnings on success", async () => {
      mockQuoteSummary.mockResolvedValueOnce({
        earningsHistory: {
          history: [
            {
              quarter: "2024-09-30",
              epsActual: 1.64,
              epsEstimate: 1.60,
              epsDifference: 0.04,
              surprisePercent: 2.5,
            },
          ],
        },
      });

      const result = await provider.getEarnings("AAPL");
      expect(result).not.toBeNull();
      expect(result!.annual).toEqual([]);
      expect(result!.quarterly).toHaveLength(1);
      expect(result!.quarterly[0].fiscalDateEnding).toBe("2024-09-30");
      expect(result!.quarterly[0].reportedEPS).toBe(1.64);
      expect(result!.quarterly[0].estimatedEPS).toBe(1.60);
      expect(result!.quarterly[0].surprise).toBe(0.04);
      expect(result!.quarterly[0].surprisePercentage).toBe(2.5);
    });

    it("returns null on error", async () => {
      mockQuoteSummary.mockRejectedValueOnce(new Error("no earnings data"));

      const result = await provider.getEarnings("INVALID");
      expect(result).toBeNull();
    });
  });
});
