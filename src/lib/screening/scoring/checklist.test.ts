import { describe, expect, it } from "vitest";

import {
  classifyFundamentalsTrend,
  deriveVerdict,
  evaluateBalanceSheet,
  evaluateEarningsResilience,
  evaluatePriceFundamentalsDivergence,
  evaluateRelativeValuation,
  FUERTE_MIN_SCORE,
  scoreChecklist,
} from "./checklist";

describe("scoreChecklist", () => {
  const base = {
    rankScore: 55,
    fwdPe: null as number | null,
    ownHistPe: null as number | null,
    ndEbitda: null as number | null,
    netCash: null as boolean | null,
    moatScorePct: null as number | null,
    upsidePct: null as number | null,
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

  it("does not pass criterion 1 on cheap TTM PE when earnings quality is suspect", () => {
    const r = scoreChecklist({
      ...base,
      ownHistPe: 8.8,
      earningsQualitySuspect: true,
      normalizedPe: 18.0,
    });
    expect(r.stepsPassed).not.toContain(1);
    expect(r.stepsFailed).toContain(1);
  });

  it("scores criterion 2 (divergence) only with weak price + improving fundamentals", () => {
    expect(
      scoreChecklist({
        ...base,
        upsidePct: 15,
        return1yPct: -20,
        revenueGrowthHistoryPct: [8, 6, 5],
      }).stepsPassed,
    ).toContain(2);

    expect(
      scoreChecklist({
        ...base,
        upsidePct: -10,
      }).stepsFailed,
    ).toContain(2);

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

  it("scores criterion 5 (balance sheet) with 2.5x threshold when data is present", () => {
    expect(scoreChecklist({ ...base, netCash: true }).stepsPassed).toContain(5);
    expect(scoreChecklist({ ...base, ndEbitda: 1.5 }).stepsPassed).toContain(5);
    expect(scoreChecklist({ ...base, ndEbitda: 2.5 }).stepsFailed).toContain(5);
    expect(scoreChecklist({ ...base, ndEbitda: 3.35 }).stepsFailed).toContain(5);
    expect(scoreChecklist({ ...base, ndEbitda: 4.2 }).stepsFailed).toContain(5);
    const unknown = scoreChecklist({ ...base, ndEbitda: null });
    expect(unknown.stepsPassed).not.toContain(5);
    expect(unknown.stepsFailed).not.toContain(5);
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

  it(`returns 'fuerte' only when score >= ${FUERTE_MIN_SCORE} and MOAT is decent`, () => {
    // 1+2+3+4+5+6+7 = 7 (criterion 9 stays unknown with soft rank).
    const strong = scoreChecklist({
      ...base,
      fwdPe: 12,
      upsidePct: 18,
      return1yPct: -22,
      revenueGrowthHistoryPct: [8, 6, 5, 4, 3],
      netCash: true,
      moatScorePct: 65,
      datedCatalystCount: 2,
      insiderBias: "buying",
      rankScore: 55,
    });
    expect(strong.score).toBeGreaterThanOrEqual(FUERTE_MIN_SCORE);
    expect(strong.verdict).toBe("fuerte");
  });

  it("returns watch at score 5 even with decent MOAT", () => {
    expect(deriveVerdict(5, 65)).toBe("watch");
    expect(deriveVerdict(6, 65)).toBe("fuerte");
    expect(deriveVerdict(6, 40)).toBe("watch");
  });

  it("caps score at SCREENING_MAX_SCORE (8)", () => {
    const r = scoreChecklist({
      ...base,
      fwdPe: 12,
      upsidePct: 15,
      return1yPct: -18,
      revenueGrowthHistoryPct: [7, 5, 9, 3, 6],
      netCash: true,
      moatScorePct: 70,
      datedCatalystCount: 3,
      insiderBias: "buying",
      aboveMa200: true,
      // return1y -18 with aboveMa200 true falls through to rank
      rankScore: 80,
    });
    expect(r.score).toBeLessThanOrEqual(8);
  });
});

describe("MKC regression (McCormick-style false positive)", () => {
  it("does not award Strong / cheap thesis on extraordinary TTM PE + leverage", () => {
    const r = scoreChecklist({
      rankScore: 60,
      fwdPe: 8.8,
      ownHistPe: 8.8,
      normalizedPe: 18.0,
      earningsQualitySuspect: true,
      ndEbitda: 3.35,
      netCash: false,
      moatScorePct: null,
      upsidePct: 11,
      datedCatalystCount: 1,
      insiderBias: "buying",
      revenueGrowthHistoryPct: [1.7, 2.0, 3.5, 4.0, 5.0],
      aboveMa200: false,
      return1yPct: -25,
    });

    // C1: normalised ~18x → fail (not pass on 8.8x)
    expect(r.stepsPassed).not.toContain(1);
    expect(r.stepsFailed).toContain(1);
    // C2: weak price + flat fundamentals → fail divergence
    expect(r.stepsPassed).not.toContain(2);
    expect(r.stepsFailed).toContain(2);
    // C5: 3.35x is present → fail (not "unknown")
    expect(r.stepsFailed).toContain(5);
    // Catalyst + insiders still pass
    expect(r.stepsPassed).toContain(3);
    expect(r.stepsPassed).toContain(6);
    expect(r.score).toBeLessThanOrEqual(4);
    expect(r.verdict).toBe("watch");
  });
});

describe("evaluateRelativeValuation", () => {
  it("fails cheap TTM-only PE when quality is suspect and no normalised PE", () => {
    expect(
      evaluateRelativeValuation({
        rankScore: 50,
        fwdPe: null,
        ownHistPe: 8.8,
        earningsQualitySuspect: true,
        normalizedPe: null,
        ndEbitda: null,
        netCash: null,
        moatScorePct: null,
        upsidePct: null,
      }),
    ).toBe("fail");
  });
});

describe("evaluatePriceFundamentalsDivergence", () => {
  it("fails MKC-like flat fundamentals with weak price and upside", () => {
    expect(
      evaluatePriceFundamentalsDivergence({
        rankScore: 50,
        fwdPe: null,
        ownHistPe: null,
        ndEbitda: null,
        netCash: null,
        moatScorePct: null,
        upsidePct: 11,
        return1yPct: -25,
        revenueGrowthHistoryPct: [1.7, 2.0, 3.5],
      }),
    ).toBe("fail");
  });
});

describe("evaluateBalanceSheet", () => {
  it("fails at 3.35x and passes below 2.5x", () => {
    expect(evaluateBalanceSheet({ netCash: null, ndEbitda: 3.35 })).toBe("fail");
    expect(evaluateBalanceSheet({ netCash: null, ndEbitda: 2.4 })).toBe("pass");
    expect(evaluateBalanceSheet({ netCash: null, ndEbitda: null })).toBe("unknown");
  });
});

describe("classifyFundamentalsTrend", () => {
  it("marks ~0–2% growth as flat", () => {
    expect(classifyFundamentalsTrend([1.7, 2.0, 3.5])).toBe("flat");
    expect(classifyFundamentalsTrend([8, 6, 5])).toBe("improving");
    expect(classifyFundamentalsTrend([-8, -3, 1])).toBe("worse");
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
