import { describe, expect, it } from "vitest";
import {
  scoreCategories,
  scoreCheap,
  scoreFit,
  scoreSolidity,
  selectCurrentPe,
} from "./categories";

const base = {
  fwdPe: null as number | null,
  ownHistPe: null as number | null,
  normalizedPe: null as number | null,
  histPeAvg: null as number | null,
  histPeYears: null as number | null,
  earningsQualitySuspect: false as boolean | null,
  moatScorePct: null as number | null,
  suitability: null as "fit" | "stretch" | "poor_fit" | null,
};

describe("selectCurrentPe", () => {
  it("prefers forward PE when quality is fine", () => {
    expect(
      selectCurrentPe({
        fwdPe: 12,
        ownHistPe: 20,
        normalizedPe: 18,
        earningsQualitySuspect: false,
      }),
    ).toBe(12);
  });

  it("uses normalized PE when TTM quality is suspect", () => {
    expect(
      selectCurrentPe({
        fwdPe: null,
        ownHistPe: 8,
        normalizedPe: 22,
        earningsQualitySuspect: true,
      }),
    ).toBe(22);
  });
});

describe("scoreCheap", () => {
  it("labels cheap when current PE is a discount to multi-year history", () => {
    const r = scoreCheap({
      ...base,
      fwdPe: 12,
      histPeAvg: 20,
      histPeYears: 5,
    });
    expect(r.label).toBe("cheap");
    expect(r.currentPe).toBe(12);
    expect(r.histPe).toBe(20);
    expect(r.histPeSource).toBe("multi_year");
  });

  it("labels expensive when current PE is a premium to history", () => {
    const r = scoreCheap({
      ...base,
      fwdPe: 28,
      histPeAvg: 18,
      histPeYears: 5,
    });
    expect(r.label).toBe("expensive");
  });

  it("labels fair when within ±15% of history and below 25", () => {
    const r = scoreCheap({
      ...base,
      fwdPe: 18,
      histPeAvg: 18,
      histPeYears: 5,
    });
    expect(r.label).toBe("fair");
  });

  it("falls back to TTM as hist when multi-year series is thin", () => {
    const r = scoreCheap({
      ...base,
      fwdPe: 10,
      ownHistPe: 16,
      histPeAvg: 16,
      histPeYears: 2,
    });
    expect(r.histPeSource).toBe("ttm");
    expect(r.label).toBe("cheap");
  });

  it("uses absolute bands when history is missing", () => {
    expect(scoreCheap({ ...base, fwdPe: 12 }).label).toBe("cheap");
    expect(scoreCheap({ ...base, fwdPe: 20 }).label).toBe("fair");
    expect(scoreCheap({ ...base, fwdPe: 30 }).label).toBe("expensive");
  });

  it("does not label cheap on depressed TTM when quality is suspect", () => {
    const r = scoreCheap({
      ...base,
      fwdPe: null,
      ownHistPe: 8.8,
      normalizedPe: null,
      earningsQualitySuspect: true,
    });
    expect(r.label).toBe("expensive");
  });

  it("history premium beats absolute <15 (no false cheap)", () => {
    const r = scoreCheap({
      ...base,
      fwdPe: 14,
      histPeAvg: 11,
      histPeYears: 5,
    });
    expect(r.label).toBe("expensive");
  });
});

describe("scoreFit / scoreSolidity", () => {
  it("maps suitability and moat bands", () => {
    expect(scoreFit("fit").label).toBe("fit");
    expect(scoreFit(null).label).toBe("unknown");
    expect(scoreSolidity(72).label).toBe("solid");
    expect(scoreSolidity(55).label).toBe("moderate");
    expect(scoreSolidity(30).label).toBe("weak");
    expect(scoreSolidity(null).label).toBe("unknown");
  });
});

describe("scoreCategories", () => {
  it("allows solid + fit + expensive together", () => {
    const r = scoreCategories({
      ...base,
      fwdPe: 32,
      histPeAvg: 20,
      histPeYears: 5,
      moatScorePct: 78,
      suitability: "fit",
    });
    expect(r.cheap.label).toBe("expensive");
    expect(r.fit.label).toBe("fit");
    expect(r.solidity.label).toBe("solid");
  });
});
