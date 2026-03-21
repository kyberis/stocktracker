import { describe, it, expect } from "vitest";
import { computeTrialGrowth } from "./trial-growth";

describe("computeTrialGrowth", () => {
  it("returns correct percentage for positive growth", () => {
    expect(computeTrialGrowth(1000, 1032)).toBe(3.2);
  });

  it("rounds to one decimal place", () => {
    expect(computeTrialGrowth(1000, 1055.55)).toBe(5.6);
  });

  it("returns undefined for zero start value", () => {
    expect(computeTrialGrowth(0, 100)).toBeUndefined();
  });

  it("returns undefined for negative start value", () => {
    expect(computeTrialGrowth(-500, 100)).toBeUndefined();
  });

  it("returns negative percentage for portfolio decline", () => {
    expect(computeTrialGrowth(1000, 950)).toBe(-5);
  });

  it("returns undefined for zero growth", () => {
    expect(computeTrialGrowth(1000, 1000)).toBeUndefined();
  });

  it("returns negative percentage for small decline", () => {
    expect(computeTrialGrowth(1000, 985)).toBe(-1.5);
  });

  it("rounds negative values to one decimal", () => {
    expect(computeTrialGrowth(1000, 966.66)).toBe(-3.3);
  });

  it("returns undefined when start is null", () => {
    expect(computeTrialGrowth(null, 1000)).toBeUndefined();
  });

  it("returns undefined when end is null", () => {
    expect(computeTrialGrowth(1000, null)).toBeUndefined();
  });

  it("returns undefined when both are undefined", () => {
    expect(computeTrialGrowth(undefined, undefined)).toBeUndefined();
  });

  it("handles large percentage gains", () => {
    expect(computeTrialGrowth(100, 250)).toBe(150);
  });

  it("returns undefined for negligible change that rounds to zero", () => {
    expect(computeTrialGrowth(10000, 10001)).toBeUndefined();
  });
});
