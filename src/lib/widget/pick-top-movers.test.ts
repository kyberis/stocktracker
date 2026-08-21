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

  it("large layout prefers 4 gainers + 3 losers", () => {
    const result = pickTopMovers(
      [
        { ticker: "U1", dayChange: 9 },
        { ticker: "U2", dayChange: 8 },
        { ticker: "U3", dayChange: 7 },
        { ticker: "U4", dayChange: 6 },
        { ticker: "U5", dayChange: 5 },
        { ticker: "D1", dayChange: -4 },
        { ticker: "D2", dayChange: -3 },
        { ticker: "D3", dayChange: -2 },
        { ticker: "D4", dayChange: -1 },
      ],
      { gainers: 4, losers: 3, total: 7 },
    );
    expect(result.map((h) => h.ticker)).toEqual([
      "U1",
      "U2",
      "U3",
      "U4",
      "D1",
      "D2",
      "D3",
    ]);
  });

  it("fills with gainers when fewer than 3 losers for large layout", () => {
    const result = pickTopMovers(
      [
        { ticker: "U1", dayChange: 9 },
        { ticker: "U2", dayChange: 8 },
        { ticker: "U3", dayChange: 7 },
        { ticker: "U4", dayChange: 6 },
        { ticker: "U5", dayChange: 5 },
        { ticker: "D1", dayChange: -1 },
      ],
      { gainers: 4, losers: 3, total: 7 },
    );
    expect(result.map((h) => h.ticker)).toEqual([
      "U1",
      "U2",
      "U3",
      "U4",
      "U5",
      "D1",
    ]);
  });

  it("fills with losers when fewer than 4 gainers for large layout", () => {
    const result = pickTopMovers(
      [
        { ticker: "U1", dayChange: 2 },
        { ticker: "D1", dayChange: -9 },
        { ticker: "D2", dayChange: -8 },
        { ticker: "D3", dayChange: -7 },
        { ticker: "D4", dayChange: -6 },
        { ticker: "D5", dayChange: -5 },
      ],
      { gainers: 4, losers: 3, total: 7 },
    );
    expect(result.map((h) => h.ticker)).toEqual([
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "U1",
    ]);
  });
});
