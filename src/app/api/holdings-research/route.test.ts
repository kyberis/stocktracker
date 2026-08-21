import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/auth/guards", () => ({
  requireFeatureQuota: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  listHoldings: vi.fn(),
  getScreenerCacheBySymbols: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/api-providers/yahoo", () => ({
  YahooProvider: class {
    getOverview = vi.fn();
  },
}));

import { requireFeatureQuota } from "@/lib/auth/guards";
import { getScreenerCacheBySymbols, listHoldings } from "@/lib/db";
import { GET } from "./route";

const mockedQuota = vi.mocked(requireFeatureQuota);
const mockedHoldings = vi.mocked(listHoldings);
const mockedCache = vi.mocked(getScreenerCacheBySymbols);

beforeEach(() => {
  vi.clearAllMocks();
  mockedQuota.mockResolvedValue({
    session: {
      userId: "u1",
      username: "u",
      email: "u@test.dev",
      role: "user",
      mustChangePassword: false,
      plan: "pro",
      emailVerified: true,
      onboardingCompleted: true,
    },
    error: null,
  } as never);
});

describe("GET /api/holdings-research", () => {
  it("returns 401/403 when quota guard fails", async () => {
    mockedQuota.mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as never);
    const res = await GET(new NextRequest("http://localhost/api/holdings-research"));
    expect(res.status).toBe(401);
  });

  it("joins screener cache onto stock holdings", async () => {
    mockedHoldings.mockResolvedValue([
      {
        id: "h1",
        name: "Apple",
        ticker: "AAPL",
        isin: "",
        assetType: "stock",
        shares: 1,
        purchasePrice: 100,
        displayCurrency: "USD",
        exchange: "NMS",
        valueInEUR: 200,
      },
    ] as never);
    mockedCache.mockResolvedValue(
      new Map([
        [
          "AAPL",
          {
            symbol: "AAPL",
            shortName: "Apple",
            sector: "Technology",
            industry: "",
            country: "",
            exchange: "NMS",
            currency: "USD",
            marketCap: 3e12,
            peRatio: 28,
            forwardPe: 24,
            dividendYield: 0.005,
            dividendPerShare: 1,
            eps: 7,
            beta: 1,
            profitMargin: 0.2,
            returnOnEquity: 1,
            fiftyTwoWeekHigh: 260,
            fiftyTwoWeekLow: 160,
            regularMarketPrice: 200,
            regularMarketChangePercent: 1,
            analystStrongBuy: 1,
            analystBuy: 1,
            analystHold: 1,
            analystSell: 0,
            analystStrongSell: 0,
            updatedAt: "2026-08-01",
          },
        ],
      ]),
    );

    const res = await GET(new NextRequest("http://localhost/api/holdings-research"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].fundamentals.forwardPe).toBe(24);
    expect(body.rows[0].fundamentals.source).toBe("cache");
    expect(body.metricsPartial).toBe(false);
  });
});
