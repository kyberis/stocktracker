import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  resolveStaleTickersViaFigi: vi.fn(),
}));

vi.mock("@/lib/cron-quotes", () => ({
  fetchSharedQuotesAndRates: vi.fn(),
}));

import { resolveStaleTickersViaFigi } from "@/lib/db";
import { fetchSharedQuotesAndRates } from "@/lib/cron-quotes";
import { healFailedHoldingQuotes, quotesFromShared } from "./holding-quote-coverage";

describe("quotesFromShared", () => {
  it("splits priced quotes from misses", () => {
    const { quotes, failedTickers } = quotesFromShared(["AAPL", "OLD", "ZERO"], {
      AAPL: { regularMarketPrice: 190, currency: "USD" },
      ZERO: { regularMarketPrice: 0, currency: "USD" },
    });
    expect(quotes).toEqual({ AAPL: { price: 190, currency: "USD" } });
    expect(failedTickers).toEqual(["OLD", "ZERO"]);
  });
});

describe("healFailedHoldingQuotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty stillFailed when nothing failed", async () => {
    await expect(
      healFailedHoldingQuotes({
        distinctTickers: [],
        failedTickers: [],
        quotes: { AAPL: { price: 1, currency: "USD" } },
        exchangeRates: {},
      }),
    ).resolves.toEqual({
      quotes: { AAPL: { price: 1, currency: "USD" } },
      exchangeRates: {},
      figiResolved: 0,
      stillFailed: [],
    });
    expect(resolveStaleTickersViaFigi).not.toHaveBeenCalled();
  });

  it("renames via FIGI and re-fetches the new ticker", async () => {
    vi.mocked(resolveStaleTickersViaFigi).mockResolvedValue([
      { oldTicker: "OLD", newTicker: "NEW" },
    ]);
    vi.mocked(fetchSharedQuotesAndRates).mockResolvedValue({
      quotes: {
        NEW: {
          symbol: "NEW",
          shortName: "New",
          regularMarketPrice: 50,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
          currency: "USD",
          regularMarketPreviousClose: 49,
          fiftyTwoWeekHigh: 60,
          fiftyTwoWeekLow: 40,
          marketCap: 1,
        },
      },
      exchangeRates: { EURUSD: 1.1 },
      quoteErrors: 0,
      uniqueTickers: 1,
    });

    const distinct = [
      {
        ticker: "OLD",
        displayCurrency: "USD",
        exchange: "NYSE",
        figiShareClass: "BBG001",
        assetType: "stock" as const,
      },
    ];

    const result = await healFailedHoldingQuotes({
      distinctTickers: distinct,
      failedTickers: ["OLD"],
      quotes: {},
      exchangeRates: {},
    });

    expect(resolveStaleTickersViaFigi).toHaveBeenCalled();
    expect(result.figiResolved).toBe(1);
    expect(result.quotes.NEW).toEqual({ price: 50, currency: "USD" });
    expect(result.stillFailed).toEqual([]);
    expect(distinct[0]?.ticker).toBe("NEW");
  });
});
