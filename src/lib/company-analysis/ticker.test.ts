import { describe, expect, it } from "vitest";
import { parseTicker, TICKER_PATTERN } from "./ticker";

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
