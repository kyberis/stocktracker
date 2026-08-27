import { describe, expect, it } from "vitest";
import { parseIsinParam, parseTicker, TICKER_PATTERN } from "./ticker";

describe("parseTicker", () => {
  it("accepts valid tickers", () => {
    expect(parseTicker("mcd")).toBe("MCD");
    expect(parseTicker("BRK.B")).toBe("BRK.B");
    expect(parseTicker("BF-B")).toBe("BF-B");
  });

  it("rejects invalid tickers", () => {
    expect(parseTicker("")).toBeNull();
    expect(parseTicker("TOO_LONG_TICKER")).toBeNull();
    expect(parseTicker("bad ticker")).toBeNull();
    expect(parseTicker("../etc")).toBeNull();
    expect(parseTicker("javascript:alert(1)")).toBeNull();
  });

  it("pattern matches spec", () => {
    expect(TICKER_PATTERN.test("AAPL")).toBe(true);
    expect(TICKER_PATTERN.test("aapl")).toBe(false);
  });
});

describe("parseIsinParam", () => {
  it("accepts a valid ISIN and rejects junk", () => {
    expect(parseIsinParam("gb00bld4zl17")).toBe("GB00BLD4ZL17");
    expect(parseIsinParam("BITC")).toBeUndefined();
    expect(parseIsinParam("")).toBeUndefined();
  });
});
