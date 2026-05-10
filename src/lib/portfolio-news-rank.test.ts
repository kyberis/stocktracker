import { describe, it, expect } from "vitest";
import { rankPortfolioNewsForTickers } from "@/lib/portfolio-news-rank";
import type { NewsArticle } from "@/lib/types";

function art(
  title: string,
  publishedAt: string,
  tickers: string[],
): NewsArticle {
  return {
    title,
    url: `https://example.com/${title}`,
    source: "x",
    publishedAt,
    summary: "",
    overallSentiment: "",
    overallSentimentScore: 0,
    tickerSentiment: tickers.map((ticker) => ({
      ticker,
      relevance: 1,
      sentimentScore: 0,
      sentimentLabel: "",
    })),
    topics: [],
  };
}

describe("rankPortfolioNewsForTickers", () => {
  it("orders by holding weight index then date", () => {
    const ordered = ["NVDA", "AAPL"];
    const a = art("nvda old", "2026-01-01T00:00:00.000Z", ["NVDA"]);
    const b = art("aapl new", "2026-05-01T00:00:00.000Z", ["AAPL"]);
    const c = art("both", "2026-03-01T00:00:00.000Z", ["MSFT"]);
    const ranked = rankPortfolioNewsForTickers([b, c, a], ordered);
    expect(ranked.map((x) => x.title)).toEqual(["nvda old", "aapl new", "both"]);
  });

  it("newer first when same best holding rank", () => {
    const ordered = ["AAPL", "MSFT"];
    const old = art("old", "2026-01-01T00:00:00.000Z", ["AAPL"]);
    const newer = art("new", "2026-05-01T00:00:00.000Z", ["AAPL"]);
    const ranked = rankPortfolioNewsForTickers([old, newer], ordered);
    expect(ranked.map((x) => x.title)).toEqual(["new", "old"]);
  });
});
