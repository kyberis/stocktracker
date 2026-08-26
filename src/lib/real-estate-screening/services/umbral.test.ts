import { describe, expect, it } from "vitest";
import { dualDiscount } from "./umbral";

describe("dualDiscount", () => {
  it("shows a milder discount vs the current median than vs a lagged 5y mean", () => {
    const asking = 2000;
    const current = 2500;
    const mean5y = 1800;
    const d = dualDiscount(asking, current, mean5y);
    expect(d.vsMedianaPct).toBeCloseTo(-20, 5);
    expect(d.vsMedia5aPct).toBeCloseTo((2000 - 1800) / 1800 * 100, 5);
    expect(Math.abs(d.vsMedia5aPct ?? 0)).toBeLessThan(Math.abs(d.vsMedianaPct ?? 0) + 50);
  });
});
