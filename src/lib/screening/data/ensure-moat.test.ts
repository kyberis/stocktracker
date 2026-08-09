import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetMoatCacheForSymbols,
  mockUpsertMoatCache,
  mockResolveProvider,
  mockEvaluateMoat,
} = vi.hoisted(() => ({
  mockGetMoatCacheForSymbols: vi.fn(),
  mockUpsertMoatCache: vi.fn(),
  mockResolveProvider: vi.fn(),
  mockEvaluateMoat: vi.fn(),
}));

vi.mock("@/lib/db/moat-cache", () => ({
  getMoatCacheForSymbols: mockGetMoatCacheForSymbols,
  upsertMoatCache: mockUpsertMoatCache,
}));

vi.mock("@/lib/market-data/resolve-provider", () => ({
  resolvePremiumStockDataProvider: mockResolveProvider,
}));

vi.mock("@/lib/moat-evaluator", () => ({
  evaluateMoat: mockEvaluateMoat,
}));

describe("ensureMoatForTickers", () => {
  beforeEach(() => {
    mockGetMoatCacheForSymbols.mockReset();
    mockUpsertMoatCache.mockReset();
    mockResolveProvider.mockReset();
    mockEvaluateMoat.mockReset();
  });

  it("skips generation when cache already has the ticker", async () => {
    const map = new Map([["AAPL", { symbol: "AAPL", scorePct: 80 }]]);
    mockGetMoatCacheForSymbols.mockResolvedValue(map);

    const { ensureMoatForTickers } = await import("./ensure-moat");
    const result = await ensureMoatForTickers(["AAPL"]);

    expect(result.generated).toBe(0);
    expect(result.available).toEqual(["AAPL"]);
    expect(mockResolveProvider).not.toHaveBeenCalled();
    expect(mockUpsertMoatCache).not.toHaveBeenCalled();
  });

  it("generates and upserts MOAT on cache miss without user quota", async () => {
    mockGetMoatCacheForSymbols.mockResolvedValue(new Map());
    const overview = { Symbol: "AAPL" };
    const income = {};
    const balance = {};
    const cashflow = {};
    const earnings = {};
    mockResolveProvider.mockResolvedValue({
      provider: {
        getOverview: vi.fn().mockResolvedValue(overview),
        getIncomeStatement: vi.fn().mockResolvedValue(income),
        getBalanceSheet: vi.fn().mockResolvedValue(balance),
        getCashFlow: vi.fn().mockResolvedValue(cashflow),
        getEarnings: vi.fn().mockResolvedValue(earnings),
      },
      backend: "fmp",
    });
    const evaluation = {
      symbol: "AAPL",
      companyName: "Apple",
      sector: "Technology",
      industry: "CE",
      totalScore: 70,
      maxScore: 100,
      verdict: "Pass",
      criteriaCount: 8,
      passedCount: 6,
      criteria: [],
      valuation: {
        peRatio: 28,
        forwardPE: 26,
        pegRatio: null,
        augmentedPayoutRatio: null,
        sellTrigger: false,
      },
      overview,
      income,
      balance,
      cashflow,
      earnings,
    };
    mockEvaluateMoat.mockReturnValue(evaluation);
    mockUpsertMoatCache.mockResolvedValue(undefined);

    const { ensureMoatForTickers } = await import("./ensure-moat");
    const result = await ensureMoatForTickers(["AAPL"]);

    expect(mockResolveProvider).toHaveBeenCalledWith(null, "moat_sync");
    expect(mockEvaluateMoat).toHaveBeenCalled();
    expect(mockUpsertMoatCache).toHaveBeenCalledWith(evaluation);
    expect(result.generated).toBe(1);
    expect(result.available).toContain("AAPL");
    expect(result.missing).toEqual([]);
  });

  it("fail-opens when provider is unavailable", async () => {
    mockGetMoatCacheForSymbols.mockResolvedValue(new Map());
    mockResolveProvider.mockResolvedValue(null);

    const { ensureMoatForTickers } = await import("./ensure-moat");
    const result = await ensureMoatForTickers(["ZZZZ"]);

    expect(result.generated).toBe(0);
    expect(result.missing).toEqual(["ZZZZ"]);
  });
});
