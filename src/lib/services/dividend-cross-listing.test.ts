import { describe, expect, it } from "vitest";
import {
  computeEstimatedDividends,
  groupEstimatedDividendsByIssuer,
  type EstimatedDividend,
} from "@/lib/services/dividend-calculator";
import type { ExchangeRates, Holding, QuoteData } from "@/lib/types";

const fx: ExchangeRates = { EUR: 1, USD: 1.1, DKK: 7.45 };

function holding(partial: Partial<Holding> & Pick<Holding, "ticker">): Holding {
  return {
    id: partial.ticker,
    name: partial.ticker,
    shares: 10,
    purchasePrice: 100,
    purchaseDate: "",
    displayCurrency: "USD",
    isin: "",
    assetType: "stock",
    valueInEUR: 0,
    ...partial,
  } as Holding;
}

describe("TRF-007 cross-listing dividend grouping", () => {
  it("merges NVO and NOVO-B.CO into one issuer row", () => {
    const holdings = [
      holding({ ticker: "NVO", name: "Novo Nordisk ADR", shares: 5, displayCurrency: "USD" }),
      holding({ ticker: "NOVO-B.CO", name: "Novo Nordisk", shares: 8, displayCurrency: "DKK" }),
    ];
    const items: EstimatedDividend[] = [
      {
        ticker: "NVO",
        name: "Novo Nordisk ADR",
        shares: 5,
        annualDividendPerShare: 1,
        dividendYield: 2,
        yieldOnCost: 2,
        annualIncome: 5,
        currency: "USD",
        annualIncomeEUR: 4.5,
      },
      {
        ticker: "NOVO-B.CO",
        name: "Novo Nordisk",
        shares: 8,
        annualDividendPerShare: 10,
        dividendYield: 3.8,
        yieldOnCost: 3,
        annualIncome: 80,
        currency: "DKK",
        annualIncomeEUR: 10.7,
      },
    ];
    const grouped = groupEstimatedDividendsByIssuer(holdings, items);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.crossListingTickers?.length).toBeGreaterThan(0);
    expect([grouped[0]!.ticker, ...(grouped[0]!.crossListingTickers ?? [])].sort()).toEqual(
      ["NOVO-B.CO", "NVO"].sort(),
    );
    expect(grouped[0]!.annualIncomeEUR).toBeCloseTo(15.2, 5);
  });

  it("merges by shared ISIN", () => {
    const holdings = [
      holding({ ticker: "ITX.MC", isin: "ES0148396007", name: "Inditex" }),
      holding({ ticker: "IDEXY", isin: "ES0148396007", name: "Inditex ADR" }),
    ];
    const items: EstimatedDividend[] = [
      {
        ticker: "ITX.MC",
        name: "Inditex",
        shares: 10,
        annualDividendPerShare: 1,
        dividendYield: 2,
        yieldOnCost: null,
        annualIncome: 10,
        currency: "EUR",
        annualIncomeEUR: 10,
      },
      {
        ticker: "IDEXY",
        name: "Inditex ADR",
        shares: 20,
        annualDividendPerShare: 0.5,
        dividendYield: 2,
        yieldOnCost: null,
        annualIncome: 10,
        currency: "USD",
        annualIncomeEUR: 9,
      },
    ];
    const grouped = groupEstimatedDividendsByIssuer(holdings, items);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.shares).toBe(30);
  });

  it("clamps >15% yield to null with out_of_range reason", () => {
    const holdings = [holding({ ticker: "NVO", shares: 1 })];
    const quotes: Record<string, QuoteData> = {
      NVO: {
        regularMarketPrice: 10,
        currency: "USD",
        trailingAnnualDividendRate: 2,
        trailingAnnualDividendYield: 0.2,
      } as QuoteData,
    };
    // rate/price = 20% → clamped
    const rows = computeEstimatedDividends(holdings, quotes, fx);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.dividendYield).toBeNull();
    expect(rows[0]!.yieldUnavailableReason).toBe("out_of_range");
  });
});
