import { describe, expect, it } from "vitest";
import {
  calculatePortfolioTotals,
  computeAllocationByType,
} from "./portfolio-summary";
import type { CashEntry, Holding, QuoteData } from "./types";
import { convertToEUR } from "./utils";

const emptyRates = {};
const eurRates = { EURUSD: 1.08, EURGBP: 0.86 };

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: "1",
    name: "Test",
    ticker: "TEST",
    isin: "",
    shares: 10,
    purchasePrice: 100,
    displayCurrency: "EUR",
    exchange: "",
    valueInEUR: 1000,
    ...overrides,
  };
}

function quote(overrides: Partial<QuoteData> = {}): QuoteData {
  return {
    symbol: "TEST",
    shortName: "Test",
    regularMarketPrice: 100,
    regularMarketChange: 0,
    regularMarketChangePercent: 0,
    currency: "EUR",
    regularMarketPreviousClose: 0,
    fiftyTwoWeekHigh: 0,
    fiftyTwoWeekLow: 0,
    ...overrides,
  };
}

function cashEntry(overrides: Partial<CashEntry> = {}): CashEntry {
  return {
    id: "c1",
    name: "Cash",
    amountEUR: 100,
    ...overrides,
  };
}

describe("calculatePortfolioTotals", () => {
  it("uses principal as cost for fixed_return and accrued as current", () => {
    const cashEntries: CashEntry[] = [
      cashEntry({
        id: "fr1",
        name: "Civislend",
        // Stale mid-term amount — must recompute from schedule (matured → 1875)
        amountEUR: 0,
        type: "fixed_return",
        displayAmount: 1500,
        displayCurrency: "EUR",
        startDate: "2024-01-01",
        termMonths: 24,
        totalReturnPct: 25,
      }),
    ];
    const totals = calculatePortfolioTotals([], cashEntries, {}, emptyRates);
    expect(totals.totalCurrentEUR).toBe(1875);
    expect(totals.totalCostEUR).toBe(1500);
    expect(totals.totalGainLoss).toBeCloseTo(375, 5);
  });

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

    const totals = calculatePortfolioTotals(holdings, [], quotes, exchangeRates);

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
    const corrected = calculatePortfolioTotals(holdings, [], quotes, exchangeRates).totalCurrentEUR;

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

    const totals = calculatePortfolioTotals(holdings, [], quotes, exchangeRates);
    expect(totals.totalCurrentEUR).toBeGreaterThan(2000);
    expect(totals.totalCurrentEUR).toBeLessThan(10000);
  });

  it("uses stored valueInEUR when FX rate is missing instead of treating foreign as EUR", () => {
    const holdings: Holding[] = [
      holding({
        ticker: "215",
        shares: 2000,
        purchasePrice: 1.18,
        displayCurrency: "HKD",
        valueInEUR: 280.59,
      }),
    ];
    const quotes: Record<string, QuoteData> = {
      "215": quote({
        symbol: "215",
        regularMarketPrice: 1.18,
        currency: "HKD",
      }),
    };
    // No EURHKD — must not inflate to ~2360
    const totals = calculatePortfolioTotals(holdings, [], quotes, {});
    expect(totals.totalCurrentEUR).toBeCloseTo(280.59, 2);
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

    const totals = calculatePortfolioTotals(holdings, [], quotes, exchangeRates);
    expect(totals.totalCurrentEUR).toBe(5209.08);
  });

  it("respects USD currency for USD-denominated LSE ETFs (e.g. IB01.L)", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        name: "iShares $ Treasury Bond 0-1yr",
        ticker: "IB01.L",
        isin: "",
        shares: 10,
        purchasePrice: 110,
        displayCurrency: "USD",
        exchange: "LSE",
        valueInEUR: 1000,
      },
    ];

    const quotes: Record<string, QuoteData> = {
      "IB01.L": {
        symbol: "IB01.L",
        shortName: "iShares $ Treasury Bond 0-1yr",
        regularMarketPrice: 119.52,
        regularMarketChange: 0.2,
        regularMarketChangePercent: 0.17,
        currency: "USD",
        regularMarketPreviousClose: 119.32,
        fiftyTwoWeekHigh: 120,
        fiftyTwoWeekLow: 110,
      },
    };

    const exchangeRates = {
      EURUSD: 1.08,
      EURGBP: 0.86,
    };

    const totals = calculatePortfolioTotals(holdings, [], quotes, exchangeRates);
    const expectedEUR = (10 * 119.52) / 1.08;
    expect(totals.totalCurrentEUR).toBeCloseTo(expectedEUR, 0);
  });

  it("adds EUR cash balances into total value and total cost", () => {
    const holdings: Holding[] = [];
    const quotes: Record<string, QuoteData> = {};
    const exchangeRates = {};
    const cashEntries = [
      { id: "c1", name: "Cash EUR", amountEUR: 542.39 },
      { id: "c2", name: "Cash USD converted", amountEUR: 10.54 },
    ];

    const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates);
    expect(totals.totalCurrentEUR).toBeCloseTo(552.93, 2);
    expect(totals.totalCostEUR).toBeCloseTo(552.93, 2);
    expect(totals.totalGainLoss).toBeCloseTo(0, 6);
  });

  it("returns all zeros for empty holdings and empty cash", () => {
    const totals = calculatePortfolioTotals([], [], {}, emptyRates);
    expect(totals.totalCurrentEUR).toBe(0);
    expect(totals.totalCostEUR).toBe(0);
    expect(totals.totalGainLoss).toBe(0);
    expect(totals.totalGainLossPercent).toBe(0);
    expect(totals.dayGainLossEUR).toBe(0);
  });

  it("falls back to valueInEUR when holding has no matching quote", () => {
    const h = holding({
      ticker: "MISSING",
      shares: 10,
      purchasePrice: 50,
      valueInEUR: 500,
      displayCurrency: "EUR",
    });
    const totals = calculatePortfolioTotals([h], [], {}, emptyRates);
    expect(totals.totalCurrentEUR).toBe(500);
    expect(totals.totalCostEUR).toBe(500);
    expect(totals.totalGainLoss).toBe(0);
  });

  it("calculates day gain/loss from regularMarketChange", () => {
    const h = holding({ ticker: "AAPL", shares: 100, valueInEUR: 15000 });
    const q = quote({
      symbol: "AAPL",
      regularMarketPrice: 150,
      regularMarketChange: 2,
      currency: "USD",
    });
    const totals = calculatePortfolioTotals([h], [], { AAPL: q }, eurRates);
    // Day delta: 100 * 2 = 200 USD -> 200/1.08 ≈ 185.19 EUR
    expect(totals.dayGainLossEUR).toBeCloseTo(200 / 1.08, 0);
  });
});

describe("computeAllocationByType", () => {
  it("returns empty array for empty inputs (no holdings, no cash)", () => {
    const result = computeAllocationByType([], [], {}, emptyRates);
    expect(result).toEqual([]);
  });

  it("returns correct allocation for single stock holding with quote", () => {
    const h = holding({ ticker: "AAPL", shares: 10, valueInEUR: 1500, assetType: "stock" });
    const q = quote({ symbol: "AAPL", regularMarketPrice: 150, currency: "USD" });
    const result = computeAllocationByType([h], [], { AAPL: q }, eurRates);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: "stock",
      label: "Stocks",
      valueEUR: expect.any(Number),
      percent: 100,
      color: "#6366f1",
    });
    expect(result[0].valueEUR).toBeCloseTo((10 * 150) / 1.08, 0);
  });

  it("returns correct slices with percentages summing to 100 for mixed stocks + ETFs + cash", () => {
    const holdings: Holding[] = [
      holding({ ticker: "STK", shares: 10, valueInEUR: 500, assetType: "stock" }),
      holding({ ticker: "ETF", shares: 5, valueInEUR: 300, assetType: "etf" }),
    ];
    const quotes: Record<string, QuoteData> = {
      STK: quote({ symbol: "STK", regularMarketPrice: 50, currency: "EUR" }),
      ETF: quote({ symbol: "ETF", regularMarketPrice: 60, currency: "EUR" }),
    };
    const cashEntries: CashEntry[] = [cashEntry({ amountEUR: 100, type: "cash" })];
    const result = computeAllocationByType(holdings, cashEntries, quotes, emptyRates);
    expect(result).toHaveLength(3);
    const totalPercent = result.reduce((s, r) => s + r.percent, 0);
    expect(totalPercent).toBeCloseTo(100, 5);
    const stockSlice = result.find((r) => r.key === "stock");
    const etfSlice = result.find((r) => r.key === "etf");
    const cashSlice = result.find((r) => r.key === "cash");
    expect(stockSlice).toBeDefined();
    expect(etfSlice).toBeDefined();
    expect(cashSlice).toBeDefined();
    expect(stockSlice!.valueEUR).toBe(500);
    expect(etfSlice!.valueEUR).toBe(300);
    expect(cashSlice!.valueEUR).toBe(100);
  });

  it("falls back to valueInEUR when holding has no quote", () => {
    const h = holding({ ticker: "NOQUOTE", valueInEUR: 750, assetType: "stock" });
    const result = computeAllocationByType([h], [], {}, emptyRates);
    expect(result).toHaveLength(1);
    expect(result[0].valueEUR).toBe(750);
    expect(result[0].percent).toBe(100);
  });

  it("buckets cash entries by type (real_estate, savings, pension)", () => {
    const cashEntries: CashEntry[] = [
      cashEntry({ id: "c1", amountEUR: 100, type: "real_estate" }),
      cashEntry({ id: "c2", amountEUR: 200, type: "savings" }),
      cashEntry({ id: "c3", amountEUR: 150, type: "pension" }),
    ];
    const result = computeAllocationByType([], cashEntries, {}, emptyRates);
    expect(result).toHaveLength(3);
    const re = result.find((r) => r.key === "real_estate");
    const sav = result.find((r) => r.key === "savings");
    const pen = result.find((r) => r.key === "pension");
    expect(re?.valueEUR).toBe(100);
    expect(sav?.valueEUR).toBe(200);
    expect(pen?.valueEUR).toBe(150);
    expect(re?.label).toBe("Real Estate");
    expect(sav?.label).toBe("Savings");
    expect(pen?.label).toBe("Pension");
    const totalPercent = result.reduce((s, r) => s + r.percent, 0);
    expect(totalPercent).toBeCloseTo(100, 5);
  });

  it("defaults cash entry type to cash when type is omitted", () => {
    const cashEntries: CashEntry[] = [cashEntry({ amountEUR: 500 })];
    const result = computeAllocationByType([], cashEntries, {}, emptyRates);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("cash");
    expect(result[0].valueEUR).toBe(500);
  });

  it("buckets fixed_return cash entries using schedule accrual", () => {
    const cashEntries: CashEntry[] = [
      cashEntry({
        id: "fr1",
        // Stale/zero stored amount — valuation must come from the schedule
        amountEUR: 0,
        type: "fixed_return",
        displayAmount: 1500,
        startDate: "2024-01-01",
        termMonths: 24,
        totalReturnPct: 25,
      }),
    ];
    const result = computeAllocationByType([], cashEntries, {}, emptyRates);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("fixed_return");
    // Term ended 2026-01-01 → locked at maturity value 1875
    expect(result[0].valueEUR).toBe(1875);
  });

  it("shows fixed_return principal on start date even when amountEUR is stale zero", () => {
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const cashEntries: CashEntry[] = [
      cashEntry({
        id: "fr-today",
        amountEUR: 0,
        type: "fixed_return",
        displayAmount: 1500,
        startDate,
        termMonths: 24,
        totalReturnPct: 25,
      }),
    ];
    const result = computeAllocationByType([], cashEntries, {}, emptyRates);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("fixed_return");
    expect(result[0].valueEUR).toBe(1500);
  });


  it("defaults holding assetType to stock when omitted", () => {
    const h = holding({ ticker: "X", valueInEUR: 100, assetType: undefined });
    const result = computeAllocationByType([h], [], {}, emptyRates);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("stock");
  });
});
