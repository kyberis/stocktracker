import { describe, expect, it } from "vitest";
import {
  buildDeterministicMatrixCellNarrative,
  buildMatrixCellBreakdown,
} from "./matrix-cell-breakdown";
import type { SnapshotHistoryPoint } from "./portfolio-performance-matrix";
import type { Holding, Transaction } from "./types";

const SNAPSHOTS: SnapshotHistoryPoint[] = [
  {
    date: "2026-01-01",
    value: 20000,
    invested: 18000,
    stockValue: 1000,
    etfValue: 0,
    fundValue: 0,
    cryptoValue: 18500,
  },
];

const BTC: Holding = {
  id: "h-btc",
  name: "Bitcoin",
  ticker: "BTC-USD",
  isin: "",
  assetType: "crypto",
  shares: 0.09381959,
  purchasePrice: 79223,
  displayCurrency: "EUR",
  exchange: "CRYPTO",
  valueInEUR: 6812,
};

describe("buildMatrixCellBreakdown", () => {
  it("shows large period loss when past snapshot >> current (crypto YTD case)", () => {
    const b = buildMatrixCellBreakdown({
      assetKey: "crypto",
      period: "ytd",
      displayMode: "currency",
      baseCurrency: "EUR",
      current: 6812,
      holdings: [BTC],
      transactions: [],
      exchangeRates: {},
      snapshots: SNAPSHOTS,
      currentByAsset: { crypto: 6812 },
      now: new Date("2026-08-12T00:00:00Z"),
    });
    expect(b.past).toBe(18500);
    expect(b.netCashFlow).toBe(0);
    expect(b.pl).toBeCloseTo(6812 - 18500, 0);
    expect(b.pl!).toBeLessThan(-6812);
    expect(b.notCostBasis).toBe(true);
    // vs purchase ≈ −620, not −11k
    expect(b.costBasis).toBeCloseTo(0.09381959 * 79223, 0);
    expect(b.unrealizedVsCost).toBeCloseTo(6812 - 0.09381959 * 79223, 0);
    expect(Math.abs(b.unrealizedVsCost!)).toBeLessThan(2000);
  });

  it("subtracts mid-window sell from currency P/L", () => {
    const sell: Transaction = {
      id: "tx1",
      holdingId: "h-etf",
      ticker: "ISOE.DE",
      assetType: "etf",
      type: "sell",
      date: "2026-06-26",
      shares: 10,
      pricePerShare: 65,
      totalAmount: 650,
      fees: 0,
      taxes: 0,
      currency: "EUR",
      notes: "",
      createdAt: "2026-06-26",
    };
    const snapshots: SnapshotHistoryPoint[] = [
      {
        date: "2025-12-01",
        value: 1200,
        invested: 1200,
        stockValue: 0,
        etfValue: 1200,
        fundValue: 0,
        cryptoValue: 0,
      },
    ];
    const b = buildMatrixCellBreakdown({
      assetKey: "etf",
      period: "ytd",
      displayMode: "currency",
      baseCurrency: "EUR",
      current: 550,
      holdings: [],
      transactions: [sell],
      exchangeRates: {},
      snapshots,
      currentByAsset: { etf: 550 },
      now: new Date("2026-08-03T00:00:00Z"),
    });
    expect(b.pl).toBeCloseTo(0, 0); // 550 − 1200 − (−650)
    expect(b.transactions).toHaveLength(1);
  });

  it("today mode uses day abs/pct and skips period txs", () => {
    const b = buildMatrixCellBreakdown({
      assetKey: "crypto",
      period: "today",
      displayMode: "currency",
      baseCurrency: "EUR",
      current: 6812,
      holdings: [BTC],
      transactions: [],
      exchangeRates: {},
      snapshots: SNAPSHOTS,
      currentByAsset: { crypto: 6812 },
      dayAbs: -10.54,
      dayPct: -0.15,
    });
    expect(b.pl).toBe(-10.54);
    expect(b.transactions).toHaveLength(0);
    expect(b.formula).toMatch(/day P\/L/);
  });
});

describe("buildDeterministicMatrixCellNarrative", () => {
  it("mentions not cost basis", () => {
    const b = buildMatrixCellBreakdown({
      assetKey: "crypto",
      period: "ytd",
      displayMode: "currency",
      baseCurrency: "EUR",
      current: 6812,
      holdings: [BTC],
      transactions: [],
      exchangeRates: {},
      snapshots: SNAPSHOTS,
      currentByAsset: { crypto: 6812 },
      now: new Date("2026-08-12T00:00:00Z"),
    });
    const text = buildDeterministicMatrixCellNarrative(b);
    expect(text.toLowerCase()).toMatch(/not.*purchase|snapshot/);
  });
});
