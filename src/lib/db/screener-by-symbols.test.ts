import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockClient = { execute: mockExecute };
  return { mockExecute, mockClient };
});

vi.mock("./client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

import {
  getScreenerCacheBySymbols,
  listHotScreenerSymbols,
  listStaleOrMissingScreenerSymbols,
} from "./screener";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getScreenerCacheBySymbols", () => {
  it("returns an empty map for no symbols without querying", async () => {
    const map = await getScreenerCacheBySymbols([]);
    expect(map.size).toBe(0);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("uppercases symbols and maps rows by ticker", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          symbol: "AAPL",
          short_name: "Apple",
          sector: "Technology",
          industry: "Hardware",
          country: "",
          exchange: "NMS",
          currency: "USD",
          market_cap: 3e12,
          pe_ratio: 28,
          forward_pe: 24,
          dividend_yield: 0.005,
          dividend_per_share: 1,
          eps: 7,
          beta: 1.1,
          profit_margin: 0.25,
          return_on_equity: 1.4,
          fifty_two_week_high: 260,
          fifty_two_week_low: 160,
          regular_market_price: 200,
          regular_market_change_percent: 0.5,
          analyst_strong_buy: 10,
          analyst_buy: 8,
          analyst_hold: 4,
          analyst_sell: 0,
          analyst_strong_sell: 0,
          updated_at: "2026-08-01",
        },
      ],
    });

    const map = await getScreenerCacheBySymbols(["aapl", "AAPL"]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(map.get("AAPL")?.forwardPe).toBe(24);
    expect(map.get("AAPL")?.peRatio).toBe(28);
  });
});

describe("listHotScreenerSymbols", () => {
  it("orders by market cap descending", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ symbol: "AAPL" }, { symbol: "MSFT" }],
    });
    await expect(listHotScreenerSymbols(80, 10_000_000_000)).resolves.toEqual(["AAPL", "MSFT"]);
    expect(mockExecute).toHaveBeenCalledWith({
      sql: expect.stringContaining("market_cap >= ?"),
      args: [10_000_000_000, 80],
    });
  });
});

describe("listStaleOrMissingScreenerSymbols", () => {
  it("returns missing and stale symbols", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          symbol: "AAPL",
          short_name: "Apple",
          sector: "",
          industry: "",
          country: "",
          exchange: "",
          currency: "USD",
          market_cap: 1,
          pe_ratio: null,
          forward_pe: null,
          dividend_yield: null,
          dividend_per_share: null,
          eps: null,
          beta: null,
          profit_margin: null,
          return_on_equity: null,
          fifty_two_week_high: null,
          fifty_two_week_low: null,
          regular_market_price: null,
          regular_market_change_percent: null,
          analyst_strong_buy: 0,
          analyst_buy: 0,
          analyst_hold: 0,
          analyst_sell: 0,
          analyst_strong_sell: 0,
          updated_at: "2020-01-01T00:00:00.000Z",
        },
      ],
    });

    const stale = await listStaleOrMissingScreenerSymbols(["AAPL", "NVDA"], 24);
    expect(stale).toEqual(["AAPL", "NVDA"]);
  });
});
