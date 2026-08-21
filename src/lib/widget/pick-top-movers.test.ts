import { describe, expect, it } from "vitest";
import { pickTopMovers } from "./pick-top-movers";

describe("pickTopMovers", () => {
  it("returns two gainers and one loser ranked by absolute move", () => {
    const result = pickTopMovers([
      { ticker: "FLAT", dayChange: 0 },
      { ticker: "UP1", dayChange: 1.2 },
      { ticker: "UP2", dayChange: 3.5 },
      { ticker: "UP3", dayChange: 0.4 },
      { ticker: "DN1", dayChange: -0.8 },
      { ticker: "DN2", dayChange: -2.1 },
    ]);

    expect(result.map((h) => h.ticker)).toEqual(["UP2", "DN2", "UP1"]);
  });

  it("fills from absolute movers when losers are missing", () => {
    const result = pickTopMovers([
      { ticker: "A", dayChange: 5 },
      { ticker: "B", dayChange: 3 },
      { ticker: "C", dayChange: 1 },
    ]);

    expect(result.map((h) => h.ticker)).toEqual(["A", "B", "C"]);
  });

  it("fills from absolute movers when gainers are missing", () => {
    const result = pickTopMovers([
      { ticker: "A", dayChange: -5 },
      { ticker: "B", dayChange: -3 },
      { ticker: "C", dayChange: -1 },
    ]);

    expect(result.map((h) => h.ticker)).toEqual(["A", "B", "C"]);
  });

  it("returns fewer than three when the portfolio is tiny", () => {
    const result = pickTopMovers([
      { ticker: "ONLY", dayChange: 2 },
    ]);
    expect(result.map((h) => h.ticker)).toEqual(["ONLY"]);
  });

  it("ignores non-finite dayChange values", () => {
    const result = pickTopMovers([
      { ticker: "OK", dayChange: 1 },
      { ticker: "BAD", dayChange: Number.NaN },
      { ticker: "DOWN", dayChange: -2 },
    ]);
    expect(result.map((h) => h.ticker)).toEqual(["DOWN", "OK"]);
  });
});
