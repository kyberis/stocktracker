import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  FUNDAMENTALS_MAX_AGE_DAYS,
  ensureShareFundamentals,
  isFundamentalsFresh,
} from "@/lib/services/share-fundamentals";

vi.mock("@/lib/auth/guards", () => ({
  requireFeatureQuotaByUserId: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
}));

vi.mock("@/lib/db/fundamentals-cache", () => ({
  getFundamentalsCache: vi.fn(),
  upsertFundamentalsCache: vi.fn(),
}));

vi.mock("@/lib/market-data/resolve-provider", () => ({
  resolveFundamentalsProvider: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkFmpRateLimit: vi.fn(),
}));

vi.mock("@/lib/feature-quotas", () => ({
  refundFeatureQuota: vi.fn(),
}));

describe("isFundamentalsFresh", () => {
  it("returns true for recent timestamps", () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    expect(isFundamentalsFresh(recent, FUNDAMENTALS_MAX_AGE_DAYS)).toBe(true);
  });

  it("returns false for stale timestamps", () => {
    const stale = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    expect(isFundamentalsFresh(stale, FUNDAMENTALS_MAX_AGE_DAYS)).toBe(false);
  });
});

describe("ensureShareFundamentals", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const db = await import("@/lib/db");
    vi.mocked(db.findUserById).mockResolvedValue({
      id: "u1",
      role: "user",
      plan: "pro",
      plan_expires_at: "",
    } as never);
  });

  it("returns cached bundle without quota when all types are fresh", async () => {
    const cache = await import("@/lib/db/fundamentals-cache");
    const overview = {
      symbol: "KO",
      name: "Coca-Cola",
      peRatio: 24,
      forwardPE: 22,
      pegRatio: null,
      eps: null,
      dividendPerShare: null,
      dividendYield: null,
      beta: null,
      profitMargin: null,
      returnOnEquity: null,
      revenueTTM: null,
      analystTargetPrice: null,
      analystRatings: null,
      fiftyDayMA: null,
      twoHundredDayMA: null,
      sharesOutstanding: null,
      description: "",
      exchange: "",
      currency: "USD",
      sector: "",
      industry: "",
    };
    const empty = { annual: [], quarterly: [] };
    const updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19);

    vi.mocked(cache.getFundamentalsCache).mockImplementation(async (_sym, type) => ({
      symbol: "KO",
      type,
      dataJson: JSON.stringify(type === "overview" ? overview : empty),
      provider: "yahoo",
      createdAt: updatedAt,
      updatedAt,
    }));

    const result = await ensureShareFundamentals("u1", "KO");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cached).toBe(true);
      expect(result.data.overview?.symbol).toBe("KO");
      expect(result.data.provider).toBe("yahoo");
    }
  });

  it("rejects empty symbol", async () => {
    const result = await ensureShareFundamentals("u1", "  ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_input");
  });

  it("refetches valuation overview when cache lacks P/E multiples", async () => {
    const cache = await import("@/lib/db/fundamentals-cache");
    const guards = await import("@/lib/auth/guards");
    const resolve = await import("@/lib/market-data/resolve-provider");
    const { YahooProvider } = await import("@/lib/api-providers/yahoo");

    const updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19);
    const sparseCached = {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      description: "",
      exchange: "NASDAQ",
      currency: "USD",
      sector: "Technology",
      industry: "Internet",
      peRatio: null,
      pegRatio: null,
      eps: null,
      dividendPerShare: null,
      dividendYield: null,
      beta: null,
      profitMargin: 0.25,
      returnOnEquity: 0.3,
      revenueTTM: 300_000_000_000,
      analystTargetPrice: null,
      analystRatings: null,
      fiftyDayMA: null,
      twoHundredDayMA: null,
      sharesOutstanding: null,
      forwardPE: null,
    };

    vi.mocked(cache.getFundamentalsCache).mockResolvedValue({
      symbol: "GOOGL",
      type: "overview",
      dataJson: JSON.stringify(sparseCached),
      provider: "fmp",
      createdAt: updatedAt,
      updatedAt,
    });
    vi.mocked(guards.requireFeatureQuotaByUserId).mockResolvedValue({
      allowed: true,
    } as never);
    const rateLimit = await import("@/lib/rate-limit");
    vi.mocked(rateLimit.checkFmpRateLimit).mockResolvedValue({
      allowed: true,
    } as never);
    vi.mocked(resolve.resolveFundamentalsProvider).mockResolvedValue({
      provider: {
        name: "fmp",
        getOverview: vi.fn().mockResolvedValue(sparseCached),
        getQuote: vi.fn(),
        search: vi.fn(),
        getHistorical: vi.fn(),
        getExchangeRate: vi.fn(),
      },
      backend: "fmp",
    } as never);

    const richYahoo = { ...sparseCached, peRatio: 17.3, forwardPE: 23.2 };
    vi.spyOn(YahooProvider.prototype, "getOverview").mockResolvedValue(richYahoo as never);

    const result = await ensureShareFundamentals("u1", "GOOGL", { scope: "valuation" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cached).toBe(false);
      expect(result.data.overview?.peRatio).toBe(17.3);
      expect(result.data.provider).toBe("yahoo");
    }
    expect(guards.requireFeatureQuotaByUserId).toHaveBeenCalled();
  });
});
