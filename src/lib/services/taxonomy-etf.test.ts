import { describe, it, expect } from "vitest";
import {
  computeTaxonomyAllocationsWithEtfLookthrough,
  sectorAggregationKey,
} from "./taxonomy";
import type { Holding, QuoteData, ExchangeRates, TaxonomyAllocation } from "@/lib/types";

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

describe("computeTaxonomyAllocationsWithEtfLookthrough — sector", () => {
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
    const out = computeTaxonomyAllocationsWithEtfLookthrough(
      holdings,
      quotes,
      eurRates,
      "sector",
      "Unclassified",
      weights,
      {},
      true,
    );
    const tech = out.find((x: TaxonomyAllocation) => x.label === "Technology");
    const hc = out.find((x: TaxonomyAllocation) => x.label === "Healthcare");
    expect(tech?.valueEUR).toBeCloseTo(60, 5);
    expect(hc?.valueEUR).toBeCloseTo(40, 5);
  });

  it("falls back to holding sector when no weights", () => {
    const holdings = [stockHolding({ id: "a", ticker: "X", assetType: "etf", sector: "Funds" })];
    const quotes: Record<string, QuoteData> = { X: quote(50) };
    const out = computeTaxonomyAllocationsWithEtfLookthrough(
      holdings,
      quotes,
      eurRates,
      "sector",
      "Unclassified",
      { X: null },
      {},
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
    const out = computeTaxonomyAllocationsWithEtfLookthrough(
      holdings,
      quotes,
      eurRates,
      "sector",
      "Unclassified",
      weights,
      {},
      true,
    );
    const realEstate = out.filter((x: TaxonomyAllocation) => sectorAggregationKey(x.label) === "realestate");
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
    const out = computeTaxonomyAllocationsWithEtfLookthrough(
      holdings,
      quotes,
      eurRates,
      "sector",
      "Unclassified",
      {},
      {},
      true,
    );
    const tech = out.filter((x: TaxonomyAllocation) => sectorAggregationKey(x.label) === "technology");
    expect(tech).toHaveLength(1);
    expect(tech[0].label).toBe("Technology");
    expect(tech[0].valueEUR).toBeCloseTo(150, 5);
  });
});

describe("computeTaxonomyAllocationsWithEtfLookthrough — assetClass", () => {
  it("splits ETF value by stock/bond/cash position weights", () => {
    const holdings = [
      stockHolding({
        id: "a",
        ticker: "AGGH",
        assetType: "etf",
        assetClass: "Fund",
        shares: 1,
      }),
    ];
    const quotes: Record<string, QuoteData> = { AGGH: quote(100) };
    const weights = {
      AGGH: [
        { assetClass: "Equity", weight: 70 },
        { assetClass: "Bond", weight: 25 },
        { assetClass: "Cash", weight: 5 },
      ],
    };
    const out = computeTaxonomyAllocationsWithEtfLookthrough(
      holdings,
      quotes,
      eurRates,
      "assetClass",
      "Unclassified",
      {},
      weights,
      true,
    );
    const equity = out.find((x: TaxonomyAllocation) => x.label === "Equity");
    const bond = out.find((x: TaxonomyAllocation) => x.label === "Bond");
    const cash = out.find((x: TaxonomyAllocation) => x.label === "Cash");
    expect(equity?.valueEUR).toBeCloseTo(70, 5);
    expect(bond?.valueEUR).toBeCloseTo(25, 5);
    expect(cash?.valueEUR).toBeCloseTo(5, 5);
  });

  it("buckets leftover preferred/convertible/other weight as Unclassified when it doesn't sum to 100", () => {
    const holdings = [
      stockHolding({ id: "a", ticker: "MIX", assetType: "etf", shares: 1 }),
    ];
    const quotes: Record<string, QuoteData> = { MIX: quote(100) };
    const weights = {
      MIX: [
        { assetClass: "Equity", weight: 90 },
      ],
    };
    const out = computeTaxonomyAllocationsWithEtfLookthrough(
      holdings,
      quotes,
      eurRates,
      "assetClass",
      "Unclassified",
      {},
      weights,
      true,
    );
    const unclassified = out.find((x: TaxonomyAllocation) => x.label === "Unclassified");
    expect(unclassified?.valueEUR).toBeCloseTo(10, 5);
  });

  it("falls back to the holding's own assetClass field when no ETF weights are available", () => {
    const holdings = [stockHolding({ id: "a", ticker: "X", assetType: "etf", assetClass: "Bond" })];
    const quotes: Record<string, QuoteData> = { X: quote(50) };
    const out = computeTaxonomyAllocationsWithEtfLookthrough(
      holdings,
      quotes,
      eurRates,
      "assetClass",
      "Unclassified",
      {},
      { X: null },
      true,
    );
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Bond");
    expect(out[0].valueEUR).toBe(500);
  });

  it("does not apply asset-class look-through to non-ETF holdings even when weights exist for the ticker", () => {
    const holdings = [stockHolding({ id: "a", ticker: "AAPL", assetType: "stock", assetClass: "Equity" })];
    const quotes: Record<string, QuoteData> = { AAPL: quote(10) };
    const weights = { AAPL: [{ assetClass: "Bond", weight: 100 }] };
    const out = computeTaxonomyAllocationsWithEtfLookthrough(
      holdings,
      quotes,
      eurRates,
      "assetClass",
      "Unclassified",
      {},
      weights,
      true,
    );
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Equity");
  });
});

describe("computeTaxonomyAllocationsWithEtfLookthrough — region (not supported by the data provider)", () => {
  it("falls back to plain per-holding allocation for region regardless of lookthrough flag", () => {
    const holdings = [
      stockHolding({ id: "a", ticker: "VWCE", assetType: "etf", region: "Global", shares: 1 }),
    ];
    const quotes: Record<string, QuoteData> = { VWCE: quote(100) };
    const out = computeTaxonomyAllocationsWithEtfLookthrough(
      holdings,
      quotes,
      eurRates,
      "region",
      "Unclassified",
      {},
      {},
      true,
    );
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Global");
  });
});
