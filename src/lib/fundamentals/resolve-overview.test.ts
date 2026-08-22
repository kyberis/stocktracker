import { describe, it, expect, vi } from "vitest";
import type { CompanyOverview, StockDataProvider } from "@/lib/api-providers/types";
import { fetchResolvedOverview, overviewSymbolCandidates } from "./resolve-overview";

vi.mock("@/lib/api-providers/yahoo", () => ({
  YahooProvider: vi.fn().mockImplementation(() => ({ name: "yahoo" })),
}));

function stubProvider(
  name: string,
  getOverview: NonNullable<StockDataProvider["getOverview"]>,
): StockDataProvider {
  return {
    name,
    getQuote: vi.fn(),
    search: vi.fn(),
    getHistorical: vi.fn(),
    getExchangeRate: vi.fn(),
    getOverview,
  };
}

describe("overviewSymbolCandidates", () => {
  it("includes Yahoo aliases for Novo Nordisk Copenhagen", () => {
    const candidates = overviewSymbolCandidates("NOVO-B.CO");
    expect(candidates).toContain("NOVO-B.CO");
    expect(candidates).toContain("NVO");
  });

  it("includes Frankfurt fallbacks for German listings", () => {
    const candidates = overviewSymbolCandidates("W9C.DE");
    expect(candidates).toContain("W9C.DE");
    expect(candidates).toContain("W9C.F");
    expect(candidates).toContain("CSU.TO");
  });

  it("deduplicates candidates", () => {
    const candidates = overviewSymbolCandidates("GOOGL");
    expect(new Set(candidates).size).toBe(candidates.length);
    expect(candidates[0]).toBe("GOOGL");
  });
});

describe("fetchResolvedOverview", () => {
  it("falls back to Yahoo when FMP overview lacks valuation multiples", async () => {
    const sparseFmp: CompanyOverview = {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      description: "",
      exchange: "NASDAQ",
      currency: "USD",
      sector: "Technology",
      industry: "Internet",
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
    };
    const richYahoo: CompanyOverview = {
      ...sparseFmp,
      peRatio: 17.3,
      forwardPE: 23.2,
    };

    const fmpProvider = stubProvider("fmp", vi.fn().mockResolvedValue(sparseFmp));
    const yahooProvider = stubProvider("yahoo", vi.fn().mockResolvedValue(richYahoo));

    const { YahooProvider } = await import("@/lib/api-providers/yahoo");
    vi.mocked(YahooProvider).mockImplementation(() => yahooProvider as never);

    const resolved = await fetchResolvedOverview("user-1", "GOOGL", {
      provider: fmpProvider,
      backend: "fmp",
    });

    expect(resolved?.backend).toBe("yahoo");
    expect(resolved?.data.peRatio).toBe(17.3);
    expect(resolved?.data.forwardPE).toBe(23.2);
    expect(fmpProvider.getOverview).toHaveBeenCalled();
    expect(yahooProvider.getOverview).toHaveBeenCalled();
  });
});
