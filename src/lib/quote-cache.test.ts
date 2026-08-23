import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/upstash", () => ({
  getRedisClient: vi.fn(() => null),
}));

vi.mock("@/lib/resolve-yahoo-quote", () => ({
  resolveYahooQuote: vi.fn(),
}));

vi.mock("@/lib/api-providers/yahoo", () => ({
  YahooProvider: vi.fn().mockImplementation(() => ({})),
}));

import { getQuotesWithCache, mapPool } from "./quote-cache";
import { resolveYahooQuote } from "@/lib/resolve-yahoo-quote";

const mockedResolve = vi.mocked(resolveYahooQuote);

describe("mapPool", () => {
  it("respects concurrency and runs all items", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const seen: number[] = [];
    await mapPool([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      seen.push(n);
      inFlight--;
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it("stops starting work when shouldStop becomes true", async () => {
    let started = 0;
    await mapPool(
      [1, 2, 3, 4, 5, 6, 7, 8],
      2,
      async () => {
        started++;
        await new Promise((r) => setTimeout(r, 10));
      },
      () => started >= 3,
    );
    expect(started).toBeLessThan(8);
    expect(started).toBeGreaterThanOrEqual(3);
  });
});

describe("getQuotesWithCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches misses with bounded concurrency when Redis is unavailable", async () => {
    mockedResolve.mockImplementation(async (_yahoo, symbol) => ({
      symbol,
      shortName: symbol,
      regularMarketPrice: 10,
      regularMarketChange: 0,
      regularMarketChangePercent: 0,
      currency: "EUR",
      regularMarketPreviousClose: 10,
      fiftyTwoWeekHigh: 12,
      fiftyTwoWeekLow: 8,
      marketCap: 0,
    }));

    const result = await getQuotesWithCache(["A", "B", "C"], { concurrency: 2 });
    expect(Object.keys(result).sort()).toEqual(["A", "B", "C"]);
    expect(mockedResolve).toHaveBeenCalledTimes(3);
  });

  it("returns partial results when deadline elapses before all quotes resolve", async () => {
    mockedResolve.mockImplementation(async (_yahoo, symbol) => {
      await new Promise((r) => setTimeout(r, 40));
      return {
        symbol,
        shortName: symbol,
        regularMarketPrice: 10,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        currency: "EUR",
        regularMarketPreviousClose: 10,
        fiftyTwoWeekHigh: 12,
        fiftyTwoWeekLow: 8,
        marketCap: 0,
      };
    });

    const tickers = Array.from({ length: 20 }, (_, i) => `T${i}`);
    const result = await getQuotesWithCache(tickers, {
      concurrency: 2,
      deadlineMs: 50,
    });

    const fetched = Object.keys(result).length;
    expect(fetched).toBeGreaterThan(0);
    expect(fetched).toBeLessThan(tickers.length);
  });
});
