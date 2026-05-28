import { describe, expect, it } from "vitest";
import { enrichPeriodStatAbs } from "./matrix-period";

describe("enrichPeriodStatAbs", () => {
  it("derives abs from pct and portfolio value", () => {
    const stat = enrichPeriodStatAbs({ pct: 10, abs: null, unavailable: false }, 1100);
    expect(stat.abs).toBeCloseTo(100, 0);
  });

  it("prefers day abs fallback when provided", () => {
    const stat = enrichPeriodStatAbs({ pct: 0.05, abs: null, unavailable: false }, 73_045, 36.5);
    expect(stat.abs).toBe(36.5);
  });
});
