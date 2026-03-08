import { describe, it, expect } from "vitest";
import {
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateAnnualizedVolatility,
  calculateBeta,
  computeDailyReturns,
  calculateFifoRealizedPL,
} from "../performance";
import type { Transaction } from "../types";

describe("calculateAnnualizedVolatility", () => {
  it("returns null for fewer than 2 data points", () => {
    expect(calculateAnnualizedVolatility([])).toBeNull();
    expect(calculateAnnualizedVolatility([1])).toBeNull();
  });

  it("returns a positive number for valid returns", () => {
    const returns = [0.5, -0.3, 0.7, -0.1, 0.4];
    const vol = calculateAnnualizedVolatility(returns);
    expect(vol).not.toBeNull();
    expect(vol!).toBeGreaterThan(0);
  });

  it("returns 0 for constant returns", () => {
    const returns = [0.5, 0.5, 0.5, 0.5, 0.5];
    const vol = calculateAnnualizedVolatility(returns);
    expect(vol).not.toBeNull();
    expect(vol!).toBeCloseTo(0, 5);
  });
});

describe("calculateSharpeRatio", () => {
  it("returns null for fewer than 2 data points", () => {
    expect(calculateSharpeRatio([], 3.5)).toBeNull();
    expect(calculateSharpeRatio([0.5], 3.5)).toBeNull();
  });

  it("returns null when volatility is zero (constant returns)", () => {
    const returns = [0.1, 0.1, 0.1, 0.1];
    expect(calculateSharpeRatio(returns, 3.5)).toBeNull();
  });

  it("returns a number for valid inputs", () => {
    const returns = [0.5, -0.3, 0.7, -0.1, 0.4, 1.0, -0.5];
    const sharpe = calculateSharpeRatio(returns, 3.5);
    expect(sharpe).not.toBeNull();
    expect(typeof sharpe).toBe("number");
  });
});

describe("calculateMaxDrawdown", () => {
  it("returns null for fewer than 2 values", () => {
    expect(calculateMaxDrawdown([])).toBeNull();
    expect(calculateMaxDrawdown([100])).toBeNull();
  });

  it("returns 0 for monotonically increasing values", () => {
    const dd = calculateMaxDrawdown([100, 110, 120, 130]);
    expect(dd).toBeCloseTo(0, 5);
  });

  it("correctly calculates a simple drawdown", () => {
    // Peak=100, trough=80 → drawdown = -20%
    const dd = calculateMaxDrawdown([100, 90, 80, 85, 95]);
    expect(dd).not.toBeNull();
    expect(dd!).toBeCloseTo(-20, 1);
  });

  it("returns a negative or zero percentage", () => {
    const values = [100, 110, 95, 105, 90, 115];
    const dd = calculateMaxDrawdown(values);
    expect(dd).not.toBeNull();
    expect(dd!).toBeLessThanOrEqual(0);
  });
});

describe("calculateBeta", () => {
  it("returns null for fewer than 2 data points", () => {
    expect(calculateBeta([], [])).toBeNull();
    expect(calculateBeta([0.5], [0.5])).toBeNull();
  });

  it("returns null when benchmark variance is zero", () => {
    const portfolio = [0.1, 0.2, 0.3];
    const benchmark = [0.1, 0.1, 0.1]; // zero variance
    expect(calculateBeta(portfolio, benchmark)).toBeNull();
  });

  it("returns ~1 when portfolio and benchmark are identical", () => {
    const returns = [0.5, -0.3, 0.7, -0.1, 0.4, 1.0];
    const beta = calculateBeta(returns, returns);
    expect(beta).not.toBeNull();
    expect(beta!).toBeCloseTo(1, 4);
  });

  it("returns a number for different portfolio and benchmark", () => {
    const portfolio = [0.5, -0.3, 0.7, -0.1, 0.4];
    const benchmark = [0.3, -0.1, 0.5, 0.2, 0.2];
    const beta = calculateBeta(portfolio, benchmark);
    expect(beta).not.toBeNull();
    expect(typeof beta).toBe("number");
  });
});

describe("computeDailyReturns", () => {
  it("returns empty for fewer than 2 values", () => {
    expect(computeDailyReturns([])).toEqual([]);
    expect(computeDailyReturns([100])).toEqual([]);
  });

  it("computes correct returns", () => {
    const returns = computeDailyReturns([100, 110, 99]);
    expect(returns).toHaveLength(2);
    expect(returns[0]).toBeCloseTo(10, 4); // 100→110 = +10%
    expect(returns[1]).toBeCloseTo(-10, 4); // 110→99 ≈ -10%
  });

  it("skips zero-value starting points", () => {
    const returns = computeDailyReturns([0, 100, 110]);
    expect(returns).toHaveLength(1); // only 100→110
    expect(returns[0]).toBeCloseTo(10, 4);
  });
});

/* ── FIFO Realized P&L ───────────────────────────────── */

function makeTx(overrides: Partial<Transaction> & { id: string; type: Transaction["type"] }): Transaction {
  return {
    holdingId: "h1",
    ticker: "AAPL",
    name: "Apple",
    exchange: "NASDAQ",
    isin: "",
    assetType: "stock",
    accountId: "",
    date: "2024-01-01",
    shares: 10,
    pricePerShare: 100,
    totalAmount: 1000,
    fees: 0,
    taxes: 0,
    currency: "EUR",
    displayCurrency: "EUR",
    exchangeRateEur: undefined,
    notes: "",
    sourceRef: "",
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("calculateFifoRealizedPL", () => {
  it("returns empty map when no transactions", () => {
    const result = calculateFifoRealizedPL([], {});
    expect(result.size).toBe(0);
  });

  it("returns empty map when only buys", () => {
    const txs = [makeTx({ id: "b1", type: "buy", shares: 10, totalAmount: 1000 })];
    const result = calculateFifoRealizedPL(txs, {});
    expect(result.size).toBe(0);
  });

  it("calculates simple FIFO gain", () => {
    const txs = [
      makeTx({ id: "b1", type: "buy", date: "2024-01-01", shares: 10, totalAmount: 1000, pricePerShare: 100 }),
      makeTx({ id: "s1", type: "sell", date: "2024-06-01", shares: 10, totalAmount: 1200, pricePerShare: 120 }),
    ];
    const result = calculateFifoRealizedPL(txs, {});
    expect(result.has("s1")).toBe(true);
    const pl = result.get("s1")!;
    expect(pl.realizedGainEUR).toBeCloseTo(200, 2);
    expect(pl.proceedsEUR).toBeCloseTo(1200, 2);
    expect(pl.costBasisEUR).toBeCloseTo(1000, 2);
  });

  it("calculates simple FIFO loss", () => {
    const txs = [
      makeTx({ id: "b1", type: "buy", date: "2024-01-01", shares: 10, totalAmount: 1000 }),
      makeTx({ id: "s1", type: "sell", date: "2024-06-01", shares: 10, totalAmount: 800 }),
    ];
    const result = calculateFifoRealizedPL(txs, {});
    const pl = result.get("s1")!;
    expect(pl.realizedGainEUR).toBeCloseTo(-200, 2);
  });

  it("includes fees in cost basis (buy fees increase cost)", () => {
    const txs = [
      makeTx({ id: "b1", type: "buy", date: "2024-01-01", shares: 10, totalAmount: 1000, fees: 10 }),
      makeTx({ id: "s1", type: "sell", date: "2024-06-01", shares: 10, totalAmount: 1200 }),
    ];
    const result = calculateFifoRealizedPL(txs, {});
    const pl = result.get("s1")!;
    // Cost basis = 1000 + 10 (fees) = 1010; proceeds = 1200; gain = 190
    expect(pl.costBasisEUR).toBeCloseTo(1010, 2);
    expect(pl.realizedGainEUR).toBeCloseTo(190, 2);
  });

  it("handles partial sell across two lots (FIFO order)", () => {
    const txs = [
      makeTx({ id: "b1", type: "buy", date: "2024-01-01", shares: 5, totalAmount: 500 }),  // lot 1: 5 × 100
      makeTx({ id: "b2", type: "buy", date: "2024-02-01", shares: 5, totalAmount: 600 }),  // lot 2: 5 × 120
      makeTx({ id: "s1", type: "sell", date: "2024-07-01", shares: 8, totalAmount: 960 }), // sell 8 @ 120
    ];
    const result = calculateFifoRealizedPL(txs, {});
    const pl = result.get("s1")!;
    // FIFO: use lot1 (5 × 100 = 500) + lot2 (3 × 120 = 360) = 860 cost
    expect(pl.costBasisEUR).toBeCloseTo(860, 2);
    expect(pl.realizedGainEUR).toBeCloseTo(960 - 860, 2);
  });

  it("handles GBX currency (pence→pounds before EUR conversion)", () => {
    // Buy 10 shares at 100 GBX each (= 1 GBP each), total 1000 GBX = 10 GBP
    // With EUR/GBP rate: 1 EUR = 0.85 GBP → 10 GBP = ~11.76 EUR
    const txs = [
      makeTx({
        id: "b1", type: "buy", date: "2024-01-01",
        ticker: "VOD", currency: "GBX", displayCurrency: "GBX",
        shares: 10, totalAmount: 1000, pricePerShare: 100,
        exchangeRateEur: 0.85, // 1 EUR = 0.85 GBP
      }),
      makeTx({
        id: "s1", type: "sell", date: "2024-06-01",
        ticker: "VOD", currency: "GBX", displayCurrency: "GBX",
        shares: 10, totalAmount: 1200, pricePerShare: 120,
        exchangeRateEur: 0.85,
      }),
    ];
    const result = calculateFifoRealizedPL(txs, {});
    const pl = result.get("s1")!;
    // Cost: 1000 GBX / 100 = 10 GBP / 0.85 ≈ 11.76 EUR
    // Proceeds: 1200 GBX / 100 = 12 GBP / 0.85 ≈ 14.12 EUR
    expect(pl.costBasisEUR).toBeCloseTo(10 / 0.85, 1);
    expect(pl.proceedsEUR).toBeCloseTo(12 / 0.85, 1);
    expect(pl.realizedGainEUR).toBeCloseTo((12 - 10) / 0.85, 1);
  });

  it("skips lots with missing exchange rate when no fallback available", () => {
    // USD buy with no exchangeRateEur and no rates map → lot skipped → no FIFO data for sell
    const txs = [
      makeTx({
        id: "b1", type: "buy", date: "2024-01-01",
        currency: "USD", displayCurrency: "USD",
        shares: 10, totalAmount: 1000,
        exchangeRateEur: undefined,
      }),
      makeTx({
        id: "s1", type: "sell", date: "2024-06-01",
        currency: "USD", displayCurrency: "USD",
        shares: 10, totalAmount: 1200,
        exchangeRateEur: undefined,
      }),
    ];
    // No exchange rates provided → can't convert USD → buy lot skipped, sell also skipped
    const result = calculateFifoRealizedPL(txs, {});
    expect(result.has("s1")).toBe(false);
  });

  it("uses exchange rates fallback for USD when historical rate missing", () => {
    const txs = [
      makeTx({
        id: "b1", type: "buy", date: "2024-01-01",
        currency: "USD", displayCurrency: "USD",
        shares: 10, totalAmount: 1000,
        exchangeRateEur: undefined,
      }),
      makeTx({
        id: "s1", type: "sell", date: "2024-06-01",
        currency: "USD", displayCurrency: "USD",
        shares: 10, totalAmount: 1200,
        exchangeRateEur: undefined,
      }),
    ];
    // Provide live exchange rates: EURUSD = 1.1
    const rates = { EURUSD: 1.1 };
    const result = calculateFifoRealizedPL(txs, rates);
    expect(result.has("s1")).toBe(true);
    const pl = result.get("s1")!;
    expect(pl.costBasisEUR).toBeCloseTo(1000 / 1.1, 1);
    expect(pl.proceedsEUR).toBeCloseTo(1200 / 1.1, 1);
  });
});
