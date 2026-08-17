import { describe, expect, it } from "vitest";
import type { NewsArticle } from "@/lib/api-providers/types";
import {
  isHttpUrl,
  isWithinLookback,
  selectAlertHeadlines,
} from "./alert-context";

function article(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    title: "Apple reports earnings",
    url: "https://example.com/aapl",
    source: "Reuters",
    publishedAt: new Date().toISOString(),
    summary: "",
    overallSentiment: "",
    overallSentimentScore: 0,
    tickerSentiment: [],
    topics: [],
    ...overrides,
  };
}

describe("alert-context", () => {
  it("accepts only http(s) urls", () => {
    expect(isHttpUrl("https://example.com/x")).toBe(true);
    expect(isHttpUrl("http://example.com/x")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("not-a-url")).toBe(false);
  });

  it("keeps articles inside the lookback window", () => {
    const now = Date.parse("2026-08-17T12:00:00Z");
    expect(isWithinLookback("2026-08-16T12:00:00Z", now)).toBe(true);
    expect(isWithinLookback("2026-08-14T11:00:00Z", now)).toBe(false);
    expect(isWithinLookback("not-a-date", now)).toBe(false);
  });

  it("selects up to three recent headlines for a ticker", () => {
    const now = Date.parse("2026-08-17T12:00:00Z");
    const headlines = selectAlertHeadlines(
      [
        article({ title: "Old", publishedAt: "2026-08-01T00:00:00Z" }),
        article({ title: "Newest", publishedAt: "2026-08-17T10:00:00Z", url: "https://example.com/1" }),
        article({ title: "Middle", publishedAt: "2026-08-16T10:00:00Z", url: "https://example.com/2" }),
        article({ title: "Older", publishedAt: "2026-08-16T08:00:00Z", url: "https://example.com/3" }),
        article({ title: "Fourth", publishedAt: "2026-08-16T07:00:00Z", url: "https://example.com/4" }),
        article({ title: "Bad url", url: "ftp://example.com/x", publishedAt: "2026-08-17T11:00:00Z" }),
      ],
      { now, maxHeadlines: 3 },
    );
    expect(headlines.map((h) => h.title)).toEqual(["Newest", "Middle", "Older"]);
    expect(headlines[0]?.source).toBe("Reuters");
  });

  it("returns empty when nothing is usable", () => {
    expect(selectAlertHeadlines([article({ title: "", url: "https://example.com/x" })])).toEqual([]);
  });
});
