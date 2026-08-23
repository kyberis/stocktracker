import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/quote-cache", () => ({
  getQuotesWithCache: vi.fn(),
  getRatesWithCache: vi.fn(),
}));

import { getQuotesWithCache, getRatesWithCache } from "@/lib/quote-cache";
import { fetchSharedQuotesAndRates, shouldFetchLiveMarketData } from "./cron-quotes";

function atUtc(iso: string): Date {
  return new Date(iso);
}

describe("shouldFetchLiveMarketData", () => {
  it("skips weekend equity when every exchange is closed", () => {
    const saturday = atUtc("2026-08-22T15:00:00.000Z");
    expect(
      shouldFetchLiveMarketData(
        [{ assetType: "stock", exchange: "NYSE" }],
        saturday,
      ),
    ).toBe(false);
  });

  it("keeps fetching when any holding is crypto", () => {
    const saturday = atUtc("2026-08-22T15:00:00.000Z");
    expect(
      shouldFetchLiveMarketData(
        [
          { assetType: "stock", exchange: "NYSE" },
          { assetType: "crypto", exchange: "CCC" },
        ],
        saturday,
      ),
    ).toBe(true);
  });

  it("fetches during a weekday US session", () => {
    const nyseOpen = atUtc("2026-08-21T15:00:00.000Z");
    expect(
      shouldFetchLiveMarketData(
        [{ assetType: "stock", exchange: "NYSE" }],
        nyseOpen,
      ),
    ).toBe(true);
  });

  it("uses the weekday heuristic when no exchange metadata exists", () => {
    const weekday = atUtc("2026-08-21T15:00:00.000Z");
    const saturday = atUtc("2026-08-22T15:00:00.000Z");
    expect(shouldFetchLiveMarketData([], weekday)).toBe(true);
    expect(shouldFetchLiveMarketData([], saturday)).toBe(false);
    expect(
      shouldFetchLiveMarketData([{ assetType: "stock" }], weekday),
    ).toBe(true);
  });
});

describe("fetchSharedQuotesAndRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads quotes and FX through the shared Redis cache", async () => {
    vi.mocked(getQuotesWithCache).mockResolvedValue({
      AAPL: {
        symbol: "AAPL",
        shortName: "Apple",
        regularMarketPrice: 190,
        regularMarketChange: 1,
        regularMarketChangePercent: 0.5,
        currency: "USD",
        regularMarketPreviousClose: 189,
        fiftyTwoWeekHigh: 200,
        fiftyTwoWeekLow: 150,
        marketCap: 1,
      },
    });
    vi.mocked(getRatesWithCache).mockResolvedValue({ EURUSD: 1.1 });

    const result = await fetchSharedQuotesAndRates({
      tickers: ["AAPL", "AAPL", ""],
      currencies: ["USD", "EUR"],
    });

    expect(getQuotesWithCache).toHaveBeenCalledWith(["AAPL"]);
    expect(getRatesWithCache).toHaveBeenCalledWith(["EURUSD"]);
    expect(result.uniqueTickers).toBe(1);
    expect(result.quoteErrors).toBe(0);
    expect(result.quotes.AAPL.regularMarketPrice).toBe(190);
    expect(result.exchangeRates.EURUSD).toBe(1.1);
  });

  it("fetches Yahoo quotes in batches of 15", async () => {
    vi.mocked(getQuotesWithCache).mockImplementation(async (tickers) => {
      const out: Record<string, { regularMarketPrice: number; currency: string }> = {};
      for (const t of tickers) {
        out[t] = {
          regularMarketPrice: 1,
          currency: "USD",
        };
      }
      return out as never;
    });
    vi.mocked(getRatesWithCache).mockResolvedValue({});

    const tickers = Array.from({ length: 16 }, (_, i) => `T${i}`);
    await fetchSharedQuotesAndRates({ tickers, currencies: ["USD"] });

    expect(getQuotesWithCache).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getQuotesWithCache).mock.calls[0][0]).toHaveLength(15);
    expect(vi.mocked(getQuotesWithCache).mock.calls[1][0]).toHaveLength(1);
  });

  it("counts tickers without a usable price as quote errors", async () => {
    vi.mocked(getQuotesWithCache).mockResolvedValue({});
    vi.mocked(getRatesWithCache).mockResolvedValue({});

    const result = await fetchSharedQuotesAndRates({
      tickers: ["DEAD"],
      currencies: ["EUR"],
    });

    expect(result.quoteErrors).toBe(1);
    expect(result.uniqueTickers).toBe(1);
  });
});
