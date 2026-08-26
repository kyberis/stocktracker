import { describe, expect, it } from "vitest";
import type { Position } from "snaptrade-typescript-sdk";
import { mergeSnapTradePurchasePrices, resolveSnapTradePurchasePrice } from "./snaptrade-client";

function pos(overrides: Partial<Position> = {}): Position {
  return {
    units: 10,
    price: 100,
    average_purchase_price: 80,
    open_pnl: 200,
    ...overrides,
  };
}

describe("resolveSnapTradePurchasePrice", () => {
  it("uses average_purchase_price when present", () => {
    expect(resolveSnapTradePurchasePrice(pos({ average_purchase_price: 63.9 }))).toBe(63.9);
  });

  it("derives cost from open_pnl when average is missing", () => {
    // 10 shares @ 100 market, open_pnl +200 → cost = 1000 - 200 = 800 → avg 80
    expect(
      resolveSnapTradePurchasePrice(
        pos({ average_purchase_price: null, open_pnl: 200, price: 100, units: 10 }),
      ),
    ).toBe(80);
  });

  it("returns 0 when no cost signal is available", () => {
    expect(
      resolveSnapTradePurchasePrice(
        pos({ average_purchase_price: null, open_pnl: null, price: null, units: 5 }),
      ),
    ).toBe(0);
  });
});

describe("mergeSnapTradePurchasePrices", () => {
  it("weights two known costs by shares", () => {
    expect(mergeSnapTradePurchasePrices(80, 10, 100, 10)).toBe(90);
  });

  it("keeps the known cost when the other lot is zero", () => {
    expect(mergeSnapTradePurchasePrices(80, 10, 0, 5)).toBe(80);
    expect(mergeSnapTradePurchasePrices(0, 5, 100, 10)).toBe(100);
  });
});
