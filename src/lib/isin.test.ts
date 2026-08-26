import { describe, expect, it } from "vitest";
import { extractIsinFromUnknown, isinFromYahooSymbol, isNonUsIsin, looksLikeIsin } from "./isin";

describe("looksLikeIsin", () => {
  it("accepts a 12-character ISIN", () => {
    expect(looksLikeIsin("GB00BLD4ZL17")).toBe(true);
    expect(looksLikeIsin("us0378331005")).toBe(true);
  });

  it("rejects tickers and short codes", () => {
    expect(looksLikeIsin("BITC")).toBe(false);
    expect(looksLikeIsin("AAPL")).toBe(false);
  });
});

describe("isNonUsIsin", () => {
  it("is true for European and Canadian ISINs", () => {
    expect(isNonUsIsin("GB00BLD4ZL17")).toBe(true);
    expect(isNonUsIsin("IE00BK5BQT80")).toBe(true);
    expect(isNonUsIsin("CA21037X1006")).toBe(true);
    expect(isNonUsIsin("DE0007164600")).toBe(true);
  });

  it("is false for US ISINs and junk", () => {
    expect(isNonUsIsin("US0378331005")).toBe(false);
    expect(isNonUsIsin("BITC")).toBe(false);
  });
});

describe("isinFromYahooSymbol", () => {
  it("extracts a non-US ISIN from a venue-suffixed Yahoo symbol", () => {
    expect(isinFromYahooSymbol("GB00BLD4ZL17.SG")).toBe("GB00BLD4ZL17");
    expect(isinFromYahooSymbol("BITC.SW")).toBe("");
    expect(isinFromYahooSymbol("US0378331005")).toBe("");
  });
});

describe("extractIsinFromUnknown", () => {
  it("reads a top-level isin key", () => {
    expect(extractIsinFromUnknown({ isin: "gb00bld4zl17" })).toBe("GB00BLD4ZL17");
  });

  it("walks nested SnapTrade-style payloads", () => {
    expect(
      extractIsinFromUnknown({
        symbol: "BITC",
        figi_instrument: { figi_share_class: "BBG00", isin: "GB00BLD4ZL17" },
      }),
    ).toBe("GB00BLD4ZL17");
  });

  it("ignores strings that are not ISIN-shaped", () => {
    expect(extractIsinFromUnknown({ isin: "BITC", name: "CoinShares" })).toBe("");
  });
});
