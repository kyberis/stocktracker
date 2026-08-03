import { describe, expect, it } from "vitest";
import { clampDividendYieldPct, sanitizePe, sanitizePrice, sanitizeTtwror } from "./sanity";
import { parseLocaleNumber } from "./locale-number";
import { driftTone } from "./drift-tone";

describe("portfolio sanity (TRF-102)", () => {
  it("clamps yield above 15% to null", () => {
    expect(clampDividendYieldPct(15)).toBe(15);
    expect(clampDividendYieldPct(15.01)).toBeNull();
    expect(clampDividendYieldPct(-0.1)).toBeNull();
  });

  it("rejects non-positive prices and P/E", () => {
    expect(sanitizePrice(0)).toBeNull();
    expect(sanitizePrice(12.5)).toBe(12.5);
    expect(sanitizePe(-1)).toBeNull();
    expect(sanitizePe(18)).toBe(18);
  });

  it("rejects TTWROR far from simple return", () => {
    expect(sanitizeTtwror(108, 7.8)).toBeNull();
    expect(sanitizeTtwror(7.84, 7.83)).toBe(7.84);
  });
});

describe("parseLocaleNumber (TRF-012)", () => {
  it("treats comma and dot decimals as the same value", () => {
    expect(parseLocaleNumber("999,95")).toBe(999.95);
    expect(parseLocaleNumber("999.95")).toBe(999.95);
  });

  it("handles European thousand+decimal format", () => {
    expect(parseLocaleNumber("1.234,56")).toBe(1234.56);
    expect(parseLocaleNumber("1,234.56")).toBe(1234.56);
  });

  it("returns null for empty or non-numeric input", () => {
    expect(parseLocaleNumber("")).toBeNull();
    expect(parseLocaleNumber("   ")).toBeNull();
    expect(parseLocaleNumber("abc")).toBeNull();
  });
});

describe("driftTone (TRF-005)", () => {
  it("marks overexposure as over (never price-up green)", () => {
    expect(driftTone(18.6)).toBe("over");
    expect(driftTone(-15)).toBe("under");
    expect(driftTone(0.5)).toBe("neutral");
  });
});
