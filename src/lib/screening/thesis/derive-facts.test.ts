import { describe, expect, it } from "vitest";
import { deriveFactsFromCandidate } from "../thesis/derive-facts";
import { thesisFactSchema } from "../thesis/schemas";
import type { HardDataCandidate } from "../schemas";

const base: HardDataCandidate = {
  ticker: "AAPL",
  name: "Apple",
  sector: "Technology",
  industry: "Consumer Electronics",
  country: "US",
  marketCapUsd: 3e12,
  price: 190,
  rankScore: 80,
  rankReason: "Quality compounder in the brief band.",
  ndEbitda: 0.4,
  interestCoverage: 28,
  roicPct: 45,
  fwdPe: 28,
  histPeAvg: 24,
  fcfYield: 0.032,
  severeDilution: false,
  thinLiquidity: false,
  moatScore: 82,
  annualSeries: [
    {
      year: 2021,
      revenue: 365e9,
      grossMarginPct: 43,
      operatingMarginPct: 30,
      netMarginPct: 25,
      eps: 5.6,
      operatingCashFlow: 104e9,
      freeCashFlow: 93e9,
      roicPct: 40,
      sharesOutstanding: 16.5e9,
    },
    {
      year: 2022,
      revenue: 394e9,
      grossMarginPct: 43,
      operatingMarginPct: 30,
      netMarginPct: 25,
      eps: 6.1,
      operatingCashFlow: 122e9,
      freeCashFlow: 99e9,
      roicPct: 42,
      sharesOutstanding: 16.0e9,
    },
    {
      year: 2023,
      revenue: 383e9,
      grossMarginPct: 44,
      operatingMarginPct: 30,
      netMarginPct: 25,
      eps: 6.1,
      operatingCashFlow: 110e9,
      freeCashFlow: 99e9,
      roicPct: 44,
      sharesOutstanding: 15.6e9,
    },
    {
      year: 2024,
      revenue: 391e9,
      grossMarginPct: 46,
      operatingMarginPct: 31,
      netMarginPct: 24,
      eps: 6.4,
      operatingCashFlow: 118e9,
      freeCashFlow: 108e9,
      roicPct: 45,
      sharesOutstanding: 15.3e9,
    },
  ],
};

describe("deriveFactsFromCandidate", () => {
  it("emits namespaced facts with provenance", () => {
    const { facts } = deriveFactsFromCandidate(base, "2026-08-19T00:00:00.000Z");
    expect(facts.length).toBeGreaterThan(6);
    for (const f of facts) {
      const parsed = thesisFactSchema.safeParse(f);
      expect(parsed.success, parsed.success ? "" : parsed.error.message).toBe(
        true,
      );
      expect(f.source.type).toBe("fmp");
      expect(f.as_of).toBeTruthy();
      expect(f.method === "raw" || f.method === "derived").toBe(true);
    }
    const d1 = facts.find((f) => f.field_id === "EQ:D1");
    expect(typeof d1?.value).toBe("number");
    expect(Number(d1?.value)).toBeGreaterThan(0.8);
    const e1 = facts.find((f) => f.field_id === "EQ:E1");
    expect(e1?.value).toBe(0.4);
  });

  it("maps published target and upside when present", () => {
    const { facts } = deriveFactsFromCandidate(
      { ...base, targetPrice: 85, upsidePct: 12.4 },
      "2026-08-19T00:00:00.000Z",
    );
    expect(facts.find((f) => f.field_id === "calc:target_price")?.value).toBe(85);
    expect(facts.find((f) => f.field_id === "calc:upside_pct")?.value).toBe(12.4);
  });

  it("keeps null values instead of inventing metrics", () => {
    const { facts, gaps } = deriveFactsFromCandidate({
      ...base,
      ndEbitda: null,
      interestCoverage: null,
      annualSeries: [],
      roicPct: null,
    });
    expect(facts.find((f) => f.field_id === "EQ:E1")?.value).toBeNull();
    expect(gaps.some((g) => g.startsWith("EQ:E1"))).toBe(true);
  });
});
