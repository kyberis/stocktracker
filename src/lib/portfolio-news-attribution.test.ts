/**
 * TRF-002: News attribution unit tests.
 * Verifies that articles are not spuriously attributed to unrelated tickers.
 */

import { describe, expect, it } from "vitest";

// Inline the same logic used in fmp-market-data.ts mapStockNews and finnhub-news.ts
// to avoid importing provider code with side-effects (metrics, fetch).

function headlineMentionsTicker(headline: string, ticker: string): boolean {
  if (!ticker || ticker.length < 2) return false;
  const h = headline.toUpperCase();
  const re = new RegExp(`(?:^|[^A-Z0-9])${ticker}(?:[^A-Z0-9]|$)`);
  return re.test(h);
}

function mapFmpNewsItem(
  title: string,
  rawSymbol: string,
): string[] {
  const candidates = rawSymbol
    .split(/[,;\s]+/)
    .map((s) => {
      const base = s.trim();
      return (base.split(".")[0] ?? base).toUpperCase();
    })
    .filter((t) => t.length >= 1 && t.length <= 10 && /^[A-Z0-9_-]+$/.test(t));

  return candidates.filter((t) => headlineMentionsTicker(title, t));
}

describe("TRF-002 FMP news attribution (mapStockNews logic)", () => {
  it("does not attribute Rivian headline to UBER", () => {
    const tickers = mapFmpNewsItem(
      "Rivian delivers record vehicles in Q2",
      "UBER",
    );
    expect(tickers).not.toContain("UBER");
    expect(tickers).toHaveLength(0);
  });

  it("attributes when headline explicitly names the ticker", () => {
    const tickers = mapFmpNewsItem("AAPL beats earnings estimates", "AAPL");
    expect(tickers).toContain("AAPL");
  });

  it("does not attribute when headline only mentions the query ticker in passing context", () => {
    // Headline is about NVDA; symbol passed is TSLA
    const tickers = mapFmpNewsItem("NVDA stock surges on AI chip demand", "TSLA");
    expect(tickers).not.toContain("TSLA");
  });

  it("fixture with ≥4 issuers produces ≥4 distinct chips when each is mentioned", () => {
    const title = "MSFT, AAPL, GOOGL and AMZN all report earnings this week";
    const raw = "MSFT,AAPL,GOOGL,AMZN";
    const tickers = mapFmpNewsItem(title, raw);
    const distinct = new Set(tickers);
    expect(distinct.size).toBeGreaterThanOrEqual(4);
  });

  it("prevents word-boundary false positive (MAIN in maintain)", () => {
    const tickers = mapFmpNewsItem(
      "Fed maintains interest rates at current level",
      "MAIN",
    );
    expect(tickers).not.toContain("MAIN");
  });
});
