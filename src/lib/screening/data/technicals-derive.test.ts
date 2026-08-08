import { describe, expect, it } from "vitest";

import { deriveScreeningTechnicals } from "./technicals-derive";

function buildHistory(prices: number[]): Array<{
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  const start = new Date(2024, 7, 1);
  return prices.map((p, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    return {
      date: d.toISOString().slice(0, 10),
      open: p,
      high: p * 1.01,
      low: p * 0.99,
      close: p,
      volume: 1_000_000,
    };
  });
}

describe("deriveScreeningTechnicals", () => {
  it("returns null values when history is empty", () => {
    const t = deriveScreeningTechnicals({
      ticker: "aapl",
      history: [],
      currentPrice: 100,
      currency: "USD",
    });
    expect(t.ticker).toBe("AAPL");
    expect(t.closeHigh12m).toBeNull();
    expect(t.distanceTo52wHighPct).toBeNull();
    expect(t.aboveMa200).toBeNull();
    expect(t.gaps).toContain("no_history");
  });

  it("computes deterministic levels from a linear history", () => {
    const history = buildHistory(
      Array.from({ length: 260 }, (_, i) => 100 + i * 0.1),
    );
    const last = history[history.length - 1].close;
    const t = deriveScreeningTechnicals({
      ticker: "AAPL",
      history,
      currentPrice: last,
      currency: "USD",
    });
    expect(t.closeHigh12m).toBeCloseTo(last, 5);
    expect(t.distanceTo52wHighPct).toBeCloseTo(0, 5);
    expect(t.aboveMa200).toBe(true);
    expect(t.ma200).not.toBeNull();
    expect(t.return1yPct).toBeCloseTo(((last - 100) / 100) * 100, 3);
    expect(t.volatilityAnnPct).not.toBeNull();
    expect(t.nearHigh).toBe(true);
  });

  it("flags below-MA200 when current price is well under the trend", () => {
    const rising = Array.from({ length: 230 }, (_, i) => 100 + i);
    const history = buildHistory(rising);
    // Force current price below the MA200 average
    const t = deriveScreeningTechnicals({
      ticker: "TEST",
      history,
      currentPrice: 50,
      currency: "USD",
    });
    expect(t.aboveMa200).toBe(false);
    expect(t.distanceTo52wHighPct).not.toBeNull();
    if (t.distanceTo52wHighPct != null) {
      expect(t.distanceTo52wHighPct).toBeLessThan(0);
    }
  });
});
