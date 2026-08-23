import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  upsertScreenerCache: vi.fn().mockResolvedValue(undefined),
  listDistinctHoldingTickers: vi.fn(),
}));

vi.mock("@/lib/db/screener", () => ({
  listHotScreenerSymbols: vi.fn(),
  listStaleOrMissingScreenerSymbols: vi.fn(),
}));

const getOverview = vi.fn();
const getQuote = vi.fn();

vi.mock("@/lib/api-providers/yahoo", () => ({
  YahooProvider: class {
    getOverview = getOverview;
    getQuote = getQuote;
  },
}));

import { listDistinctHoldingTickers, upsertScreenerCache } from "@/lib/db";
import { listHotScreenerSymbols, listStaleOrMissingScreenerSymbols } from "@/lib/db/screener";
import {
  ensureScreenerSymbols,
  inferCurrencyFromSymbol,
  mergeScreenerSyncTargets,
  resolveScreenerSyncTargets,
  syncScreenerTickers,
} from "./screener-sync";

describe("inferCurrencyFromSymbol", () => {
  it("maps common suffixes and defaults to USD", () => {
    expect(inferCurrencyFromSymbol("EQNR.OL")).toBe("NOK");
    expect(inferCurrencyFromSymbol("AIR.PA")).toBe("EUR");
    expect(inferCurrencyFromSymbol("VOD.L")).toBe("GBP");
    expect(inferCurrencyFromSymbol("AAPL")).toBe("USD");
  });
});

describe("mergeScreenerSyncTargets", () => {
  it("unions holdings and hot names, uppercased", () => {
    expect(mergeScreenerSyncTargets(["aapl", "MSFT"], ["MSFT", "googl"])).toEqual([
      "AAPL",
      "MSFT",
      "GOOGL",
    ]);
  });
});

describe("resolveScreenerSyncTargets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns holdings union hot mega-caps", async () => {
    vi.mocked(listDistinctHoldingTickers).mockResolvedValue([
      { ticker: "AAPL", displayCurrency: "USD", exchange: "NMS", figiShareClass: "", assetType: "stock" },
      { ticker: "SAP.DE", displayCurrency: "EUR", exchange: "GER", figiShareClass: "", assetType: "stock" },
    ]);
    vi.mocked(listHotScreenerSymbols).mockResolvedValue(["AAPL", "NVDA", "MSFT"]);

    await expect(resolveScreenerSyncTargets()).resolves.toEqual({
      tickers: ["AAPL", "SAP.DE", "NVDA", "MSFT"],
      holdings: 2,
      hot: 3,
    });
  });
});

describe("syncScreenerTickers / ensureScreenerSymbols", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOverview.mockResolvedValue({
      name: "Apple",
      sector: "Technology",
      industry: "Hardware",
      currency: "USD",
      peRatio: 28,
      forwardPE: 24,
      dividendYield: 0.005,
      dividendPerShare: 1,
      eps: 7,
      beta: 1,
      profitMargin: 0.2,
      returnOnEquity: 1.4,
      analystRatings: { strongBuy: 1, buy: 1, hold: 1, sell: 0, strongSell: 0 },
    });
    getQuote.mockResolvedValue({
      shortName: "Apple Inc.",
      currency: "USD",
      marketCap: 3e12,
      fiftyTwoWeekHigh: 260,
      fiftyTwoWeekLow: 160,
      regularMarketPrice: 200,
      regularMarketChangePercent: 1,
    });
  });

  it("writes cache rows for symbols with overview", async () => {
    const result = await syncScreenerTickers(["AAPL"]);
    expect(result).toEqual({ synced: 1, errors: 0, skipped: 0, total: 1 });
    expect(upsertScreenerCache).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "AAPL", shortName: "Apple Inc.", peRatio: 28 }),
    );
  });

  it("skips symbols without overview", async () => {
    getOverview.mockResolvedValueOnce(null);
    await expect(syncScreenerTickers(["ZZZZ"])).resolves.toEqual({
      synced: 0,
      errors: 0,
      skipped: 1,
      total: 1,
    });
    expect(upsertScreenerCache).not.toHaveBeenCalled();
  });

  it("only syncs stale or missing symbols on ensure", async () => {
    vi.mocked(listStaleOrMissingScreenerSymbols).mockResolvedValue(["NVDA"]);
    const result = await ensureScreenerSymbols(["AAPL", "NVDA"], { maxSync: 8 });
    expect(listStaleOrMissingScreenerSymbols).toHaveBeenCalledWith(["AAPL", "NVDA"], 24);
    expect(result.needed).toEqual(["NVDA"]);
    expect(result.synced).toBe(1);
  });

  it("no-ops when cache is fresh", async () => {
    vi.mocked(listStaleOrMissingScreenerSymbols).mockResolvedValue([]);
    await expect(ensureScreenerSymbols(["AAPL"])).resolves.toEqual({
      needed: [],
      synced: 0,
      errors: 0,
      skipped: 0,
    });
    expect(upsertScreenerCache).not.toHaveBeenCalled();
  });
});
