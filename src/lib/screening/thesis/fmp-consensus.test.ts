import { describe, expect, it } from "vitest";
import { fetchAnalystEstimateFacts } from "./fmp-consensus";

describe("fetchAnalystEstimateFacts", () => {
  it("maps street EPS and revenue without calling it guidance", async () => {
    const prev = process.env.FMP_API_KEY;
    process.env.FMP_API_KEY = "test-key";
    try {
      const { facts, errors } = await fetchAnalystEstimateFacts({
        ticker: "UBER",
        asOf: "2026-08-20T00:00:00.000Z",
        fetchImpl: async () =>
          new Response(
            JSON.stringify([
              {
                symbol: "UBER",
                date: "2026-12-31",
                estimatedEpsAvg: 2.4,
                estimatedRevenueAvg: 50e9,
              },
            ]),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      });
      expect(errors).toEqual([]);
      expect(facts.find((f) => f.field_id === "calc:consensus_eps")?.value).toBe(2.4);
      expect(facts.find((f) => f.field_id === "calc:consensus_revenue")?.source.ref).toBe(
        "analyst-estimates",
      );
    } finally {
      process.env.FMP_API_KEY = prev;
    }
  });
});
