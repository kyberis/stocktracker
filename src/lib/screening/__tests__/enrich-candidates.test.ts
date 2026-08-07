import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/screening/data/fmp-fundamentals", () => ({
  fetchFmpFundamentals: vi.fn(async (ticker: string) => ({
    ticker,
    currency: "USD",
    price: 100,
    fwdPe: 12,
    ownHistPe: 14,
    evEbitda: 9,
    ndEbitda: 0.5,
    dividendYield: 0.02,
    targetPrice: 120,
    netCash: false,
    description: "Test co",
    errors: [],
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
    expect(row.moatScore).toBe(72);
    expect(row.upsidePct).toBeCloseTo(20, 0);
    expect(row.checklistScore).toBeGreaterThanOrEqual(3);
    expect(row.reportVerdict).toMatch(/fuerte|watch/);
    expect(row.valuationNote).toMatch(/P\/E/);
    expect(row.growthNote).toMatch(/YoY/);
    expect(row.analysisSummary).toMatch(/Apple/);
  });
});
