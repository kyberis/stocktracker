import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/portfolio-news", () => ({
  normalizePortfolioNewsSymbol: (t: string) => {
    const base = t.includes(".") ? (t.split(".")[0] ?? t) : t;
    return base.toUpperCase().trim();
  },
  listSymbolsNeedingProviderFetch: vi.fn(),
  listPortfolioNewsForTickers: vi.fn(),
  ingestNewsArticles: vi.fn(),
  touchSymbolFetchMeta: vi.fn(),
}));

vi.mock("@/lib/api-providers/finnhub-news", () => ({
  fetchFinnhubPortfolioNews: vi.fn(),
}));

vi.mock("@/lib/market-data/resolve-provider", () => ({
  resolvePremiumStockDataProvider: vi.fn(),
}));

import {
  ingestNewsArticles,
  listPortfolioNewsForTickers,
  listSymbolsNeedingProviderFetch,
  touchSymbolFetchMeta,
} from "@/lib/db/portfolio-news";
import { fetchFinnhubPortfolioNews } from "@/lib/api-providers/finnhub-news";
import { resolvePremiumStockDataProvider } from "@/lib/market-data/resolve-provider";
import { ensureTickerNews } from "./ensure-ticker-news";

describe("ensureTickerNews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("FINNHUB_API_KEY", "test-key");
  });

  it("returns empty note when no valid tickers", async () => {
    const result = await ensureTickerNews("u1", ["", "  "]);
    expect(result.articles).toEqual([]);
    expect(result.note).toMatch(/No valid tickers/i);
    expect(listSymbolsNeedingProviderFetch).not.toHaveBeenCalled();
  });

  it("reads cache without refresh when symbols are fresh", async () => {
    vi.mocked(listSymbolsNeedingProviderFetch).mockResolvedValue([]);
    vi.mocked(listPortfolioNewsForTickers).mockResolvedValue([
      {
        title: "Uber slides on outlook",
        url: "https://example.com/1",
        source: "Reuters",
        publishedAt: "2026-08-12T10:00:00Z",
        summary: "Shares fell after guidance cut.",
        overallSentiment: "Bearish",
        overallSentimentScore: -0.4,
        tickerSentiment: [{ ticker: "UBER", relevance: 0.9, sentimentScore: -0.5, sentimentLabel: "Bearish" }],
        topics: [],
      },
    ]);

    const result = await ensureTickerNews("u1", ["UBER"]);
    expect(result.refreshed).toBe(false);
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.title).toContain("Uber");
    expect(fetchFinnhubPortfolioNews).not.toHaveBeenCalled();
    expect(ingestNewsArticles).not.toHaveBeenCalled();
  });

  it("refreshes via Finnhub when cache needs fetch", async () => {
    vi.mocked(listSymbolsNeedingProviderFetch).mockResolvedValue(["UBER"]);
    vi.mocked(resolvePremiumStockDataProvider).mockResolvedValue(null);
    vi.mocked(fetchFinnhubPortfolioNews).mockResolvedValue([
      {
        title: "Uber news",
        url: "https://example.com/2",
        source: "Finnhub",
        publishedAt: "2026-08-12T12:00:00Z",
        summary: "Company update",
        overallSentiment: "",
        overallSentimentScore: 0,
        tickerSentiment: [{ ticker: "UBER", relevance: 0.9, sentimentScore: 0, sentimentLabel: "" }],
        topics: [],
      },
    ]);
    vi.mocked(listPortfolioNewsForTickers).mockResolvedValue([
      {
        title: "Uber news",
        url: "https://example.com/2",
        source: "Finnhub",
        publishedAt: "2026-08-12T12:00:00Z",
        summary: "Company update",
        overallSentiment: "",
        overallSentimentScore: 0,
        tickerSentiment: [{ ticker: "UBER", relevance: 0.9, sentimentScore: 0, sentimentLabel: "" }],
        topics: [],
      },
    ]);

    const result = await ensureTickerNews("u1", ["uber"]);
    expect(result.refreshed).toBe(true);
    expect(fetchFinnhubPortfolioNews).toHaveBeenCalledWith(["UBER"], "test-key");
    expect(ingestNewsArticles).toHaveBeenCalled();
    expect(touchSymbolFetchMeta).toHaveBeenCalledWith(["UBER"]);
    expect(result.articles[0]?.title).toBe("Uber news");
  });
});
