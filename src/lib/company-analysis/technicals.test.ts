import { describe, expect, it } from "vitest";
import { computeTechnicalLevels, yoyChange } from "./technicals";
import type { ProviderHistoricalPoint } from "@/lib/api-providers/types";

function point(date: string, close: number): ProviderHistoricalPoint {
  return { date, open: close, high: close + 1, low: close - 1, close, volume: 1000 };
}

describe("computeTechnicalLevels", () => {
  it("computes close high and distance from real series", () => {
    const history = [
      point("2025-01-01", 100),
      point("2025-06-01", 150),
      point("2025-12-01", 120),
    ];
    const levels = computeTechnicalLevels(history, 120);
    expect(levels.closeHigh).toBe(150);
    expect(levels.closeHighDate).toBe("2025-06-01");
    expect(levels.distanceToCloseHighPct).toBeCloseTo(-20, 5);
    expect(levels.support).not.toBeNull();
    expect(levels.resistance).not.toBeNull();
  });

  it("returns nulls for empty history", () => {
    const levels = computeTechnicalLevels([], 10);
    expect(levels.closeHigh).toBeNull();
    expect(levels.distanceToCloseHighPct).toBeNull();
  });
});

describe("yoyChange", () => {
  it("computes real YoY", () => {
    expect(yoyChange(110, 100)).toBeCloseTo(10);
  });
  it("does not invent when missing", () => {
    expect(yoyChange(null, 100)).toBeNull();
    expect(yoyChange(110, 0)).toBeNull();
  });
});
