import { describe, expect, it } from "vitest";
import { isIsinAsTicker, sanitizeStorageTicker } from "./sanitize-storage-ticker";

describe("sanitizeStorageTicker", () => {
  it("maps known ISINs to Yahoo symbols and keeps ISIN", () => {
    expect(sanitizeStorageTicker("US0378331005")).toEqual({
      ticker: "AAPL",
      isin: "US0378331005",
    });
    expect(sanitizeStorageTicker("IE00B3XXRP09.L")).toEqual({
      ticker: "VUSA.L",
      isin: "IE00B3XXRP09",
    });
  });

  it("never persists an unknown ISIN as ticker", () => {
    expect(sanitizeStorageTicker("XS9999999999")).toEqual({
      ticker: "",
      isin: "XS9999999999",
    });
  });

  it("passes through normal tickers", () => {
    expect(sanitizeStorageTicker("MSFT", "US5949181045")).toEqual({
      ticker: "MSFT",
      isin: "US5949181045",
    });
  });
});

describe("isIsinAsTicker", () => {
  it("detects bare and venue-suffixed ISINs", () => {
    expect(isIsinAsTicker("US0378331005")).toBe(true);
    expect(isIsinAsTicker("IE00B3XXRP09.L")).toBe(true);
    expect(isIsinAsTicker("AAPL")).toBe(false);
  });
});
