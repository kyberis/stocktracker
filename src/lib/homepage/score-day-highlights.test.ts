import { describe, expect, it } from "vitest";
import { scoreDayHighlights } from "./score-day-highlights";

describe("scoreDayHighlights", () => {
  it("ranks earnings today above a moderate move", () => {
    const out = scoreDayHighlights({
      today: "2026-08-02",
      holdings: [
        {
          ticker: "SAN",
          shares: 100,
          changePercent: 3.2,
          price: 5,
          previousClose: 4.85,
          fiftyTwoWeekHigh: 6,
          fiftyTwoWeekLow: 3,
          eurDayImpact: 80,
        },
        {
          ticker: "AAPL",
          shares: 10,
          changePercent: 0.4,
          price: 200,
          previousClose: 199,
          fiftyTwoWeekHigh: 220,
          fiftyTwoWeekLow: 150,
          eurDayImpact: 20,
        },
      ],
      events: [{ ticker: "AAPL", type: "earnings", date: "2026-08-02" }],
    });
    expect(out[0]?.ticker).toBe("AAPL");
    expect(out[0]?.reasons.some((r) => r.kind === "earnings")).toBe(true);
  });

  it("flags near 52w high and large moves", () => {
    const out = scoreDayHighlights({
      today: "2026-08-02",
      holdings: [
        {
          ticker: "ASML",
          shares: 5,
          changePercent: 5.1,
          price: 980,
          previousClose: 930,
          fiftyTwoWeekHigh: 1000,
          fiftyTwoWeekLow: 600,
          eurDayImpact: 1200,
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].reasons.some((r) => r.kind === "move")).toBe(true);
    expect(out[0].reasons.some((r) => r.kind === "near_52w")).toBe(true);
  });

  it("returns empty when nothing notable", () => {
    const out = scoreDayHighlights({
      holdings: [
        {
          ticker: "VWCE",
          shares: 10,
          changePercent: 0.2,
          price: 120,
          previousClose: 119.8,
          fiftyTwoWeekHigh: 140,
          fiftyTwoWeekLow: 90,
          eurDayImpact: 15,
        },
      ],
    });
    expect(out).toEqual([]);
  });

  it("includes triggered alerts and high-impact news", () => {
    const out = scoreDayHighlights({
      holdings: [
        {
          ticker: "NVDA",
          shares: 2,
          changePercent: 0.1,
          price: 120,
          previousClose: 119.9,
          fiftyTwoWeekHigh: 150,
          fiftyTwoWeekLow: 80,
          eurDayImpact: 5,
        },
      ],
      alerts: [{ ticker: "NVDA", label: "Above €115" }],
      news: [{ ticker: "NVDA", headline: "AI demand solid", impactScore: 5 }],
    });
    expect(out[0]?.ticker).toBe("NVDA");
    expect(out[0]?.reasons.some((r) => r.kind === "alert")).toBe(true);
    expect(out[0]?.reasons.some((r) => r.kind === "news")).toBe(true);
  });
});
