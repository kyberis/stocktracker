import { describe, expect, it } from "vitest";
import { computeDayChangeByType, computeDayChangeHeadline } from "./day-change-pct";
import type { ExchangeRates, Holding, QuoteData } from "./types";

const EUR_RATES: ExchangeRates = { EURUSD: 1 / 0.92, EURGBP: 1 / 1.17 };

function holding(
  ticker: string,
  assetType: "stock" | "etf" | "crypto",
  shares: number,
  price: number,
  _change: number,
  exchange = "NASDAQ",
): Holding {
  return {
    id: ticker,
    ticker,
    name: ticker,
    isin: "",
    shares,
    purchasePrice: price,
    displayCurrency: "USD",
    assetType,
    exchange,
    valueInEUR: shares * price * 0.92,
  };
}

function quote(ticker: string, price: number, change: number): QuoteData {
  return {
    symbol: ticker,
    shortName: ticker,
    regularMarketPrice: price,
    regularMarketChange: change,
    regularMarketChangePercent: price > 0 ? (change / (price - change)) * 100 : 0,
    currency: "USD",
    regularMarketPreviousClose: price - change,
    fiftyTwoWeekHigh: price * 1.2,
    fiftyTwoWeekLow: price * 0.8,
  };
}

const MARKET_NOW = new Date("2026-05-27T15:00:00-04:00");

describe("computeDayChangeByType", () => {
  it("nets offsetting class moves to a near-zero portfolio day return", () => {
    const holdings = [
      holding("STK", "stock", 100, 645.4, 1.42, "NMS"),
      holding("ETF", "etf", 10, 148.59, -0.162, "NMS"),
      holding("BTC", "crypto", 1, 6659, -129, "CRYPTO"),
    ];
    const quotes: Record<string, QuoteData> = {
      STK: quote("STK", 645.4, 1.42),
      ETF: quote("ETF", 148.59, -0.162),
      BTC: quote("BTC", 6659, -129),
    };

    const { pct } = computeDayChangeByType(holdings, quotes, EUR_RATES, "EUR", MARKET_NOW);

    expect(pct.stock).toBeCloseTo(0.22, 1);
    expect(pct.etf).toBeCloseTo(-0.11, 1);
    expect(pct.crypto).toBeCloseTo(-1.9, 0);
    expect(Math.abs(pct.all ?? 0)).toBeLessThan(0.05);
  });

  it("includes all buckets when at least one market was open today", () => {
    const holdings = [holding("STK", "stock", 10, 100, 1, "NMS")];
    const quotes = { STK: quote("STK", 100, 1) };
    const { pct, abs } = computeDayChangeByType(holdings, quotes, EUR_RATES, "EUR", MARKET_NOW);
    expect(pct.all).toBeDefined();
    expect(abs.all).toBeDefined();
    expect(pct.stock).toBeCloseTo(1.01, 1);
  });

  it("headline matches the all-assets bucket from computeDayChangeByType", () => {
    const holdings = [
      holding("STK", "stock", 100, 645.4, 1.42, "NMS"),
      holding("ETF", "etf", 10, 148.59, -0.162, "NMS"),
    ];
    const quotes: Record<string, QuoteData> = {
      STK: quote("STK", 645.4, 1.42),
      ETF: quote("ETF", 148.59, -0.162),
    };
    const byType = computeDayChangeByType(holdings, quotes, EUR_RATES, "EUR", MARKET_NOW);
    const headline = computeDayChangeHeadline(holdings, quotes, EUR_RATES, "EUR", MARKET_NOW);
    expect(headline.pct).toBe(byType.pct.all);
    expect(headline.abs).toBe(byType.abs.all);
  });
});
