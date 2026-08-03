import { describe, expect, it } from "vitest";
import { clampDividendYieldPct, sanitizePe, sanitizePrice, sanitizeTtwror } from "./sanity";
import { parseLocaleNumber } from "./locale-number";
import { driftTone } from "./drift-tone";
import { getDividendYield, getPortfolioTotal } from "./metrics";
import type { CashEntry, Holding, QuoteData } from "@/lib/types";

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

describe("getDividendYield investedTotal (TRF-004-B)", () => {
  // Regression fixture for the Home (1.41%) vs /tools/dividends (1.42%)
  // discrepancy: StatsGrid used to pass net worth (cash included) as
  // getDividendYield's investedTotal override, diluting the yield below
  // what /tools/dividends shows for the identical portfolio (which lets the
  // function derive its own invested-only total).
  it("net worth as investedTotal understates yield vs the invested-only default", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        name: "X",
        ticker: "X",
        isin: "",
        shares: 10,
        purchasePrice: 100,
        displayCurrency: "EUR",
        exchange: "XETRA",
        valueInEUR: 1000,
      },
    ];
    const quotes: Record<string, QuoteData> = {
      X: {
        symbol: "X",
        shortName: "X",
        regularMarketPrice: 100,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        currency: "EUR",
        regularMarketPreviousClose: 100,
        fiftyTwoWeekHigh: 100,
        fiftyTwoWeekLow: 100,
        trailingAnnualDividendRate: 5,
      },
    };
    const cashEntries: CashEntry[] = [{ id: "c1", name: "Cash", amountEUR: 1000 }];
    const exchangeRates = {};

    const totals = getPortfolioTotal(holdings, cashEntries, quotes, exchangeRates, "EUR");
    expect(totals.invested).toBeCloseTo(1000, 0);
    expect(totals.netWorth).toBeCloseTo(2000, 0);

    // Correct call shape (/tools/dividends, and Home after the fix): no override.
    const correct = getDividendYield(holdings, quotes, exchangeRates, "EUR");
    expect(correct).toBeCloseTo(5, 1); // 10 shares * €5/share = €50 / €1000 invested = 5%

    // Buggy call shape (Home before the fix): net worth passed as investedTotal.
    const buggy = getDividendYield(holdings, quotes, exchangeRates, "EUR", totals.netWorth);
    expect(buggy).toBeCloseTo(2.5, 1); // diluted by the €1000 of cash in the denominator
    expect(buggy).not.toBeCloseTo(correct, 1);
  });
});
