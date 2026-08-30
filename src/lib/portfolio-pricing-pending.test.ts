import { describe, expect, it } from "vitest";
import { isPortfolioPricingPending } from "./portfolio-pricing-pending";
import type { Holding, QuoteData } from "./types";

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: "h1",
    name: "Apple",
    ticker: "AAPL",
    shares: 10,
    purchasePrice: 100,
    displayCurrency: "USD",
    exchange: "NMS",
    valueInEUR: 0,
    ...overrides,
  };
}

function quote(overrides: Partial<QuoteData> = {}): QuoteData {
  return {
    regularMarketPrice: 190,
    currency: "USD",
    ...overrides,
  } as QuoteData;
}

describe("isPortfolioPricingPending", () => {
  it("is false with no holdings", () => {
    expect(
      isPortfolioPricingPending({
        holdings: [],
        quotes: {},
        exchangeRates: {},
        baseCurrency: "EUR",
      }),
    ).toBe(false);
  });

  it("is true while a ticker quote is refreshing", () => {
    expect(
      isPortfolioPricingPending({
        holdings: [holding()],
        quotes: {},
        exchangeRates: { EURUSD: 1.1 },
        baseCurrency: "EUR",
        refreshingTickers: new Set(["AAPL"]),
      }),
    ).toBe(true);
  });

  it("is true when quote is missing", () => {
    expect(
      isPortfolioPricingPending({
        holdings: [holding()],
        quotes: {},
        exchangeRates: { EURUSD: 1.1 },
        baseCurrency: "EUR",
      }),
    ).toBe(true);
  });

  it("is true when quote exists but FX for quote currency is missing", () => {
    expect(
      isPortfolioPricingPending({
        holdings: [holding()],
        quotes: { AAPL: quote() },
        exchangeRates: {},
        baseCurrency: "EUR",
      }),
    ).toBe(true);
  });

  it("is false when quote and FX are ready", () => {
    expect(
      isPortfolioPricingPending({
        holdings: [holding()],
        quotes: { AAPL: quote() },
        exchangeRates: { EURUSD: 1.1 },
        baseCurrency: "EUR",
      }),
    ).toBe(false);
  });

  it("is false for EUR holdings with quote and no FX table needed", () => {
    expect(
      isPortfolioPricingPending({
        holdings: [holding({ displayCurrency: "EUR" })],
        quotes: { AAPL: quote({ currency: "EUR" }) },
        exchangeRates: {},
        baseCurrency: "EUR",
      }),
    ).toBe(false);
  });

  it("is true when isRefreshing even if quotes look complete", () => {
    expect(
      isPortfolioPricingPending({
        holdings: [holding()],
        quotes: { AAPL: quote() },
        exchangeRates: { EURUSD: 1.1 },
        baseCurrency: "EUR",
        isRefreshing: true,
      }),
    ).toBe(true);
  });
});
