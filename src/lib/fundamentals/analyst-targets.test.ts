import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CompanyOverview } from "@/lib/api-providers/types";

vi.mock("@/lib/db/fundamentals-cache", () => ({
  getFundamentalsCacheBySymbols: vi.fn(),
}));

vi.mock("@/lib/services/share-fundamentals", () => ({
  ensureShareFundamentalsBatch: vi.fn(),
  isFundamentalsFresh: vi.fn(() => true),
}));

import { getFundamentalsCacheBySymbols } from "@/lib/db/fundamentals-cache";
import { ensureShareFundamentalsBatch } from "@/lib/services/share-fundamentals";
import { resolveAnalystTargetsForHoldings } from "./analyst-targets";

const mockedCache = vi.mocked(getFundamentalsCacheBySymbols);
const mockedBatch = vi.mocked(ensureShareFundamentalsBatch);

const overviewWithTarget = (price: number): CompanyOverview => ({
  symbol: "AAPL",
  name: "Apple",
  description: "",
  exchange: "NMS",
  currency: "USD",
  sector: "Technology",
  industry: "",
  peRatio: 28,
  pegRatio: null,
  eps: 6,
  dividendPerShare: null,
  dividendYield: null,
  beta: 1.2,
  profitMargin: null,
  returnOnEquity: null,
  revenueTTM: null,
  analystTargetPrice: price,
  analystRatings: null,
  fiftyDayMA: null,
  twoHundredDayMA: null,
  sharesOutstanding: null,
  forwardPE: null,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveAnalystTargetsForHoldings", () => {
  it("returns cached analyst targets keyed by holding ticker", async () => {
    mockedCache.mockResolvedValue(
      new Map([
        [
          "AAPL",
          {
            symbol: "AAPL",
            type: "overview",
            dataJson: JSON.stringify(overviewWithTarget(220)),
            provider: "yahoo",
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-10 00:00:00",
          },
        ],
      ]),
    );

    const result = await resolveAnalystTargetsForHoldings("u1", [
      {
        id: "h1",
        name: "Apple",
        ticker: "AAPL",
        isin: "",
        shares: 1,
        purchasePrice: 100,
        displayCurrency: "USD",
        exchange: "NMS",
        valueInEUR: 100,
        assetType: "stock",
      },
    ]);

    expect(result.targets.AAPL).toEqual({
      price: 220,
      currency: "USD",
      updatedAt: "2026-01-10 00:00:00",
    });
    expect(result.partial).toBe(false);
    expect(mockedBatch).not.toHaveBeenCalled();
  });

  it("skips crypto holdings", async () => {
    mockedCache.mockResolvedValue(new Map());

    const result = await resolveAnalystTargetsForHoldings("u1", [
      {
        id: "c1",
        name: "Bitcoin",
        ticker: "BTC-USD",
        isin: "",
        shares: 1,
        purchasePrice: 100,
        displayCurrency: "USD",
        exchange: "",
        valueInEUR: 100,
        assetType: "crypto",
      },
    ]);

    expect(result.targets).toEqual({});
    expect(mockedBatch).not.toHaveBeenCalled();
  });

  it("backfills cache misses up to the cap", async () => {
    mockedCache.mockResolvedValue(new Map());
    mockedBatch.mockResolvedValue([
      {
        ok: true,
        data: {
          symbol: "MSFT",
          overview: overviewWithTarget(480),
          income: null,
          balance: null,
          cashflow: null,
          earnings: null,
          provider: "yahoo",
          cached: false,
          fetchedAt: "2026-01-12 00:00:00",
        },
      },
    ]);

    const result = await resolveAnalystTargetsForHoldings("u1", [
      {
        id: "h2",
        name: "Microsoft",
        ticker: "MSFT",
        isin: "",
        shares: 1,
        purchasePrice: 100,
        displayCurrency: "USD",
        exchange: "NMS",
        valueInEUR: 100,
        assetType: "stock",
      },
    ]);

    expect(mockedBatch).toHaveBeenCalledWith("u1", expect.arrayContaining(["MSFT"]), {
      scope: "valuation",
      concurrency: 6,
    });
    expect(result.targets.MSFT?.price).toBe(480);
  });
});
