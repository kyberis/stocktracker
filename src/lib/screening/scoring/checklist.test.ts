import { describe, expect, it } from "vitest";

import {
  evaluateEarningsResilience,
  scoreChecklist,
} from "./checklist";

describe("scoreChecklist", () => {
  const base = {
    rankScore: 55,
    fwdPe: null,
    ownHistPe: null,
    ndEbitda: null,
    netCash: null,
    moatScorePct: null,
    upsidePct: null,
  };

  it("leaves criteria at unknown when no data is available", () => {
    const r = scoreChecklist(base);
    expect(r.stepsPassed).toEqual([]);
    expect(r.stepsFailed).toEqual([]);
    expect(r.score).toBe(0);
    expect(r.verdict).toBeNull();
    expect(r.earningsResilient).toBeNull();
  });

  it("scores criterion 1 (valuation) using fwd P/E first", () => {
    const pass = scoreChecklist({ ...base, fwdPe: 12, ownHistPe: 25 });
    expect(pass.stepsPassed).toContain(1);
    const fail = scoreChecklist({ ...base, fwdPe: 40 });
    expect(fail.stepsFailed).toContain(1);
  });

  it("scores criterion 2 (divergence) from upside vs consensus", () => {
    expect(scoreChecklist({ ...base, upsidePct: 15 }).stepsPassed).toContain(2);
    expect(scoreChecklist({ ...base, upsidePct: -10 }).stepsFailed).toContain(2);
    // Small upside stays unknown.
    const r = scoreChecklist({ ...base, upsidePct: 3 });
    expect(r.stepsPassed).not.toContain(2);
    expect(r.stepsFailed).not.toContain(2);
  });

  it("scores criterion 3 (dated catalyst) from IR agent count", () => {
    expect(scoreChecklist({ ...base, datedCatalystCount: 2 }).stepsPassed).toContain(3);
    expect(scoreChecklist({ ...base, datedCatalystCount: 0 }).stepsFailed).toContain(3);
    const r = scoreChecklist({ ...base, datedCatalystCount: null });
    expect(r.stepsPassed).not.toContain(3);
    expect(r.stepsFailed).not.toContain(3);
  });

  it("scores criterion 4 (earnings resilience) from revenue history", () => {
    const pass = scoreChecklist({
      ...base,
      revenueGrowthHistoryPct: [7, 5, 12, -3, 9],
    });
    expect(pass.stepsPassed).toContain(4);
    expect(pass.earningsResilient).toBe(true);

    const fail = scoreChecklist({
      ...base,
      revenueGrowthHistoryPct: [3, -22, 4, 6, 5],
    });
    expect(fail.stepsFailed).toContain(4);
    expect(fail.earningsResilient).toBe(false);

    const unknown = scoreChecklist({
      ...base,
      revenueGrowthHistoryPct: [5, 6],
    });
    expect(unknown.stepsPassed).not.toContain(4);
    expect(unknown.stepsFailed).not.toContain(4);
    expect(unknown.earningsResilient).toBeNull();
  });

  it("scores criterion 5 (balance sheet) from netCash or ND/EBITDA", () => {
    expect(scoreChecklist({ ...base, netCash: true }).stepsPassed).toContain(5);
    expect(scoreChecklist({ ...base, ndEbitda: 1.5 }).stepsPassed).toContain(5);
    expect(scoreChecklist({ ...base, ndEbitda: 4.2 }).stepsFailed).toContain(5);
  });

  it("scores criterion 6 (insider alignment) from Web bias", () => {
    expect(scoreChecklist({ ...base, insiderBias: "buying" }).stepsPassed).toContain(6);
    expect(scoreChecklist({ ...base, insiderBias: "selling" }).stepsFailed).toContain(6);
    const mixed = scoreChecklist({ ...base, insiderBias: "mixed" });
    expect(mixed.stepsPassed).not.toContain(6);
    expect(mixed.stepsFailed).not.toContain(6);
  });

  it("scores criterion 7 (moat) from trefolio MOAT score", () => {
    expect(scoreChecklist({ ...base, moatScorePct: 72 }).stepsPassed).toContain(7);
    expect(scoreChecklist({ ...base, moatScorePct: 30 }).stepsFailed).toContain(7);
  });

  it("scores criterion 9 (market signal) with technicals when available", () => {
    const passTech = scoreChecklist({
      ...base,
      aboveMa200: true,
      return1yPct: 12,
    });
    expect(passTech.stepsPassed).toContain(9);

    const failTech = scoreChecklist({
      ...base,
      aboveMa200: false,
      return1yPct: -25,
    });
    expect(failTech.stepsFailed).toContain(9);

    // No technicals — falls back to rank score
    const passRank = scoreChecklist({ ...base, rankScore: 85 });
    expect(passRank.stepsPassed).toContain(9);
  });

  it("returns 'fuerte' when score >= 5 and MOAT is decent", () => {
    const r = scoreChecklist({
      ...base,
      fwdPe: 12,
      upsidePct: 18,
      netCash: true,
      moatScorePct: 65,
      datedCatalystCount: 2,
      insiderBias: "buying",
      revenueGrowthHistoryPct: [6, 4, 8, -1, 5],
      aboveMa200: true,
      return1yPct: 15,
    });
    expect(r.score).toBeGreaterThanOrEqual(5);
    expect(r.verdict).toBe("fuerte");
  });

  it("caps score at SCREENING_MAX_SCORE (8)", () => {
    const r = scoreChecklist({
      ...base,
      fwdPe: 12,
      upsidePct: 15,
      netCash: true,
      moatScorePct: 70,
      datedCatalystCount: 3,
      insiderBias: "buying",
      revenueGrowthHistoryPct: [7, 5, 9, 3, 6],
      aboveMa200: true,
      return1yPct: 10,
    });
    expect(r.score).toBeLessThanOrEqual(8);
  });
});

describe("evaluateEarningsResilience", () => {
  it("returns null with insufficient history", () => {
    expect(evaluateEarningsResilience(null)).toBeNull();
    expect(evaluateEarningsResilience([])).toBeNull();
    expect(evaluateEarningsResilience([5, 6])).toBeNull();
  });

  it("passes when every year is above −10% and mean is non-negative", () => {
    expect(evaluateEarningsResilience([7, 6, 4, -3, 10])).toBe(true);
  });

  it("fails when any year is below −15% (real drawdown)", () => {
    expect(evaluateEarningsResilience([8, 4, 12, -18, 6])).toBe(false);
  });

  it("does not pass when mean is negative", () => {
    expect(evaluateEarningsResilience([-2, -3, -5, -1, -4])).toBe(false);
  });
});
