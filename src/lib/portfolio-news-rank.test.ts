import { describe, it, expect } from "vitest";
import {
  diversifyPortfolioNews,
  rankPortfolioNewsForTickers,
} from "@/lib/portfolio-news-rank";
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

describe("diversifyPortfolioNews", () => {
  it("does not let a heavy ticker monopolize when others have news", () => {
    const ordered = ["NVDA", "AAPL", "MSFT"];
    const articles = [
      art("nvda-1", "2026-05-10T10:00:00.000Z", ["NVDA"]),
      art("nvda-2", "2026-05-10T09:00:00.000Z", ["NVDA"]),
      art("nvda-3", "2026-05-10T08:00:00.000Z", ["NVDA"]),
      art("nvda-4", "2026-05-10T07:00:00.000Z", ["NVDA"]),
      art("aapl-1", "2026-05-09T10:00:00.000Z", ["AAPL"]),
      art("msft-1", "2026-05-08T10:00:00.000Z", ["MSFT"]),
    ];
    const diversified = diversifyPortfolioNews(articles, ordered, { limit: 6 });
    const titles = diversified.map((x) => x.title);
    expect(titles.slice(0, 3)).toEqual(["nvda-1", "aapl-1", "msft-1"]);
    expect(titles.filter((t) => t.startsWith("nvda")).length).toBeLessThanOrEqual(4);
    expect(titles).toContain("aapl-1");
    expect(titles).toContain("msft-1");
  });

  it("caps at maxPerTicker before filling remaining slots", () => {
    const ordered = ["NVDA", "AAPL"];
    const articles = [
      art("nvda-1", "2026-05-10T10:00:00.000Z", ["NVDA"]),
      art("nvda-2", "2026-05-10T09:00:00.000Z", ["NVDA"]),
      art("nvda-3", "2026-05-10T08:00:00.000Z", ["NVDA"]),
      art("aapl-1", "2026-05-09T10:00:00.000Z", ["AAPL"]),
      art("aapl-2", "2026-05-09T09:00:00.000Z", ["AAPL"]),
      art("aapl-3", "2026-05-09T08:00:00.000Z", ["AAPL"]),
    ];
    const diversified = diversifyPortfolioNews(articles, ordered, {
      limit: 4,
      maxPerTicker: 2,
    });
    expect(diversified.map((x) => x.title)).toEqual([
      "nvda-1",
      "aapl-1",
      "nvda-2",
      "aapl-2",
    ]);
  });

  it("honors limit and fills remaining from the heavy ticker", () => {
    const ordered = ["NVDA"];
    const articles = [
      art("nvda-1", "2026-05-10T10:00:00.000Z", ["NVDA"]),
      art("nvda-2", "2026-05-10T09:00:00.000Z", ["NVDA"]),
      art("nvda-3", "2026-05-10T08:00:00.000Z", ["NVDA"]),
      art("nvda-4", "2026-05-10T07:00:00.000Z", ["NVDA"]),
    ];
    const diversified = diversifyPortfolioNews(articles, ordered, {
      limit: 3,
      maxPerTicker: 2,
    });
    expect(diversified.map((x) => x.title)).toEqual(["nvda-1", "nvda-2", "nvda-3"]);
  });
});
