import { describe, expect, it } from "vitest";
import { parseTickersParam } from "./parse-tickers";

describe("parseTickersParam (TRF-026)", () => {
  it("dedupes before applying the cap, not after", () => {
    // 32 raw entries: AAPL repeated 5x (multiple lots) + 27 other unique
    // tickers. Undeduped-then-capped (the pre-fix behavior) would keep only
    // the first 30 raw entries — losing the last 2 unique tickers even
    // though only 27 + 1 = 28 unique tickers actually exist.
    const unique = Array.from({ length: 27 }, (_, i) => `T${i}`);
    const raw = ["AAPL", "AAPL", "AAPL", "AAPL", "AAPL", ...unique];
    expect(raw.length).toBe(32);

    const result = parseTickersParam(raw.join(","), 30);

    expect(new Set(result).size).toBe(result.length); // no duplicates
    expect(result).toContain("AAPL");
    for (const t of unique) {
      expect(result).toContain(t);
    }
    expect(result.length).toBe(28); // AAPL + 27 unique, all under the cap
  });

  it("still applies the cap when unique tickers exceed it", () => {
    const unique = Array.from({ length: 35 }, (_, i) => `T${i}`);
    const result = parseTickersParam(unique.join(","), 30);
    expect(result.length).toBe(30);
  });

  it("uppercases and trims, ignoring blanks", () => {
    const result = parseTickersParam(" aapl ,, msft,AAPL");
    expect(result).toEqual(["AAPL", "MSFT"]);
  });

  it("returns an empty array for an empty param", () => {
    expect(parseTickersParam("")).toEqual([]);
  });
});
