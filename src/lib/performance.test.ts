import { describe, expect, it } from "vitest";
import {
  calculateTTWROR,
  calculateXIRR,
  buildXIRRCashFlows,
  calculateWindowedModifiedDietzReturn,
} from "./performance";
import type { Transaction, ExchangeRates } from "./types";

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "tx-1",
    holdingId: "h-1",
    ticker: "AAPL",
    type: "buy",
    date: "2025-01-15",
    shares: 10,
    pricePerShare: 100,
    totalAmount: 1000,
    fees: 0,
    taxes: 0,
    currency: "EUR",
    notes: "",
    createdAt: "2025-01-15",
    ...overrides,
  };
}

const RATES: ExchangeRates = { EURUSD: 1.10, EURGBP: 0.85 };

describe("txAmountToEUR via calculateTTWROR", () => {
  it("EUR transactions pass through unchanged", () => {
    const txs = [makeTx({ totalAmount: 1000, currency: "EUR", date: "2025-01-15" })];
    const result = calculateTTWROR(txs, 1100, 1000, RATES);
    expect(result).toBeCloseTo(10, 0);
  });

  it("uses stored exchangeRateEur when available", () => {
    const txs = [
      makeTx({
        totalAmount: 1100,
        currency: "USD",
        exchangeRateEur: 1.10,
        date: "2025-01-15",
      }),
    ];
    // 1100 USD / 1.10 = 1000 EUR cost. Current value 1200 EUR.
    const result = calculateTTWROR(txs, 1200, 1000, RATES);
    expect(result).toBeCloseTo(20, 0);
  });

  it("falls back to current exchange rates when exchangeRateEur is missing", () => {
    const txs = [
      makeTx({
        totalAmount: 1100,
        currency: "USD",
        date: "2025-01-15",
      }),
    ];
    // 1100 USD / 1.10 (from RATES) = 1000 EUR cost. Current value 1200 EUR.
    const result = calculateTTWROR(txs, 1200, 1000, RATES);
    expect(result).toBeCloseTo(20, 0);
  });

  it("stored rate overrides current rate for non-EUR transactions", () => {
    const txs = [
      makeTx({
        totalAmount: 1000,
        currency: "USD",
        exchangeRateEur: 1.25,
        date: "2025-01-15",
      }),
    ];
    // 1000 USD / 1.25 = 800 EUR cost. Current value 900 EUR.
    const result = calculateTTWROR(txs, 900, 800, RATES);
    // Modified Dietz: (900 - 800) / 800 * 100 = 12.5%
    expect(result).toBeCloseTo(12.5, 0);
  });
});

describe("buildXIRRCashFlows", () => {
  it("converts amounts using stored exchange rate", () => {
    const txs = [
      makeTx({
        totalAmount: 1100,
        currency: "USD",
        exchangeRateEur: 1.10,
        date: "2025-01-15",
      }),
    ];
    const flows = buildXIRRCashFlows(txs, 1200, RATES);
    // Buy: -(1100/1.10) = -1000 EUR
    expect(flows[0].amount).toBeCloseTo(-1000, 2);
    // Current value
    expect(flows[1].amount).toBe(1200);
  });

  it("falls back to current rate when stored rate is missing", () => {
    const txs = [
      makeTx({
        totalAmount: 1100,
        currency: "USD",
        date: "2025-01-15",
      }),
    ];
    const flows = buildXIRRCashFlows(txs, 1200, RATES);
    // 1100 / 1.10 = 1000 EUR
    expect(flows[0].amount).toBeCloseTo(-1000, 2);
  });

  it("includes sell, dividend, and fee flows", () => {
    const txs = [
      makeTx({ type: "buy", totalAmount: 2200, currency: "USD", exchangeRateEur: 1.10, date: "2025-01-15" }),
      makeTx({ id: "tx-2", type: "sell", totalAmount: 550, currency: "USD", exchangeRateEur: 1.10, date: "2025-06-15" }),
      makeTx({ id: "tx-3", type: "dividend", totalAmount: 110, currency: "USD", exchangeRateEur: 1.10, date: "2025-09-15" }),
      makeTx({ id: "tx-4", type: "fee", totalAmount: 11, currency: "USD", exchangeRateEur: 1.10, date: "2025-09-20" }),
    ];
    const flows = buildXIRRCashFlows(txs, 1500, RATES);
    expect(flows).toHaveLength(5);
    expect(flows[0].amount).toBeCloseTo(-2000, 2); // buy
    expect(flows[1].amount).toBeCloseTo(500, 2);   // sell
    expect(flows[2].amount).toBeCloseTo(100, 2);   // dividend (no taxes)
    expect(flows[3].amount).toBeCloseTo(-10, 2);   // fee
    expect(flows[4].amount).toBe(1500);             // current value
  });

  it("subtracts taxes from dividend cash flows", () => {
    const txs = [
      makeTx({
        id: "tx-div", type: "dividend", totalAmount: 110, taxes: 22,
        currency: "USD", exchangeRateEur: 1.10, date: "2025-09-15",
      }),
    ];
    const flows = buildXIRRCashFlows(txs, 0, RATES);
    // gross 110 USD / 1.10 = 100 EUR, taxes 22 USD / 1.10 = 20 EUR → net 80 EUR
    expect(flows[0].amount).toBeCloseTo(80, 2);
  });
});

describe("calculateXIRR", () => {
  it("returns null for less than 2 cash flows", () => {
    expect(calculateXIRR([])).toBeNull();
    expect(calculateXIRR([{ date: new Date(), amount: -1000 }])).toBeNull();
  });

  it("returns null for span under 7 days", () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
    expect(calculateXIRR([
      { date: twoDaysAgo, amount: -1000 },
      { date: now, amount: 1050 },
    ])).toBeNull();
  });

  it("computes a positive IRR for a profitable investment", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2025-01-01");
    const irr = calculateXIRR([
      { date: start, amount: -1000 },
      { date: end, amount: 1100 },
    ]);
    expect(irr).not.toBeNull();
    expect(irr!).toBeGreaterThan(0);
    expect(irr!).toBeCloseTo(10, 0);
  });

  it("returns null when solver cannot converge", () => {
    const start = new Date("2024-01-01");
    const mid = new Date("2024-06-01");
    const end = new Date("2025-01-01");
    const irr = calculateXIRR([
      { date: start, amount: -1 },
      { date: mid, amount: -100000 },
      { date: end, amount: 50 },
    ]);
    expect(irr).toBeNull();
  });
});

describe("calculateTTWROR fallback", () => {
  it("falls back to simple return when Modified Dietz produces extreme values", () => {
    const firstDate = new Date();
    firstDate.setFullYear(firstDate.getFullYear() - 1);
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 2);

    const txs = [
      makeTx({ totalAmount: 1000, date: firstDate.toISOString().slice(0, 10), type: "buy" }),
      makeTx({ id: "tx-2", totalAmount: 900, date: firstDate.toISOString().slice(0, 10), type: "sell" }),
      makeTx({ id: "tx-3", totalAmount: 100000, date: recentDate.toISOString().slice(0, 10), type: "buy" }),
    ];
    const currentValue = 50000;
    const totalInvested = 100100;
    const result = calculateTTWROR(txs, currentValue, totalInvested, RATES);
    const simpleReturn = ((currentValue - totalInvested) / totalInvested) * 100;
    expect(result).toBeCloseTo(simpleReturn, 2);
  });
});

describe("calculateWindowedModifiedDietzReturn (TRF-028)", () => {
  it("attributes a mid-period sell as an outflow, not a loss — hand-computed", () => {
    // 10-day window. €1000 at start. Sell €500 on day 5 (weight 0.5 of the
    // window remains after the flow). Ends at €550.
    // R = (Vend − Vstart − CF) / (Vstart + Σ w·cf)
    //   CF = −500 (sell = outflow from this bucket)
    //   Σ w·cf = 0.5 × −500 = −250
    //   R = (550 − 1000 − (−500)) / (1000 + (−250)) = 50 / 750 = 6.666...%
    const txs = [
      makeTx({ type: "sell", date: "2026-01-06", totalAmount: 500, fees: 0, taxes: 0, currency: "EUR" }),
    ];
    const result = calculateWindowedModifiedDietzReturn(1000, 550, txs, "2026-01-01", "2026-01-11", RATES, "EUR");
    expect(result).toBeCloseTo((50 / 750) * 100, 6);
    expect(result).toBeCloseTo(6.6667, 3);

    // The naive (end − start) / start a sale-blind calc would show for the
    // same inputs — this is exactly the -85%-style distortion TRF-028
    // reported. Dietz must land far from it here, not reproduce it.
    const naive = ((550 - 1000) / 1000) * 100;
    expect(naive).toBeCloseTo(-45, 6);
    expect(result).not.toBeCloseTo(naive, 0);
  });

  it("matches the simple return when there are no flows in the window", () => {
    const result = calculateWindowedModifiedDietzReturn(1000, 1100, [], "2026-01-01", "2026-01-11", RATES, "EUR");
    expect(result).toBeCloseTo(10, 6);
  });

  it("ignores flows outside the window", () => {
    const txs = [
      makeTx({ type: "sell", date: "2025-06-01", totalAmount: 500 }), // before the window
      makeTx({ id: "tx-2", type: "buy", date: "2026-06-01", totalAmount: 500 }), // after the window
    ];
    const result = calculateWindowedModifiedDietzReturn(1000, 1100, txs, "2026-01-01", "2026-01-11", RATES, "EUR");
    expect(result).toBeCloseTo(10, 6); // unaffected — same as the no-flows case
  });

  it("returns null when valueAtStart is unavailable (must degrade to —, never 0%)", () => {
    expect(calculateWindowedModifiedDietzReturn(null, 1100, [], "2026-01-01", "2026-01-11", RATES)).toBeNull();
    expect(calculateWindowedModifiedDietzReturn(0, 1100, [], "2026-01-01", "2026-01-11", RATES)).toBeNull();
    expect(calculateWindowedModifiedDietzReturn(-5, 1100, [], "2026-01-01", "2026-01-11", RATES)).toBeNull();
  });

  it("returns null when the weighted denominator collapses to ~0", () => {
    // A same-day full liquidation right at period start can zero the
    // denominator (Vstart + weight≈1 × −Vstart ≈ 0) — no honest rate exists.
    const txs = [makeTx({ type: "sell", date: "2026-01-01", totalAmount: 1000 })];
    const result = calculateWindowedModifiedDietzReturn(1000, 0, txs, "2026-01-01", "2026-01-11", RATES, "EUR");
    expect(result).toBeNull();
  });

  it("converts non-EUR flows via the stored historical rate, like calculateTTWROR", () => {
    const txs = [
      makeTx({
        type: "sell",
        date: "2026-01-06",
        totalAmount: 550,
        currency: "USD",
        exchangeRateEur: 1.10, // 550 USD / 1.10 = 500 EUR
      }),
    ];
    const result = calculateWindowedModifiedDietzReturn(1000, 550, txs, "2026-01-01", "2026-01-11", RATES, "EUR");
    expect(result).toBeCloseTo((50 / 750) * 100, 3); // identical to the EUR fixture above
  });
});
