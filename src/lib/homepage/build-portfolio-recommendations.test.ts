import { describe, expect, it } from "vitest";
import type { CashEntry, Holding, QuoteData } from "@/lib/types";
import {
  buildPortfolioRecommendations,
  filterRecommendationQueue,
  pickUnderweightSectors,
  REC_THRESHOLDS,
} from "./build-portfolio-recommendations";

function holding(partial: Partial<Holding> & Pick<Holding, "ticker">): Holding {
  return {
    id: partial.id ?? partial.ticker,
    ticker: partial.ticker,
    name: partial.name ?? partial.ticker,
    isin: partial.isin ?? "",
    shares: partial.shares ?? 10,
    purchasePrice: partial.purchasePrice ?? 100,
    displayCurrency: partial.displayCurrency ?? "EUR",
    exchange: partial.exchange ?? "XNAS",
    valueInEUR: partial.valueInEUR ?? 1000,
    sector: partial.sector,
    region: partial.region,
    assetType: partial.assetType ?? "stock",
  };
}

function quote(symbol: string, price: number, currency = "EUR"): QuoteData {
  return {
    symbol,
    shortName: symbol,
    regularMarketPrice: price,
    regularMarketPreviousClose: price,
    regularMarketChange: 0,
    regularMarketChangePercent: 0,
    currency,
    fiftyTwoWeekHigh: price * 1.2,
    fiftyTwoWeekLow: price * 0.8,
  };
}

describe("pickUnderweightSectors", () => {
  it("prefers missing/low sectors", () => {
    const under = pickUnderweightSectors(
      [
        { label: "Technology", percent: 50 },
        { label: "Healthcare", percent: 5 },
      ],
      2,
    );
    expect(under).toHaveLength(2);
    expect(under[0]!.pct).toBeLessThanOrEqual(under[1]!.pct);
    expect(under.every((u) => u.label !== "Technology" || u.pct < 50)).toBe(true);
  });
});

describe("buildPortfolioRecommendations", () => {
  it("returns empty for no holdings", () => {
    expect(
      buildPortfolioRecommendations({
        holdings: [],
        cashEntries: [],
        quotes: {},
        exchangeRates: {},
        preferredCurrency: "EUR",
      }),
    ).toEqual([]);
  });

  it("emits diversify when few sectors / high HHI", () => {
    const holdings = [
      holding({ ticker: "AAPL", sector: "Technology", shares: 100, valueInEUR: 8000 }),
      holding({ ticker: "MSFT", sector: "Technology", shares: 50, valueInEUR: 2000 }),
    ];
    const quotes: Record<string, QuoteData> = {
      AAPL: quote("AAPL", 80, "USD"),
      MSFT: quote("MSFT", 40, "USD"),
    };
    const queue = buildPortfolioRecommendations({
      holdings,
      cashEntries: [],
      quotes,
      exchangeRates: { EURUSD: 1 },
      preferredCurrency: "EUR",
    });
    const diversify = queue.find((r) => r.kind === "diversify");
    expect(diversify).toBeTruthy();
    expect(diversify!.sectors).toHaveLength(2);
    expect(diversify!.key.startsWith("diversify:")).toBe(true);
  });

  it("emits concentration when single name >= threshold", () => {
    const holdings = [
      holding({ ticker: "AAPL", sector: "Technology", shares: 100, valueInEUR: 9000 }),
      holding({ ticker: "JNJ", sector: "Healthcare", shares: 10, valueInEUR: 1000 }),
    ];
    const quotes = {
      AAPL: quote("AAPL", 90, "USD"),
      JNJ: quote("JNJ", 100, "USD"),
    };
    const queue = buildPortfolioRecommendations({
      holdings,
      cashEntries: [],
      quotes,
      exchangeRates: { EURUSD: 1 },
      preferredCurrency: "EUR",
    });
    const conc = queue.find((r) => r.kind === "concentration");
    expect(conc?.ticker).toBe("AAPL");
    expect(conc?.pct).toBeGreaterThanOrEqual(REC_THRESHOLDS.singleHoldingPct);
  });

  it("emits cash_idle when cash >= threshold", () => {
    const holdings = [
      holding({ ticker: "VWCE", sector: "Diversified", shares: 10, valueInEUR: 7000 }),
      holding({ ticker: "AAPL", sector: "Technology", shares: 5, valueInEUR: 500 }),
      holding({ ticker: "JNJ", sector: "Healthcare", shares: 5, valueInEUR: 500 }),
      holding({ ticker: "XOM", sector: "Energy", shares: 5, valueInEUR: 500 }),
      holding({ ticker: "JPM", sector: "Financial Services", shares: 5, valueInEUR: 500 }),
    ];
    const cash: CashEntry[] = [
      {
        id: "c1",
        name: "EUR cash",
        amountEUR: 3000,
      },
    ];
    const quotes: Record<string, QuoteData> = Object.fromEntries(
      holdings.map((h) => [h.ticker, quote(h.ticker, 100, "EUR")]),
    );
    const queue = buildPortfolioRecommendations({
      holdings,
      cashEntries: cash,
      quotes,
      exchangeRates: {},
      preferredCurrency: "EUR",
    });
    expect(queue.some((r) => r.kind === "cash_idle")).toBe(true);
  });

  it("emits fx when dominant currency ≠ preferred", () => {
    const holdings = [
      holding({
        ticker: "AAPL",
        sector: "Technology",
        shares: 50,
        displayCurrency: "USD",
        valueInEUR: 5000,
      }),
      holding({
        ticker: "MSFT",
        sector: "Technology",
        shares: 40,
        displayCurrency: "USD",
        valueInEUR: 4000,
      }),
      holding({
        ticker: "SAP",
        sector: "Technology",
        shares: 5,
        displayCurrency: "EUR",
        valueInEUR: 500,
      }),
    ];
    const quotes = {
      AAPL: quote("AAPL", 100, "USD"),
      MSFT: quote("MSFT", 100, "USD"),
      SAP: quote("SAP", 100, "EUR"),
    };
    const queue = buildPortfolioRecommendations({
      holdings,
      cashEntries: [],
      quotes,
      exchangeRates: { EURUSD: 1 },
      preferredCurrency: "EUR",
    });
    const fx = queue.find((r) => r.kind === "fx");
    expect(fx?.currency).toBe("USD");
    expect(fx?.pct).toBeGreaterThanOrEqual(REC_THRESHOLDS.fxDominantPct);
  });

  it("filters dismissed keys", () => {
    const queue = buildPortfolioRecommendations({
      holdings: [
        holding({ ticker: "AAPL", sector: "Technology", shares: 100, valueInEUR: 9000 }),
        holding({ ticker: "MSFT", sector: "Technology", shares: 10, valueInEUR: 1000 }),
      ],
      cashEntries: [],
      quotes: { AAPL: quote("AAPL", 90, "USD"), MSFT: quote("MSFT", 100, "USD") },
      exchangeRates: { EURUSD: 1 },
      preferredCurrency: "EUR",
    });
    const keys = new Set(queue.map((r) => r.key));
    expect(keys.size).toBeGreaterThan(0);
    const filtered = filterRecommendationQueue(queue, keys);
    expect(filtered).toHaveLength(0);
  });

  it("uses valueInEUR when FX rates are missing so sector % are not all zero", () => {
    const holdings = [
      holding({
        ticker: "GOOGL",
        sector: "Communication Services",
        shares: 10,
        displayCurrency: "USD",
        valueInEUR: 9800,
      }),
      holding({
        ticker: "AAPL",
        sector: "Technology",
        shares: 5,
        displayCurrency: "USD",
        valueInEUR: 200,
      }),
    ];
    // Quotes in USD but empty rates — convertToEUR would NaN without fallback
    const quotes = {
      GOOGL: quote("GOOGL", 100, "USD"),
      AAPL: quote("AAPL", 100, "USD"),
    };
    const queue = buildPortfolioRecommendations({
      holdings,
      cashEntries: [],
      quotes,
      exchangeRates: {},
      preferredCurrency: "EUR",
    });
    const diversify = queue.find((r) => r.kind === "diversify");
    expect(diversify).toBeTruthy();
    expect(diversify!.bodyParams.topSector).toBe("Communication Services");
    expect(Number(diversify!.bodyParams.topPct)).toBeGreaterThan(50);
    // Communication Services is overweight — must not appear as a 0% underweight chip
    expect(diversify!.sectors).not.toContain("Communication Services");
    expect(diversify!.chips.some((c) => /Communication Services 0%/.test(c.label))).toBe(false);
  });
});
