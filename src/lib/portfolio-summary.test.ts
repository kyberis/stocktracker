import { describe, expect, it } from "vitest";
import { calculatePortfolioTotals } from "./portfolio-summary";
import type { Holding, QuoteData } from "./types";
import { convertToEUR } from "./utils";

describe("calculatePortfolioTotals", () => {
  it("handles GBX holdings when provider labels quote currency as GBP", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        name: "Serabi Gold PLC",
        ticker: "SRB.L",
        isin: "GB00BG5NDX91",
        shares: 1275,
        purchasePrice: 155.843137,
        displayCurrency: "GBX",
        exchange: "LSE",
        valueInEUR: 5209.08,
      },
    ];

    const quotes: Record<string, QuoteData> = {
      "SRB.L": {
        symbol: "SRB.L",
        shortName: "Serabi Gold PLC",
        regularMarketPrice: 186, // pence-style value
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        currency: "GBP", // mislabeled by provider for this case
        regularMarketPreviousClose: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
      },
    };

    const exchangeRates = {
      EURGBP: 0.86,
    };

    const totals = calculatePortfolioTotals(holdings, quotes, exchangeRates);

    // Expected: 1275 * 186 pence = 2371.5 GBP -> 2757.56 EUR approx
    // If misread as GBP units directly this would explode to ~275k EUR.
    expect(totals.totalCurrentEUR).toBeGreaterThan(2000);
    expect(totals.totalCurrentEUR).toBeLessThan(10000);
  });

  it("prevents 100x inflation vs naive GBP interpretation", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        name: "Serabi Gold PLC",
        ticker: "SRB.L",
        isin: "GB00BG5NDX91",
        shares: 1275,
        purchasePrice: 155.843137,
        displayCurrency: "GBX",
        exchange: "LSE",
        valueInEUR: 5209.08,
      },
    ];

    const quotes: Record<string, QuoteData> = {
      "SRB.L": {
        symbol: "SRB.L",
        shortName: "Serabi Gold PLC",
        regularMarketPrice: 186, // pence-like quote
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        currency: "GBP", // provider label can be misleading here
        regularMarketPreviousClose: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
      },
    };

    const exchangeRates = {
      EURGBP: 0.86,
    };

    const quoteValue = holdings[0].shares * quotes["SRB.L"].regularMarketPrice;
    const naiveAsGBP = convertToEUR(quoteValue, "GBP", exchangeRates);
    const corrected = calculatePortfolioTotals(holdings, quotes, exchangeRates).totalCurrentEUR;

    // Naive path is inflated by interpreting pence as pounds.
    expect(naiveAsGBP / corrected).toBeGreaterThan(90);
    // Corrected path is in realistic portfolio range.
    expect(corrected).toBeLessThan(10000);
  });

  it("treats GBX holdings as pence even if quote currency is mislabeled as USD", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        name: "Serabi Gold PLC",
        ticker: "SRB.L",
        isin: "GB00BG5NDX91",
        shares: 1275,
        purchasePrice: 155.843137,
        displayCurrency: "GBX",
        exchange: "LSE",
        valueInEUR: 5209.08,
      },
    ];

    const quotes: Record<string, QuoteData> = {
      "SRB.L": {
        symbol: "SRB.L",
        shortName: "Serabi Gold PLC",
        regularMarketPrice: 186,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        currency: "USD", // mislabeled provider payload
        regularMarketPreviousClose: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
      },
    };

    const exchangeRates = {
      EURGBP: 0.86,
      EURUSD: 1.1,
    };

    const totals = calculatePortfolioTotals(holdings, quotes, exchangeRates);
    expect(totals.totalCurrentEUR).toBeGreaterThan(2000);
    expect(totals.totalCurrentEUR).toBeLessThan(10000);
  });

  it("falls back to stored value for suspicious GBX quote outliers", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        name: "Serabi Gold PLC",
        ticker: "SRB.L",
        isin: "GB00BG5NDX91",
        shares: 1275,
        purchasePrice: 155.843137,
        displayCurrency: "GBX",
        exchange: "LSE",
        valueInEUR: 5209.08,
      },
    ];

    const quotes: Record<string, QuoteData> = {
      "SRB.L": {
        symbol: "SRB.L",
        shortName: "Serabi Gold PLC",
        regularMarketPrice: 28600, // clearly outlier for this holding
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        currency: "GBP",
        regularMarketPreviousClose: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
      },
    };

    const exchangeRates = {
      EURGBP: 0.86,
    };

    const totals = calculatePortfolioTotals(holdings, quotes, exchangeRates);
    expect(totals.totalCurrentEUR).toBe(5209.08);
  });
});
