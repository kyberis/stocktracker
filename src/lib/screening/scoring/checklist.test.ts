import { describe, expect, it } from "vitest";

import {
  classifyFundamentalsTrend,
  deriveVerdict,
  evaluateBalanceSheet,
  evaluateEarningsResilience,
  FUERTE_MIN_SCORE,
  scoreChecklist,
} from "./checklist";

describe("scoreChecklist (attractiveness)", () => {
  const base = {
    rankScore: 55,
    fwdPe: null as number | null,
    ownHistPe: null as number | null,
    histPeAvg: null as number | null,
    ndEbitda: null as number | null,
    netCash: null as boolean | null,
    moatScorePct: null as number | null,
    sector: "Technology",
    industry: "Software",
  };

  it("leaves criteria at unknown when no data is available", () => {
    const r = scoreChecklist(base);
    expect(r.stepsPassed).toEqual([]);
    expect(r.stepsFailed).toEqual([]);
    expect(r.score).toBe(0);
    expect(r.verdict).toBeNull();
  });

  it("passes pe vs history when current PE is below hist avg", () => {
    const pass = scoreChecklist({
      ...base,
      fwdPe: 12,
      histPeAvg: 18,
      ownHistPe: 18,
    });
    expect(pass.stepsPassed).toContain(1);
  });

  it("fails graham when PE is far above fair multiple", () => {
    const r = scoreChecklist({
      ...base,
      fwdPe: 45,
      histPeAvg: 40,
      epsCagrPct: 8,
    });
    expect(r.stepsFailed).toContain(4);
  });

  it("passes balance sheet on net cash", () => {
    expect(
      scoreChecklist({ ...base, netCash: true }).stepsPassed,
    ).toContain(5);
  });

  it("fails balance sheet on high ND/EBITDA", () => {
    expect(
      scoreChecklist({ ...base, ndEbitda: 4.2 }).stepsFailed,
    ).toContain(5);
  });

  it("passes moat above 55", () => {
    expect(
      scoreChecklist({ ...base, moatScorePct: 70 }).stepsPassed,
    ).toContain(6);
  });

  it("skips P/B for software and scores it for banks", () => {
    const soft = scoreChecklist({
      ...base,
      priceToBook: 0.9,
      sector: "Technology",
      industry: "Software",
    });
    expect(soft.stepsPassed).not.toContain(8);
    expect(soft.stepsFailed).not.toContain(8);

    const bank = scoreChecklist({
      ...base,
      priceToBook: 1.1,
      sector: "Financial Services",
      industry: "Banks",
    });
    expect(bank.stepsPassed).toContain(8);
  });

  it("marks fuerte at FUERTE_MIN_SCORE with decent moat", () => {
    const r = scoreChecklist({
      ...base,
      fwdPe: 14,
      histPeAvg: 20,
      peerPe: 18,
      epsCagrPct: 12,
      ndEbitda: 1,
      interestCoverage: 10,
      moatScorePct: 65,
      buyback: true,
      shareCountCagrPct: -4,
      annualSeries: [
        { year: 2025, operatingMarginPct: 30, netMarginPct: 20, eps: 3 },
        { year: 2024, operatingMarginPct: 29, netMarginPct: 19, eps: 2.7 },
        { year: 2023, operatingMarginPct: 28, netMarginPct: 18, eps: 2.4 },
        { year: 2022, operatingMarginPct: 27, netMarginPct: 17, eps: 2.1 },
      ],
    });
    expect(r.score).toBeGreaterThanOrEqual(FUERTE_MIN_SCORE);
    expect(r.verdict).toBe("fuerte");
  });
});

describe("helpers kept for compatibility", () => {
  it("evaluateBalanceSheet", () => {
    expect(evaluateBalanceSheet({ netCash: true, ndEbitda: null })).toBe("pass");
    expect(evaluateBalanceSheet({ netCash: false, ndEbitda: 4 })).toBe("fail");
  });

  it("classifyFundamentalsTrend", () => {
    expect(classifyFundamentalsTrend([8, 6, 5])).toBe("improving");
    expect(classifyFundamentalsTrend([-8, -3, 1])).toBe("worse");
  });

  it("evaluateEarningsResilience", () => {
    expect(evaluateEarningsResilience([5, 4, 3])).toBe(true);
    expect(evaluateEarningsResilience([-20, 2, 3])).toBe(false);
  });

  it("deriveVerdict", () => {
    expect(deriveVerdict(6, 55)).toBe("fuerte");
    expect(deriveVerdict(2, null)).toBe("watch");
  });
});
