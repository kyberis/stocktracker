import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  listDistinctHoldingTickers: vi.fn(),
  batchUpdateValueInEur: vi.fn(),
  resolveStaleTickersViaFigi: vi.fn(),
}));

vi.mock("@/lib/cron-quotes", () => ({
  fetchSharedQuotesAndRates: vi.fn(),
  shouldFetchLiveMarketData: vi.fn(),
}));

vi.mock("@/lib/coverage-gaps", () => ({
  recordCoverageGaps: vi.fn().mockResolvedValue(undefined),
}));

import { listDistinctHoldingTickers, batchUpdateValueInEur, resolveStaleTickersViaFigi } from "@/lib/db";
import { fetchSharedQuotesAndRates, shouldFetchLiveMarketData } from "@/lib/cron-quotes";
import { recordCoverageGaps } from "@/lib/coverage-gaps";
import { runRefreshHoldingsJob } from "./cron-refresh-holdings";

function quote(symbol: string, price: number, currency = "USD") {
  return {
    symbol,
    shortName: symbol,
    regularMarketPrice: price,
    regularMarketChange: 1,
    regularMarketChangePercent: 0.5,
    currency,
    regularMarketPreviousClose: price - 1,
    fiftyTwoWeekHigh: price + 10,
    fiftyTwoWeekLow: price - 10,
    marketCap: 1,
  };
}

describe("runRefreshHoldingsJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty stats when there are no holdings", async () => {
    vi.mocked(listDistinctHoldingTickers).mockResolvedValue([]);
    await expect(runRefreshHoldingsJob()).resolves.toEqual({
      tickers: 0,
      updated: 0,
      errors: 0,
    });
    expect(fetchSharedQuotesAndRates).not.toHaveBeenCalled();
  });

  it("skips Yahoo when no relevant market is open", async () => {
    vi.mocked(listDistinctHoldingTickers).mockResolvedValue([
      {
        ticker: "AAPL",
        displayCurrency: "USD",
        exchange: "NYSE",
        figiShareClass: "",
        assetType: "stock",
      },
    ]);
    vi.mocked(shouldFetchLiveMarketData).mockReturnValue(false);

    await expect(runRefreshHoldingsJob()).resolves.toEqual({
      tickers: 1,
      updated: 0,
      errors: 0,
      skippedMarketsClosed: true,
    });
    expect(fetchSharedQuotesAndRates).not.toHaveBeenCalled();
    expect(batchUpdateValueInEur).not.toHaveBeenCalled();
  });

  it("updates EUR values from the shared quote cache", async () => {
    vi.mocked(listDistinctHoldingTickers).mockResolvedValue([
      {
        ticker: "AAPL",
        displayCurrency: "USD",
        exchange: "NYSE",
        figiShareClass: "",
        assetType: "stock",
      },
    ]);
    vi.mocked(shouldFetchLiveMarketData).mockReturnValue(true);
    vi.mocked(fetchSharedQuotesAndRates).mockResolvedValue({
      quotes: { AAPL: quote("AAPL", 190) },
      exchangeRates: { EURUSD: 1.1 },
      quoteErrors: 0,
      uniqueTickers: 1,
    });
    vi.mocked(batchUpdateValueInEur).mockResolvedValue(3);

    await expect(runRefreshHoldingsJob()).resolves.toEqual({
      tickers: 1,
      quoted: 1,
      fxPairs: 1,
      updated: 3,
      errors: 0,
      figiResolved: 0,
      uncoveredTickers: [],
      coverageGaps: 0,
    });
    expect(recordCoverageGaps).toHaveBeenCalledWith([]);
    expect(batchUpdateValueInEur).toHaveBeenCalledWith([
      expect.objectContaining({
        ticker: "AAPL",
        pricePerShareEur: expect.any(Object),
      }),
    ]);
  });

  it("re-fetches quotes after an OpenFIGI ticker rename", async () => {
    vi.mocked(listDistinctHoldingTickers).mockResolvedValue([
      {
        ticker: "OLD",
        displayCurrency: "USD",
        exchange: "NYSE",
        figiShareClass: "BBG001",
        assetType: "stock",
      },
    ]);
    vi.mocked(shouldFetchLiveMarketData).mockReturnValue(true);
    vi.mocked(fetchSharedQuotesAndRates)
      .mockResolvedValueOnce({
        quotes: {},
        exchangeRates: {},
        quoteErrors: 1,
        uniqueTickers: 1,
      })
      .mockResolvedValueOnce({
        quotes: { NEW: quote("NEW", 50) },
        exchangeRates: { EURUSD: 1.1 },
        quoteErrors: 0,
        uniqueTickers: 1,
      });
    vi.mocked(resolveStaleTickersViaFigi).mockResolvedValue([
      { oldTicker: "OLD", newTicker: "NEW" },
    ]);
    vi.mocked(batchUpdateValueInEur).mockResolvedValue(1);

    const result = await runRefreshHoldingsJob();

    expect(resolveStaleTickersViaFigi).toHaveBeenCalled();
    expect(fetchSharedQuotesAndRates).toHaveBeenCalledTimes(2);
    expect(result.figiResolved).toBe(1);
    expect(result.quoted).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.uncoveredTickers).toEqual([]);
  });
});
