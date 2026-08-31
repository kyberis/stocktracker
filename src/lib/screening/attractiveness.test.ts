import { describe, expect, it } from "vitest";
import {
  epsCagrPctFromSeries,
  grahamFairPe,
  priceToBookApplies,
  scoreAttractiveness,
} from "@/lib/screening/attractiveness";

describe("grahamFairPe", () => {
  it("uses 8.5 + 2×g", () => {
    expect(grahamFairPe(10)).toBe(28.5);
    expect(grahamFairPe(0)).toBe(8.5);
  });
  it("returns null for extreme growth", () => {
    expect(grahamFairPe(50)).toBeNull();
    expect(grahamFairPe(-10)).toBeNull();
  });
});

describe("priceToBookApplies", () => {
  it("matches banks and insurers", () => {
    expect(priceToBookApplies("Financial Services", "Banks")).toBe(true);
    expect(priceToBookApplies("Technology", "Software")).toBe(false);
  });
});

describe("epsCagrPctFromSeries", () => {
  it("computes trailing consecutive EPS CAGR", () => {
    const series = [
      { year: 2025, eps: 2.0 },
      { year: 2024, eps: 1.8 },
      { year: 2023, eps: 1.6 },
      { year: 2022, eps: 1.4 },
    ];
    const cagr = epsCagrPctFromSeries(series);
    expect(cagr).not.toBeNull();
    expect(cagr!).toBeGreaterThan(10);
    expect(cagr!).toBeLessThan(15);
  });
});

describe("scoreAttractiveness", () => {
  it("passes graham when PE is below fair multiple", () => {
    const scored = scoreAttractiveness({
      peCurrent: 20,
      histPeAvg: 25,
      peerPe: 22,
      epsCagrPct: 10,
      opMarginDeltaPp: 1,
      netMarginDeltaPp: 0.5,
      marginYears: 5,
      ndEbitda: 1,
      netCash: false,
      interestCoverage: 8,
      moatScorePct: 60,
      shareCountCagrPct: -3,
      buyback: true,
      severeDilution: false,
      priceToBook: null,
      sector: "Technology",
      industry: "Software",
    });
    expect(scored.checks.find((c) => c.id === "graham_rule")?.status).toBe(
      "pass",
    );
    expect(scored.checks.find((c) => c.id === "price_to_book")?.status).toBe(
      "skipped",
    );
    expect(scored.passedIds.length).toBeGreaterThanOrEqual(5);
  });

  it("fails high leverage", () => {
    const scored = scoreAttractiveness({
      peCurrent: 12,
      histPeAvg: 15,
      peerPe: null,
      epsCagrPct: 5,
      opMarginDeltaPp: 0,
      netMarginDeltaPp: 0,
      marginYears: 4,
      ndEbitda: 5,
      netCash: false,
      interestCoverage: 1.5,
      moatScorePct: 50,
      shareCountCagrPct: 0,
      buyback: false,
      severeDilution: false,
      priceToBook: 1.1,
      sector: "Financial Services",
      industry: "Banks",
    });
    expect(scored.checks.find((c) => c.id === "balance_sheet")?.status).toBe(
      "fail",
    );
  });
});
