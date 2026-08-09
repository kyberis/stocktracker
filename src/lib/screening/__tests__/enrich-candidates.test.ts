import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/screening/data/fmp-fundamentals", () => ({
  fetchFmpFundamentals: vi.fn(async (ticker: string) => ({
    ticker,
    currency: "USD",
    price: 100,
    fwdPe: 12,
    ownHistPe: 14,
    histPeAvg: 16.5,
    histPeYears: 5,
    evEbitda: 9,
    ndEbitda: 0.5,
    dividendYield: 0.02,
    targetPrice: 120,
    netCash: false,
    revenueGrowthPct: 8.5,
    revenueGrowthHistoryPct: [8.5, 6.2, 12.1, 4.8, 9.4],
    epsTtm: 7.1,
    epsFy: 6.8,
    normalizedPe: 14.7,
    earningsQualitySuspect: false,
    description: "Test co",
    annualSeries: [],
    fcfYield: 0.04,
    evEbit: 15,
    interestCoverage: 20,
    buyback: true,
    severeDilution: false,
    avgVolume: 1_000_000,
    thinLiquidity: false,
    peerPe: null,
    roicPct: 25,
    errors: [],
  })),
}));

vi.mock("@/lib/screening/data/ensure-moat", () => ({
  ensureMoatForTickers: vi.fn(async () => ({
    available: ["AAPL"],
    missing: [],
    generated: 0,
    failed: 0,
  })),
}));

vi.mock("@/lib/screening/data/trefolio-signals", () => ({
  loadTrefolioSignalsForTickers: vi.fn(async () => {
    const map = new Map();
    map.set("AAPL", {
      ticker: "AAPL",
      moatScorePct: 72,
      moatVerdict: "Pass",
      moatPassedCount: 6,
      moatCriteriaCount: 8,
      analysisSummary: "Apple sells devices and services.",
      revenueYoyPct: 8.5,
      hasAnalysisCache: true,
    });
    return map;
  }),
}));

describe("enrichHardDataCandidates", () => {
  it("fills multiples, moat, checklist score and comparison notes", async () => {
    const { enrichHardDataCandidates } = await import(
      "../data/enrich-candidates"
    );
    const [row] = await enrichHardDataCandidates([
      {
        ticker: "AAPL",
        name: "Apple",
        sector: "Technology",
        industry: "Consumer Electronics",
        country: "US",
        marketCapUsd: 3e12,
        price: 95,
        rankScore: 88,
        rankReason: "Quality compounder",
      },
    ]);
    expect(row.fwdPe).toBe(12);
    expect(row.histPeAvg).toBe(16.5);
    expect(row.histPeYears).toBe(5);
    expect(row.moatScore).toBe(72);
    expect(row.upsidePct).toBeCloseTo(20, 0);
    expect(row.checklistScore).toBeGreaterThanOrEqual(3);
    expect(row.reportVerdict).toMatch(/fuerte|watch/);
    expect(row.valuationNote).toMatch(/P\/E/);
    expect(row.growthNote).toMatch(/YoY/);
    expect(row.analysisSummary).toMatch(/Apple/);
    // Earnings resilience: 5y history with no year below −10% and positive mean.
    expect(row.earningsResilient).toBe(true);
    expect(row.stepsPassed).toContain(4);
  });
});
