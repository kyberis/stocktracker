import { describe, it, expect } from "vitest";
import { computeTaxonomyAllocationsWithEtfSectorLookthrough } from "./taxonomy";
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
});
