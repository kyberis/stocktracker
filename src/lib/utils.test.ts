import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatCompactNumber,
  normalizeCurrency,
  resolveQuoteCurrency,
  convertToEUR,
  convertCurrency,
  cn,
} from "./utils";

const rates = {
  EURUSD: 1.1,
  EURGBP: 0.86,
  EURDKK: 7.46,
  EURCAD: 1.47,
};

describe("formatCurrency", () => {
  it("formats USD with prefix", () => {
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
    expect(formatCurrency(0, "USD")).toBe("$0.00");
  });

  it("formats EUR with prefix", () => {
    expect(formatCurrency(1234.56, "EUR")).toBe("€1,234.56");
  });

  it("formats GBP with prefix", () => {
    expect(formatCurrency(1234.56, "GBP")).toBe("£1,234.56");
  });

  it("formats GBX with suffix", () => {
    expect(formatCurrency(1234.56, "GBX")).toBe("1,234.56p");
    expect(formatCurrency(100, "GBX")).toBe("100.00p");
  });

  it("formats DKK with suffix", () => {
    expect(formatCurrency(1234.56, "DKK")).toBe("1,234.56 DKK");
  });

  it("formats CAD with prefix", () => {
    expect(formatCurrency(1234.56, "CAD")).toBe("CA$1,234.56");
  });

  it("handles negative values", () => {
    expect(formatCurrency(-100.5, "USD")).toBe("-$100.50");
    expect(formatCurrency(-1234.56, "EUR")).toBe("-€1,234.56");
    expect(formatCurrency(-50.25, "GBX")).toBe("-50.25p");
  });

  it("handles zero", () => {
    expect(formatCurrency(0, "USD")).toBe("$0.00");
    expect(formatCurrency(0, "GBX")).toBe("0.00p");
  });

  it("handles large numbers", () => {
    expect(formatCurrency(1_000_000, "USD")).toBe("$1,000,000.00");
    expect(formatCurrency(12_345_678.9, "EUR")).toBe("€12,345,678.90");
  });

  it("handles unknown currencies via Intl.NumberFormat", () => {
    // Intl.NumberFormat with valid ISO currency code
    const result = formatCurrency(100, "AUD");
    expect(result).toMatch(/\d/);
    expect(typeof result).toBe("string");
  });

  it("falls back to currency + value for invalid currency codes", () => {
    // Invalid currency that throws in Intl.NumberFormat
    expect(formatCurrency(100.5, "INVALID")).toBe("INVALID 100.50");
  });
});

describe("formatPercent", () => {
  it("formats positive values with + prefix", () => {
    expect(formatPercent(5.25)).toBe("+5.25%");
    expect(formatPercent(0.01)).toBe("+0.01%");
  });

  it("formats negative values with - prefix", () => {
    expect(formatPercent(-3.5)).toBe("-3.50%");
    expect(formatPercent(-0.01)).toBe("-0.01%");
  });

  it("formats zero with + prefix", () => {
    expect(formatPercent(0)).toBe("+0.00%");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatPercent(1.234)).toBe("+1.23%");
    expect(formatPercent(-2.999)).toBe("-3.00%");
  });
});

describe("formatCompactNumber", () => {
  it("formats trillions", () => {
    expect(formatCompactNumber(4_862_400_000_000)).toBe("4.86T");
    expect(formatCompactNumber(1_000_000_000_000)).toBe("1.00T");
  });

  it("formats billions", () => {
    expect(formatCompactNumber(1_000_000_000)).toBe("1.0B");
    expect(formatCompactNumber(2_500_000_000)).toBe("2.5B");
    expect(formatCompactNumber(15_300_000_000)).toBe("15.3B");
  });

  it("formats millions", () => {
    expect(formatCompactNumber(1_000_000)).toBe("1.0M");
    expect(formatCompactNumber(5_500_000)).toBe("5.5M");
    expect(formatCompactNumber(999_999_999)).toBe("1000.0M");
  });

  it("formats thousands", () => {
    expect(formatCompactNumber(1_000)).toBe("1.0K");
    expect(formatCompactNumber(12_500)).toBe("12.5K");
    expect(formatCompactNumber(999_999)).toBe("1000.0K");
  });

  it("formats small numbers without suffix", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(1)).toBe("1");
    expect(formatCompactNumber(999)).toBe("999");
  });

  it("handles fractional values below 1000", () => {
    expect(formatCompactNumber(42.7)).toBe("43");
  });
});

describe("normalizeCurrency", () => {
  it("converts GBp to GBX", () => {
    expect(normalizeCurrency("GBp")).toBe("GBX");
  });

  it("passes through other currencies unchanged", () => {
    expect(normalizeCurrency("USD")).toBe("USD");
    expect(normalizeCurrency("EUR")).toBe("EUR");
    expect(normalizeCurrency("GBP")).toBe("GBP");
    expect(normalizeCurrency("GBX")).toBe("GBX");
    expect(normalizeCurrency("DKK")).toBe("DKK");
    expect(normalizeCurrency("CAD")).toBe("CAD");
  });
});

describe("resolveQuoteCurrency", () => {
  it("forces GBX when holding is GBX and quote is GBP", () => {
    expect(resolveQuoteCurrency("GBX", "GBP")).toBe("GBX");
  });

  it("forces GBX when holding is GBX and quote is GBX", () => {
    expect(resolveQuoteCurrency("GBX", "GBX")).toBe("GBX");
  });

  it("forces GBX when holding is GBp (normalized to GBX) and quote is GBP", () => {
    expect(resolveQuoteCurrency("GBp", "GBP")).toBe("GBX");
  });

  it("passes through non-GBX holding currencies", () => {
    expect(resolveQuoteCurrency("USD", "USD")).toBe("USD");
    expect(resolveQuoteCurrency("EUR", "EUR")).toBe("EUR");
  });

  it("passes through when holding is GBX but quote is distinct (e.g. USD)", () => {
    expect(resolveQuoteCurrency("GBX", "USD")).toBe("USD");
  });

  it("passes through when holding is GBP and quote is GBP", () => {
    expect(resolveQuoteCurrency("GBP", "GBP")).toBe("GBP");
  });
});

describe("convertToEUR", () => {
  it("passes through EUR unchanged", () => {
    expect(convertToEUR(100, "EUR", rates)).toBe(100);
    expect(convertToEUR(0, "EUR", rates)).toBe(0);
  });

  it("converts USD to EUR", () => {
    // 1 EUR = 1.10 USD, so 110 USD = 100 EUR
    expect(convertToEUR(110, "USD", rates)).toBeCloseTo(100);
    expect(convertToEUR(1.1, "USD", rates)).toBeCloseTo(1);
  });

  it("converts GBX (pence) to EUR via GBP rate", () => {
    // 8600 pence = 86 GBP, 1 EUR = 0.86 GBP, so 86 GBP = 100 EUR
    expect(convertToEUR(8600, "GBX", rates)).toBe(100);
    expect(convertToEUR(86, "GBX", rates)).toBe(1);
  });

  it("returns NaN when EURGBP is missing (GBX) — never treat pence as EUR", () => {
    expect(convertToEUR(8600, "GBX", {})).toBeNaN();
    expect(convertToEUR(100, "GBX", { EURUSD: 1.1 })).toBeNaN();
  });

  it("returns NaN when rate is missing (USD) — never treat foreign as EUR", () => {
    expect(convertToEUR(100, "USD", {})).toBeNaN();
    expect(convertToEUR(100, "USD", { EURGBP: 0.86 })).toBeNaN();
  });
});

describe("convertCurrency", () => {
  it("returns amount unchanged for same currency", () => {
    expect(convertCurrency(100, "USD", "USD", rates)).toBe(100);
    expect(convertCurrency(50, "EUR", "EUR", rates)).toBe(50);
    expect(convertCurrency(1000, "GBX", "GBX", rates)).toBe(1000);
  });

  it("converts USD to EUR", () => {
    expect(convertCurrency(110, "USD", "EUR", rates)).toBeCloseTo(100);
  });

  it("converts EUR to GBP", () => {
    // 100 EUR * 0.86 = 86 GBP
    expect(convertCurrency(100, "EUR", "GBP", rates)).toBe(86);
  });

  it("converts USD to GBP via EUR", () => {
    // 110 USD -> 100 EUR -> 86 GBP
    expect(convertCurrency(110, "USD", "GBP", rates)).toBeCloseTo(86);
  });

  it("converts EUR to GBX (pence)", () => {
    // 100 EUR * 0.86 GBP/EUR * 100 = 8600 pence
    expect(convertCurrency(100, "EUR", "GBX", rates)).toBe(8600);
  });

  it("converts GBX to EUR", () => {
    expect(convertCurrency(8600, "GBX", "EUR", rates)).toBe(100);
  });

  it("converts GBX to USD via EUR", () => {
    // 8600 pence -> 100 EUR -> 110 USD
    expect(convertCurrency(8600, "GBX", "USD", rates)).toBeCloseTo(110);
  });

  it("returns NaN when target rate is missing", () => {
    expect(convertCurrency(100, "USD", "JPY", rates)).toBeNaN();
    expect(convertCurrency(50, "EUR", "CHF", rates)).toBeNaN();
  });

  it("returns NaN when converting to GBX without EURGBP", () => {
    expect(convertCurrency(100, "EUR", "GBX", {})).toBeNaN();
  });

  it("handles GBp as from currency (normalized to GBX)", () => {
    expect(convertCurrency(86, "GBp", "EUR", rates)).toBe(1);
  });
});

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false, "bar", undefined, "baz", null)).toBe("foo bar baz");
  });

  it("returns empty string for all falsy", () => {
    expect(cn(false, undefined, null)).toBe("");
  });

  it("returns single class when only one is truthy", () => {
    expect(cn("foo")).toBe("foo");
    expect(cn("", "foo", "")).toBe("foo");
  });

  it("handles empty string (falsy)", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  it("handles boolean true (truthy, stringifies to 'true')", () => {
    expect(cn(true, "foo")).toBe("true foo");
  });
});
