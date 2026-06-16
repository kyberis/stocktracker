import { describe, expect, it } from "vitest";
import {
  buildMatrixFromSnapshots,
  firstSnapshotAnchorDate,
  getMatrixPeriodAnchorDates,
  snapshotValueOnOrBefore,
  valueFromSnapshot,
  resolveMatrixAssetKeys,
} from "./portfolio-performance-matrix";
import type { SnapshotHistoryPoint } from "./portfolio-performance-matrix";

const SNAPSHOTS: SnapshotHistoryPoint[] = [
  {
    date: "2024-01-01",
    value: 10000,
    invested: 9000,
    stockValue: 8000,
    etfValue: 1000,
    cryptoValue: 1000,
  },
  {
    date: "2025-01-01",
    value: 11000,
    invested: 9000,
    stockValue: 8800,
    etfValue: 1100,
    cryptoValue: 1100,
  },
  {
    date: "2026-06-01",
    value: 12000,
    invested: 9500,
    stockValue: 9600,
    etfValue: 1200,
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
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].cells.today.kind).toBe("percent");
    expect(rows[0].cells.today.value).toBe(-0.5);
    expect(rows[0].cells.oneYear.kind).toBe("percent");
    expect(rows[0].cells.oneYear.value).toBeCloseTo(9.09, 1);
  });

  it("locks long periods for free tier", () => {
    const rows = buildMatrixFromSnapshots({
      snapshots: SNAPSHOTS,
      currentByAsset: { all: 12000 },
      dayPctByAsset: {},
      dayAbsByAsset: {},
      isPro: false,
      displayMode: "percent",
      assetKeys: ["all"],
    });
    expect(rows[0].cells.threeYear.kind).toBe("pro");
    expect(rows[0].cells.oneWeek.kind).toBe("percent");
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
