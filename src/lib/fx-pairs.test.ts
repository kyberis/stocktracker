import { describe, expect, it } from "vitest";
import { ALL_EUR_FX_PAIRS, buildNeededFxPairs, isKnownEurFxPair } from "./fx-pairs";

describe("ALL_EUR_FX_PAIRS", () => {
  it("includes major Asian and European currencies", () => {
    for (const pair of [
      "EURUSD",
      "EURGBP",
      "EURHKD",
      "EURJPY",
      "EURCHF",
      "EURSEK",
      "EURNOK",
      "EURSGD",
      "EURAUD",
    ]) {
      expect(ALL_EUR_FX_PAIRS).toContain(pair);
    }
  });

  it("does not include EUREUR", () => {
    expect(ALL_EUR_FX_PAIRS).not.toContain("EUREUR");
  });
});

describe("buildNeededFxPairs", () => {
  it("skips EUR and empties", () => {
    expect(buildNeededFxPairs(["EUR", "", null, undefined])).toEqual([]);
  });

  it("maps GBX to EURGBP", () => {
    expect(buildNeededFxPairs(["GBX", "GBp"])).toEqual(["EURGBP"]);
  });

  it("dedupes and uppercases", () => {
    expect(buildNeededFxPairs(["hkd", "HKD", "jpy"])).toEqual(["EURHKD", "EURJPY"]);
  });

  it("keeps unknown ISO codes so Yahoo can still be tried", () => {
    expect(buildNeededFxPairs(["CNY"])).toEqual(["EURCNY"]);
  });
});

describe("isKnownEurFxPair", () => {
  it("recognizes supported pairs", () => {
    expect(isKnownEurFxPair("EURHKD")).toBe(true);
    expect(isKnownEurFxPair("eurjpy")).toBe(true);
    expect(isKnownEurFxPair("EURCNY")).toBe(false);
  });
});
