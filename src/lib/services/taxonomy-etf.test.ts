import { describe, it, expect } from "vitest";
import {
  computeTaxonomyAllocationsWithEtfSectorLookthrough,
  sectorAggregationKey,
} from "./taxonomy";
import type { Holding, QuoteData, ExchangeRates } from "@/lib/types";

const eurRates: ExchangeRates = { EURUSD: 1.1 };

function stockHolding(over: Partial<Holding> = {}): Holding {
  return {
    id: "1",
    name: "Test",
    ticker: "TEST",
    isin: "",
    shares: 10,
    purchasePrice: 1,
    displayCurrency: "EUR",
    exchange: "XETRA",
    valueInEUR: 100,
    ...over,
  };
}

const quote = (price: number): QuoteData => ({
  symbol: "TEST",
  shortName: "T",
  regularMarketPrice: price,
  regularMarketChange: 0,
  regularMarketChangePercent: 0,
  currency: "EUR",
  regularMarketPreviousClose: price,
  fiftyTwoWeekHigh: price,
  fiftyTwoWeekLow: price,
});

describe("computeTaxonomyAllocationsWithEtfSectorLookthrough", () => {
  it("splits ETF value by sector weights", () => {
    const holdings = [
      stockHolding({
        id: "a",
        ticker: "VWCE",
        assetType: "etf",
        sector: "Broad",
        shares: 1,
      }),
    ];
    const quotes: Record<string, QuoteData> = { VWCE: quote(100) };
    const weights = {
      VWCE: [
        { sector: "Technology", weight: 60 },
        { sector: "Healthcare", weight: 40 },
      ],
    };
    const out = computeTaxonomyAllocationsWithEtfSectorLookthrough(
      holdings,
      quotes,
      eurRates,
      "sector",
      "Unclassified",
      weights,
      true,
    );
    const tech = out.find((x) => x.label === "Technology");
    const hc = out.find((x) => x.label === "Healthcare");
    expect(tech?.valueEUR).toBeCloseTo(60, 5);
    expect(hc?.valueEUR).toBeCloseTo(40, 5);
  });

  it("falls back to holding sector when no weights", () => {
    const holdings = [stockHolding({ id: "a", ticker: "X", assetType: "etf", sector: "Funds" })];
    const quotes: Record<string, QuoteData> = { X: quote(50) };
    const out = computeTaxonomyAllocationsWithEtfSectorLookthrough(
      holdings,
      quotes,
      eurRates,
      "sector",
      "Unclassified",
      { X: null },
      true,
    );
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Funds");
    expect(out[0].valueEUR).toBe(500);
  });

  it("merges Yahoo ETF sector keys with stock sector labels (no duplicate rows)", () => {
    const holdings = [
      stockHolding({
        id: "stock1",
        ticker: "STK",
        assetType: "stock",
        name: "Some REIT",
        sector: "Real Estate",
        shares: 1,
      }),
      stockHolding({
        id: "etf1",
        ticker: "ETF1",
        assetType: "etf",
        sector: "Broad",
        shares: 1,
      }),
    ];
    const quotes: Record<string, QuoteData> = {
      STK: quote(100),
      ETF1: quote(100),
    };
    const weights = {
      ETF1: [{ sector: "realestate", weight: 100 }],
    };
    const out = computeTaxonomyAllocationsWithEtfSectorLookthrough(
      holdings,
      quotes,
      eurRates,
      "sector",
      "Unclassified",
      weights,
      true,
    );
    const realEstate = out.filter((x) => sectorAggregationKey(x.label) === "realestate");
    expect(realEstate).toHaveLength(1);
    expect(realEstate[0].label).toBe("Real Estate");
    expect(realEstate[0].valueEUR).toBeCloseTo(200, 5);
  });

  it("merges Information Technology with Technology", () => {
    const holdings = [
      stockHolding({ id: "a", ticker: "A", sector: "Information Technology", shares: 1 }),
      stockHolding({ id: "b", ticker: "B", sector: "Technology", shares: 1 }),
    ];
    const quotes: Record<string, QuoteData> = { A: quote(100), B: quote(50) };
    const out = computeTaxonomyAllocationsWithEtfSectorLookthrough(
      holdings,
      quotes,
      eurRates,
      "sector",
      "Unclassified",
      {},
      true,
    );
    const tech = out.filter((x) => sectorAggregationKey(x.label) === "technology");
    expect(tech).toHaveLength(1);
    expect(tech[0].label).toBe("Technology");
    expect(tech[0].valueEUR).toBeCloseTo(150, 5);
  });
});
