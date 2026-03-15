import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCoinLoreId,
  getTopTickers,
  getTickersByIds,
  getTickerBySymbol,
  getTopCryptoTickers,
  getGlobalStats,
  normalizeTicker,
  TOP_CRYPTO_SYMBOLS,
  type CoinLoreTicker,
} from "./coinlore";

const fakeTicker: CoinLoreTicker = {
  id: "90",
  symbol: "BTC",
  name: "Bitcoin",
  price_usd: "65432.12",
  percent_change_24h: "2.5",
  percent_change_1h: "0.3",
  percent_change_7d: "-1.2",
  market_cap_usd: "1200000000000",
  volume24: 45000000000,
  volume24a: 44000000000,
  csupply: "19500000",
  tsupply: "21000000",
  msupply: "21000000",
};

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getCoinLoreId", () => {
  it("returns id for known symbol", () => {
    expect(getCoinLoreId("BTC")).toBe("90");
    expect(getCoinLoreId("ETH")).toBe("80");
  });

  it("is case insensitive", () => {
    expect(getCoinLoreId("btc")).toBe("90");
  });

  it("returns undefined for unknown symbol", () => {
    expect(getCoinLoreId("UNKNOWN")).toBeUndefined();
  });
});

describe("normalizeTicker", () => {
  it("converts raw ticker to normalized format", () => {
    const result = normalizeTicker(fakeTicker);
    expect(result.symbol).toBe("BTC");
    expect(result.name).toBe("Bitcoin");
    expect(result.priceUsd).toBe(65432.12);
    expect(result.change24h).toBe(2.5);
    expect(result.change1h).toBe(0.3);
    expect(result.change7d).toBe(-1.2);
    expect(result.marketCapUsd).toBe(1200000000000);
    expect(result.volume24hUsd).toBe(45000000000);
    expect(result.circulatingSupply).toBe(19500000);
    expect(result.coinloreId).toBe("90");
  });

  it("handles NaN values gracefully", () => {
    const bad = { ...fakeTicker, price_usd: "not-a-number", percent_change_24h: "" };
    const result = normalizeTicker(bad);
    expect(result.priceUsd).toBe(0);
    expect(result.change24h).toBe(0);
  });
});

describe("getTopTickers", () => {
  it("fetches top tickers from CoinLore API", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [fakeTicker], info: { coins_num: 1, time: 0 } }),
    });

    const result = await getTopTickers(5);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("BTC");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/tickers/?start=0&limit=5"),
      expect.any(Object),
    );
  });

  it("returns empty array when data is missing", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ info: { coins_num: 0, time: 0 } }),
    });

    const result = await getTopTickers();
    expect(result).toEqual([]);
  });

  it("throws on API error", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(getTopTickers()).rejects.toThrow("CoinLore API error: 500");
  });
});

describe("getTickersByIds", () => {
  it("returns empty array for empty ids", async () => {
    const result = await getTickersByIds([]);
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches tickers by comma-separated ids", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([fakeTicker]),
    });

    const result = await getTickersByIds(["90", "80"]);
    expect(result).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/ticker/?id=90,80"),
      expect.any(Object),
    );
  });

  it("returns empty array when response is not an array", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: "invalid" }),
    });

    const result = await getTickersByIds(["999"]);
    expect(result).toEqual([]);
  });
});

describe("getTickerBySymbol", () => {
  it("returns ticker for known symbol", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([fakeTicker]),
    });

    const result = await getTickerBySymbol("BTC");
    expect(result).toBeTruthy();
    expect(result!.symbol).toBe("BTC");
  });

  it("returns null for unknown symbol", async () => {
    const result = await getTickerBySymbol("UNKNOWN_COIN");
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("getTopCryptoTickers", () => {
  it("fetches tickers for TOP_CRYPTO_SYMBOLS", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([fakeTicker]),
    });

    const result = await getTopCryptoTickers();
    expect(result).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/ticker/?id="),
      expect.any(Object),
    );
  });
});

describe("getGlobalStats", () => {
  it("fetches global crypto stats", async () => {
    const stats = [{ coins_count: 100, active_markets: 50, total_mcap: 2e12, total_volume: 1e11, btc_d: "45", eth_d: "18", mcap_change: "1.5", volume_change: "-0.5" }];
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(stats),
    });

    const result = await getGlobalStats();
    expect(result).toEqual(stats);
  });
});
