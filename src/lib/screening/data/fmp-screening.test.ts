import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_API_KEY = process.env.FMP_API_KEY;

describe("fetchFmpScreener", () => {
  beforeEach(() => {
    process.env.FMP_API_KEY = "test-key";
  });

  afterEach(() => {
    if (ORIGINAL_API_KEY === undefined) delete process.env.FMP_API_KEY;
    else process.env.FMP_API_KEY = ORIGINAL_API_KEY;
    vi.resetModules();
  });

  it("returns [] with an error when the API key is missing", async () => {
    delete process.env.FMP_API_KEY;
    const { fetchFmpScreener } = await import("./fmp-screening");
    const result = await fetchFmpScreener({});
    expect(result.candidates).toEqual([]);
    expect(result.errors).toContain("missing_api_key");
  });

  it("fans out one request per country in the region", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
      json: () =>
        Promise.resolve([
          {
            symbol: "AAPL",
            companyName: "Apple",
            marketCap: 3_000_000_000_000,
            sector: "Technology",
            industry: "Consumer Electronics",
            country: "US",
            exchangeShortName: "NASDAQ",
            price: 200,
            isActivelyTrading: true,
          },
          {
            symbol: "SHOP",
            companyName: "Shopify",
            marketCap: 100_000_000_000,
            sector: "Technology",
            industry: "Software",
            country: "CA",
            exchangeShortName: "NYSE",
            price: 80,
            isActivelyTrading: true,
          },
        ]),
    });
    const { fetchFmpScreener } = await import("./fmp-screening");
    const result = await fetchFmpScreener({
      regions: ["us_canada"],
      marketCapMin: 300_000_000,
      marketCapMax: 15_000_000_000,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2); // US + CA
    expect(result.requestCount).toBe(2);
    expect(result.candidates.map((c) => c.ticker)).toEqual(["AAPL", "SHOP"]);
    // The first request URL should include the marketCap filters and country
    const firstUrl = String(fetchImpl.mock.calls[0][0]);
    expect(firstUrl).toContain("marketCapMoreThan=300000000");
    expect(firstUrl).toContain("marketCapLowerThan=15000000000");
    expect(firstUrl).toMatch(/country=(US|CA)/);
  });

  it("filters by include / exclude sectors case-insensitively", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
      json: () =>
        Promise.resolve([
          {
            symbol: "AAPL",
            companyName: "Apple",
            marketCap: 3_000_000_000_000,
            sector: "Technology",
            industry: "Consumer Electronics",
            country: "US",
            exchangeShortName: "NASDAQ",
            price: 200,
          },
          {
            symbol: "KO",
            companyName: "Coca-Cola",
            marketCap: 200_000_000_000,
            sector: "Consumer Defensive",
            industry: "Beverages",
            country: "US",
            exchangeShortName: "NYSE",
            price: 60,
          },
        ]),
    });
    const { fetchFmpScreener } = await import("./fmp-screening");
    const result = await fetchFmpScreener({
      regions: ["us_canada"],
      includeSectors: ["consumer defensive"],
      excludeSectors: ["technology"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.candidates.map((c) => c.ticker)).toEqual(["KO"]);
  });

  it("records fmp errors and continues with the next country", async () => {
    let call = 0;
    const fetchImpl = vi.fn().mockImplementation(async () => {
      call++;
      if (call === 1) {
        return {
          ok: false,
          status: 429,
          text: () => Promise.resolve("rate limited"),
          json: () => Promise.resolve(null),
        };
      }
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(""),
        json: () =>
          Promise.resolve([
            {
              symbol: "SHOP",
              companyName: "Shopify",
              marketCap: 100_000_000_000,
              sector: "Technology",
              country: "CA",
              exchangeShortName: "NYSE",
              price: 80,
            },
          ]),
      };
    });
    const { fetchFmpScreener } = await import("./fmp-screening");
    const result = await fetchFmpScreener({
      regions: ["us_canada"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.candidates.map((c) => c.ticker)).toEqual(["SHOP"]);
  });
});

describe("marketCapRangeFromCondition", () => {
  it("parses '300 – 15,000M USD'", async () => {
    const { marketCapRangeFromCondition } = await import("./fmp-screening");
    expect(marketCapRangeFromCondition("300 – 15,000M USD")).toEqual({
      min: 300_000_000,
      max: 15_000_000_000,
    });
  });

  it("parses '> 5B'", async () => {
    const { marketCapRangeFromCondition } = await import("./fmp-screening");
    expect(marketCapRangeFromCondition("> 5B")).toEqual({
      min: 5_000_000_000,
      max: null,
    });
  });

  it("parses '<20B USD'", async () => {
    const { marketCapRangeFromCondition } = await import("./fmp-screening");
    expect(marketCapRangeFromCondition("<20B USD")).toEqual({
      min: null,
      max: 20_000_000_000,
    });
  });

  it("returns nulls for garbage", async () => {
    const { marketCapRangeFromCondition } = await import("./fmp-screening");
    expect(marketCapRangeFromCondition("")).toEqual({ min: null, max: null });
  });
});
