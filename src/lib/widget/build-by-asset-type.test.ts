import { describe, expect, it } from "vitest";
import { buildByAssetTypeForWidget } from "./build-by-asset-type";
import type { AssetTypeTotals } from "@/lib/portfolio-summary";

function emptyTotals() {
  return {
    totalCurrentEUR: 0,
    totalCostEUR: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    dayGainLossEUR: 0,
  };
}

function makeByType(overrides: Partial<Record<string, { current: number; alloc: number; day?: number; dayPct?: number; pl?: number; plPct?: number }>>): AssetTypeTotals {
  const stock = overrides.stock ?? { current: 0, alloc: 0 };
  const etf = overrides.etf ?? { current: 0, alloc: 0 };
  const fund = overrides.fund ?? { current: 0, alloc: 0 };
  const crypto = overrides.crypto ?? { current: 0, alloc: 0 };
  const fixed_return = overrides.fixed_return ?? { current: 0, alloc: 0 };

  const mk = (o: { current: number; alloc: number; day?: number; pl?: number; plPct?: number }) => ({
    totalCurrentEUR: o.current,
    totalCostEUR: o.current - (o.pl ?? 0),
    totalGainLoss: o.pl ?? 0,
    totalGainLossPercent: o.plPct ?? 0,
    dayGainLossEUR: o.day ?? 0,
  });

  return {
    stock: mk(stock),
    etf: mk(etf),
    fund: mk(fund),
    crypto: mk(crypto),
    fixed_return: mk(fixed_return),
    allocations: {
      stock: stock.alloc,
      etf: etf.alloc,
      fund: fund.alloc,
      crypto: crypto.alloc,
      fixed_return: fixed_return.alloc,
    },
  };
}

describe("buildByAssetTypeForWidget", () => {
  it("returns only sleeves with positive value, sorted by value desc", () => {
    const byType = makeByType({
      stock: { current: 5000, alloc: 50, day: 50, pl: 500, plPct: 11.11 },
      etf: { current: 3000, alloc: 30, day: -20, pl: 200, plPct: 7.14 },
      crypto: { current: 2000, alloc: 20, day: 100, pl: -100, plPct: -4.76 },
    });

    const rows = buildByAssetTypeForWidget(byType, {
      pct: { stock: 1, etf: -0.67, crypto: 5.26 },
      abs: { stock: 50, etf: -20, crypto: 100 },
    });

    expect(rows.map((r) => r.key)).toEqual(["stock", "etf", "crypto"]);
    expect(rows[0].value).toBe(5000);
    expect(rows[0].dayChangePercent).toBe(1);
    expect(rows[2].dayChange).toBe(100);
  });

  it("skips empty sleeves", () => {
    const byType = makeByType({
      stock: { current: 1000, alloc: 100, day: 10, pl: 100, plPct: 11.11 },
    });
    const rows = buildByAssetTypeForWidget(byType, {
      pct: { stock: 1 },
      abs: { stock: 10 },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("stock");
  });

  it("returns empty array when portfolio has no invested sleeves", () => {
    const byType: AssetTypeTotals = {
      stock: emptyTotals(),
      etf: emptyTotals(),
      fund: emptyTotals(),
      crypto: emptyTotals(),
      fixed_return: emptyTotals(),
      allocations: { stock: 0, etf: 0, fund: 0, crypto: 0, fixed_return: 0 },
    };
    expect(buildByAssetTypeForWidget(byType, { pct: {}, abs: {} })).toEqual([]);
  });
});
