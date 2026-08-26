import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  listHoldings: vi.fn(),
  getUserSettings: vi.fn(),
  getRecommendationCache: vi.fn(),
  listRecommendationStates: vi.fn(),
  listCashEntries: vi.fn().mockResolvedValue([]),
  upsertRecommendationCache: vi.fn(),
  getSnapTradeMarkReconciliation: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/holding-quotes", () => ({
  fetchProviderQuotesForHoldings: vi.fn(),
  fetchProviderQuotesForHoldingsWithStats: vi.fn(),
}));

vi.mock("@/lib/aid/build-status", () => ({
  buildAidStatus: vi.fn(),
}));

vi.mock("@/lib/homepage/build-day-highlights", () => ({
  buildDayHighlightsPayload: vi.fn(),
}));

vi.mock("@/lib/quote-cache", () => ({
  getQuotesWithCache: vi.fn(),
  getRatesWithCache: vi.fn().mockResolvedValue({ EURUSD: 1.1 }),
}));

import {
  listHoldings,
  getUserSettings,
  getRecommendationCache,
  listRecommendationStates,
  listCashEntries,
} from "@/lib/db";
import { fetchProviderQuotesForHoldingsWithStats } from "@/lib/holding-quotes";
import { buildAidStatus } from "@/lib/aid/build-status";
import { buildDayHighlightsPayload } from "@/lib/homepage/build-day-highlights";
import { getRatesWithCache } from "@/lib/quote-cache";
import {
  buildHomeBootstrap,
  buildHomeBootstrapCore,
  buildHomeBootstrapSections,
} from "./build-home-bootstrap";
import { resolveRecommendationQueue } from "./resolve-recommendation-queue";

const mockedHoldings = vi.mocked(listHoldings);
const mockedSettings = vi.mocked(getUserSettings);
const mockedQuotes = vi.mocked(fetchProviderQuotesForHoldingsWithStats);
const mockedRates = vi.mocked(getRatesWithCache);
const mockedStatus = vi.mocked(buildAidStatus);
const mockedHighlights = vi.mocked(buildDayHighlightsPayload);
const mockedCache = vi.mocked(getRecommendationCache);
const mockedStates = vi.mocked(listRecommendationStates);

const sampleHolding = {
  ticker: "AAPL",
  shares: 1,
  exchange: "NMS",
  displayCurrency: "USD",
  valueInEUR: 100,
  name: "Apple",
  sector: "Technology",
};

const sampleQuotes = {
  quotes: {
    AAPL: {
      symbol: "AAPL",
      shortName: "Apple",
      regularMarketPrice: 100,
      regularMarketChange: 1,
      regularMarketChangePercent: 1,
      currency: "USD",
      regularMarketPreviousClose: 99,
      fiftyTwoWeekHigh: 200,
      fiftyTwoWeekLow: 50,
      marketCap: 1,
    },
  },
  stats: { hitCount: 1, missCount: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedHoldings.mockResolvedValue([sampleHolding] as never);
  mockedSettings.mockResolvedValue({ language: "en", defaultCurrency: "EUR" } as never);
  mockedQuotes.mockResolvedValue(sampleQuotes);
  mockedRates.mockResolvedValue({ EURUSD: 1.1 });
  mockedHighlights.mockResolvedValue({
    highlights: [],
    language: "en",
    asOf: "2026-08-23T00:00:00.000Z",
  });
  mockedStatus.mockResolvedValue({
    newCount: 0,
    caughtUp: true,
    breakdown: { finPulse: 0, digest: 0, earningsRecap: 0, alerts: 0 },
    briefing: null,
    marketSession: "closed",
    warrenNudge: null,
  });
  mockedStates.mockResolvedValue([]);
  mockedCache.mockResolvedValue(null);
  vi.mocked(listCashEntries).mockResolvedValue([]);
});

describe("buildHomeBootstrapCore", () => {
  it("returns holdings, cash, quotes, and FX without sections work", async () => {
    const payload = await buildHomeBootstrapCore({ userId: "u1", portfolioId: "p1" });
    expect(mockedQuotes).toHaveBeenCalledTimes(1);
    expect(mockedStatus).not.toHaveBeenCalled();
    expect(mockedHighlights).not.toHaveBeenCalled();
    expect(payload.holdings).toHaveLength(1);
    expect(payload.quotes.AAPL?.regularMarketPrice).toBe(100);
    expect(payload.quoteStats).toEqual({ hitCount: 1, missCount: 0 });
  });
});

describe("buildHomeBootstrapSections", () => {
  it("builds below-the-fold sections with cache-only recommendations", async () => {
    const payload = await buildHomeBootstrapSections({ userId: "u1", portfolioId: "p1" });
    expect(mockedStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        includeBriefing: false,
        holdings: expect.any(Array),
      }),
    );
    expect(payload.aidStatus.briefing).toBeNull();
    expect(mockedHighlights).toHaveBeenCalled();
  });
});

describe("buildHomeBootstrap", () => {
  it("fetches quotes once and builds status without briefing", async () => {
    const payload = await buildHomeBootstrap({ userId: "u1", portfolioId: "p1" });
    expect(mockedQuotes).toHaveBeenCalled();
    expect(payload.aidStatus.briefing).toBeNull();
    expect(payload.quotes.AAPL?.regularMarketPrice).toBe(100);
    expect(payload.holdingsCount).toBe(1);
  });
});

describe("resolveRecommendationQueue cacheOnly", () => {
  it("returns empty queue without live compute on cache miss", async () => {
    const result = await resolveRecommendationQueue({
      userId: "u1",
      cacheOnly: true,
    });
    expect(result.total).toBe(0);
    expect(result.source).toBe("cache");
    expect(result.current).toBeNull();
  });
});
