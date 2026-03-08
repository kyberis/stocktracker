import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("yahoo-finance2", () => {
  const mockQuote = vi.fn();
  const mockSearch = vi.fn();
  const mockHistorical = vi.fn();
  const mockQuoteSummary = vi.fn();

  return {
    default: class {
      quote = mockQuote;
      search = mockSearch;
      historical = mockHistorical;
      quoteSummary = mockQuoteSummary;
    },
    __mockQuote: mockQuote,
    __mockSearch: mockSearch,
    __mockHistorical: mockHistorical,
    __mockQuoteSummary: mockQuoteSummary,
  };
});

vi.mock("@/lib/metrics", () => ({
  providerRequestsTotal: { inc: vi.fn() },
  providerRequestDuration: { startTimer: () => vi.fn() },
}));

import { YahooProvider } from "@/lib/api-providers/yahoo";
import { providerRequestsTotal } from "@/lib/metrics";

const {
  __mockQuote: mockQuote,
  __mockSearch: mockSearch,
  __mockHistorical: mockHistorical,
  __mockQuoteSummary: mockQuoteSummary,
} = await import("yahoo-finance2") as Record<string, ReturnType<typeof vi.fn>>;

describe("Yahoo Finance chaos", () => {
  let provider: YahooProvider;

  beforeEach(() => {
    vi.clearAllMocks();
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
      mockHistorical.mockRejectedValueOnce(new Error("service unavailable"));

      await expect(provider.getHistorical("AAPL", "1m")).rejects.toThrow(
        "service unavailable",
      );

      expect(providerRequestsTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({ operation: "historical", status: "error" }),
      );
    });

    it("handles empty result array", async () => {
      mockHistorical.mockResolvedValueOnce([]);

      const results = await provider.getHistorical("AAPL", "1m");
      expect(results).toEqual([]);
    });

    it("coerces undefined numeric fields in results", async () => {
      mockHistorical.mockResolvedValueOnce([
        {
          date: new Date("2024-01-01"),
          open: undefined,
          high: undefined,
          low: undefined,
          close: undefined,
          volume: undefined,
        },
      ]);

      const results = await provider.getHistorical("AAPL", "1w");
      expect(results[0].open).toBe(0);
      expect(results[0].close).toBe(0);
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
  });
});
