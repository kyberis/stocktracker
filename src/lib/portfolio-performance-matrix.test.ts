import { describe, expect, it } from "vitest";
import {
  buildMatrixFromSnapshots,
  firstSnapshotAnchorDate,
  getMatrixPeriodAnchorDates,
  snapshotValueOnOrBefore,
  valueFromSnapshot,
  resolveMatrixAssetKeys,
  reconcileAllAssetsToday,
} from "./portfolio-performance-matrix";
import type { SnapshotHistoryPoint } from "./portfolio-performance-matrix";
import type { Transaction } from "./types";

const SNAPSHOTS: SnapshotHistoryPoint[] = [
  {
    date: "2024-01-01",
    value: 10000,
    invested: 9000,
    stockValue: 8000,
    etfValue: 1000,
    fundValue: 0,
    cryptoValue: 1000,
  },
  {
    date: "2025-01-01",
    value: 11000,
    invested: 9000,
    stockValue: 8800,
    etfValue: 1100,
    fundValue: 0,
    cryptoValue: 1100,
  },
  {
    date: "2026-06-01",
    value: 12000,
    invested: 9500,
    stockValue: 9600,
    etfValue: 1200,
    fundValue: 0,
    cryptoValue: 1200,
  },
];

describe("snapshotValueOnOrBefore", () => {
  it("returns per-type values", () => {
    expect(snapshotValueOnOrBefore(SNAPSHOTS, "2025-03-01", "stock")).toBe(8800);
    expect(snapshotValueOnOrBefore(SNAPSHOTS, "2025-03-01", "etf")).toBe(1100);
    expect(snapshotValueOnOrBefore(SNAPSHOTS, "2025-03-01", "all")).toBe(11000);
  });

  it("uses last point on or before anchor", () => {
    expect(snapshotValueOnOrBefore(SNAPSHOTS, "2024-06-01", "all")).toBe(10000);
  });
});

describe("valueFromSnapshot", () => {
  it("sums types for all when per-type present", () => {
    const p = SNAPSHOTS[0];
    expect(valueFromSnapshot(p, "all")).toBe(10000);
  });
});

describe("buildMatrixFromSnapshots", () => {
  it("computes period returns for all row", () => {
    const rows = buildMatrixFromSnapshots({
      snapshots: SNAPSHOTS,
      currentByAsset: { all: 12000, stock: 9600, etf: 1200, crypto: 1200 },
      dayPctByAsset: { all: -0.5 },
      dayAbsByAsset: { all: -60 },
      isPro: true,
      displayMode: "percent",
      assetKeys: ["all"],
      transactions: [],
      exchangeRates: {},
      baseCurrency: "EUR",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].cells.today.kind).toBe("percent");
    expect(rows[0].cells.today.value).toBe(-0.5);
    expect(rows[0].cells.oneYear.kind).toBe("percent");
    expect(rows[0].cells.oneYear.value).toBeCloseTo(9.09, 1);
  });

  it("computes long periods for all tiers (universal access)", () => {
    const rows = buildMatrixFromSnapshots({
      snapshots: SNAPSHOTS,
      currentByAsset: { all: 12000 },
      dayPctByAsset: {},
      dayAbsByAsset: {},
      isPro: false,
      displayMode: "percent",
      assetKeys: ["all"],
      transactions: [],
      exchangeRates: {},
      baseCurrency: "EUR",
    });
    expect(rows[0].cells.threeYear.kind).not.toBe("pro");
    expect(rows[0].cells.oneWeek.kind).toBe("percent");
  });
});

describe("buildMatrixFromSnapshots flow-adjusted return (TRF-028)", () => {
  it("attributes a mid-year ETF sale as an outflow, not a crash", () => {
    // Reproduces the REQ doc's scenario: an ETF-class snapshot of €1200 at
    // the YTD anchor, a €650 sale mid-year (ISOE.DE-shaped), and €550 left
    // in the class today. Naive (end-start)/start reads this as a ~-54%
    // "loss" — the exact class of distortion TRF-028 reported.
    const now = new Date("2026-08-03T00:00:00Z");
    const snapshots: SnapshotHistoryPoint[] = [
      {
        date: "2025-12-01",
        value: 12000,
        invested: 11000,
        stockValue: 9000,
        etfValue: 1200,
        fundValue: 0,
        cryptoValue: 1800,
      },
    ];
    const sellEtf: Transaction = {
      id: "tx-etf-sell",
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

    const rows = buildMatrixFromSnapshots({
      snapshots,
      currentByAsset: { etf: 550 },
      dayPctByAsset: {},
      dayAbsByAsset: {},
      isPro: true,
      displayMode: "percent",
      assetKeys: ["etf"],
      transactions: [sellEtf],
      exchangeRates: {},
      baseCurrency: "EUR",
      now,
    });

    const naiveYtd = ((550 - 1200) / 1200) * 100;
    expect(naiveYtd).toBeLessThan(-50); // confirms the fixture reproduces the distortion

    const ytdCell = rows[0].cells.ytd;
    expect(ytdCell.kind).toBe("percent");
    expect(ytdCell.value).toBeGreaterThan(naiveYtd + 20); // materially less negative than naive
    expect(ytdCell.value).toBeCloseTo(0, 0); // hand-computed: ~0%, see performance.test.ts for the isolated formula check
  });

  it("does not disturb a class with no transactions in the window", () => {
    const now = new Date("2026-08-03T00:00:00Z");
    const snapshots: SnapshotHistoryPoint[] = [
      {
        date: "2025-12-01",
        value: 12000,
        invested: 11000,
        stockValue: 9000,
        etfValue: 1000,
        fundValue: 0,
        cryptoValue: 1800,
      },
    ];
    const rows = buildMatrixFromSnapshots({
      snapshots,
      currentByAsset: { etf: 1100 },
      dayPctByAsset: {},
      dayAbsByAsset: {},
      isPro: true,
      displayMode: "percent",
      assetKeys: ["etf"],
      transactions: [],
      exchangeRates: {},
      baseCurrency: "EUR",
      now,
    });
    expect(rows[0].cells.ytd.kind).toBe("percent");
    expect(rows[0].cells.ytd.value).toBeCloseTo(10, 6); // unchanged from the naive (1100-1000)/1000
  });

  it("degrades to empty when no snapshot exists at the period start", () => {
    const rows = buildMatrixFromSnapshots({
      snapshots: [],
      currentByAsset: { etf: 550 },
      dayPctByAsset: {},
      dayAbsByAsset: {},
      isPro: true,
      displayMode: "percent",
      assetKeys: ["etf"],
      transactions: [],
      exchangeRates: {},
      baseCurrency: "EUR",
    });
    expect(rows[0].cells.ytd.kind).toBe("empty");
  });
});

describe("resolveMatrixAssetKeys", () => {
  it("omits all when only one type", () => {
    expect(resolveMatrixAssetKeys({ stock: 100, etf: 0, crypto: 0 })).toEqual(["stock"]);
  });

  it("includes all when multiple types", () => {
    expect(resolveMatrixAssetKeys({ all: 100, stock: 80, etf: 20 })).toEqual(["all", "stock", "etf"]);
  });
});

describe("firstSnapshotAnchorDate", () => {
  it("returns earliest date", () => {
    expect(firstSnapshotAnchorDate(SNAPSHOTS)).toBe("2024-01-01");
  });
});

describe("getMatrixPeriodAnchorDates", () => {
  it("returns ISO date strings", () => {
    const d = getMatrixPeriodAnchorDates(new Date("2025-06-15T12:00:00Z"));
    expect(d.ytd).toBe("2025-01-01");
    expect(d.oneYear).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("reconcileAllAssetsToday", () => {
  it("forces all today to the weighted combo of class rows (screenshot regression)", () => {
    const empty = {
      oneWeek: { kind: "empty" as const },
      oneMonth: { kind: "empty" as const },
      ytd: { kind: "empty" as const },
      oneYear: { kind: "empty" as const },
      threeYear: { kind: "empty" as const },
      fiveYear: { kind: "empty" as const },
      tenYear: { kind: "empty" as const },
      all: { kind: "empty" as const },
    };
    const rows = [
      {
        assetKey: "all" as const,
        currentValue: 74280,
        cells: { today: { kind: "percent" as const, value: 0.17 }, ...empty },
      },
      {
        assetKey: "stock" as const,
        currentValue: 66057,
        cells: { today: { kind: "percent" as const, value: -2.03 }, ...empty },
      },
      {
        assetKey: "crypto" as const,
        currentValue: 6723,
        cells: { today: { kind: "percent" as const, value: -0.09 }, ...empty },
      },
      {
        assetKey: "fixed_return" as const,
        currentValue: 1500,
        cells: { today: { kind: "percent" as const, value: 0 }, ...empty },
      },
    ];
    const out = reconcileAllAssetsToday(rows);
    const allToday = out.find((r) => r.assetKey === "all")!.cells.today;
    expect(allToday.kind).toBe("percent");
    expect(allToday.value!).toBeLessThan(-1.5);
    expect(allToday.value!).toBeGreaterThan(-2.2);
  });
});
