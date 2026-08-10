import { describe, expect, it } from "vitest";

import {
  formatRangeDate,
  levelsFromDistancePct,
  rangePositionPct,
} from "./fifty-two-week-range";

describe("rangePositionPct", () => {
  it("places mid-range price at 50%", () => {
    expect(rangePositionPct(75, 50, 100)).toBe(50);
  });

  it("clamps below low to 0 and above high to 100", () => {
    expect(rangePositionPct(40, 50, 100)).toBe(0);
    expect(rangePositionPct(120, 50, 100)).toBe(100);
  });

  it("returns null for invalid ranges", () => {
    expect(rangePositionPct(75, 100, 50)).toBeNull();
    expect(rangePositionPct(75, 50, 50)).toBeNull();
    expect(rangePositionPct(Number.NaN, 50, 100)).toBeNull();
  });
});

describe("levelsFromDistancePct", () => {
  it("prefers absolute high/low when present", () => {
    expect(
      levelsFromDistancePct({
        price: 80,
        distanceTo52wHighPct: -20,
        distanceTo52wLowPct: 60,
        closeHigh12m: 100,
        closeLow12m: 50,
      }),
    ).toEqual({ low: 50, high: 100 });
  });

  it("reconstructs levels from distance percentages", () => {
    const levels = levelsFromDistancePct({
      price: 80,
      distanceTo52wHighPct: -20,
      distanceTo52wLowPct: 60,
    });
    expect(levels).not.toBeNull();
    expect(levels!.high).toBeCloseTo(100, 5);
    expect(levels!.low).toBeCloseTo(50, 5);
  });
});

describe("formatRangeDate", () => {
  it("formats ISO dates for es locale", () => {
    const formatted = formatRangeDate("2025-10-22", "es");
    expect(formatted).toMatch(/22/);
    expect(formatted).toMatch(/10/);
    expect(formatted).toMatch(/2025/);
  });

  it("returns null for empty input", () => {
    expect(formatRangeDate(null, "en")).toBeNull();
    expect(formatRangeDate(undefined, "en")).toBeNull();
  });
});
