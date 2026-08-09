import { beforeEach, describe, expect, it, vi } from "vitest";

describe("fetchFmpFundamentals", () => {
  beforeEach(() => {
    process.env.FMP_API_KEY = "test-key";
  });

  it("returns missing_api_key errors when unset", async () => {
    delete process.env.FMP_API_KEY;
    const { fetchFmpFundamentals } = await import("./fmp-fundamentals");
    const res = await fetchFmpFundamentals("AAPL", {
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });
    expect(res.fwdPe).toBeNull();
    expect(res.errors.some((e) => e.includes("missing_api_key"))).toBe(true);
  });

  it("parses stable-API ratios + profile into card metrics", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("ratios-ttm")) {
        return {
          ok: true,
          json: async () => [
            {
              priceToEarningsRatioTTM: 28.5,
              netDebtToEBITDATTM: -0.5,
              dividendYieldTTM: 0.0055,
            },
          ],
        };
      }
      if (u.includes("/ratios?")) {
        return {
          ok: true,
          json: async () => [
            { priceToEarningsRatio: 22 },
            { priceToEarningsRatio: 20 },
            { priceToEarningsRatio: 18 },
            { priceToEarningsRatio: 16 },
            { priceToEarningsRatio: 24 },
          ],
        };
      }
      if (u.includes("key-metrics-ttm")) {
        return {
          ok: true,
          json: async () => [
            {
              evToEBITDATTM: 18.2,
              netDebtToEBITDATTM: -0.5,
            },
          ],
        };
      }
      if (u.includes("price-target-consensus")) {
        return {
          ok: true,
          json: async () => [
            {
              targetConsensus: 240,
              targetMedian: 235,
            },
          ],
        };
      }
      if (u.includes("financial-growth")) {
        return {
          ok: true,
          json: async () => [
            { revenueGrowth: 0.064 },
            { revenueGrowth: 0.08 },
            { revenueGrowth: 0.11 },
            { revenueGrowth: -0.03 },
            { revenueGrowth: 0.05 },
          ],
        };
      }
      if (u.includes("cash-flow-statement")) {
        return {
          ok: true,
          json: async () => [
            {
              calendarYear: 2024,
              operatingCashFlow: 110e9,
              freeCashFlow: 100e9,
            },
            {
              calendarYear: 2023,
              operatingCashFlow: 100e9,
              freeCashFlow: 90e9,
            },
          ],
        };
      }
      if (u.includes("key-metrics") && !u.includes("key-metrics-ttm")) {
        return {
          ok: true,
          json: async () => [
            { calendarYear: 2024, roic: 0.45 },
            { calendarYear: 2023, roic: 0.42 },
          ],
        };
      }
      if (u.includes("income-statement-ttm")) {
        return {
          ok: true,
          json: async () => [
            {
              eps: 6.5,
              epsDiluted: 6.4,
              netIncome: 100e9,
              revenue: 400e9,
            },
          ],
        };
      }
      if (u.includes("income-statement")) {
        return {
          ok: true,
          json: async () => [
            {
              calendarYear: 2024,
              eps: 6.2,
              epsDiluted: 6.1,
              netIncome: 95e9,
              revenue: 390e9,
              grossProfit: 170e9,
              operatingIncome: 120e9,
              weightedAverageShsOutDil: 15e9,
            },
            {
              calendarYear: 2023,
              eps: 5.8,
              epsDiluted: 5.7,
              netIncome: 90e9,
              revenue: 360e9,
              grossProfit: 160e9,
              operatingIncome: 110e9,
              weightedAverageShsOutDil: 15.5e9,
            },
          ],
        };
      }
      return {
        ok: true,
        json: async () => [
          {
            symbol: "AAPL",
            currency: "USD",
            price: 200,
            mktCap: 3e12,
            averageVolume: 50_000_000,
            description: "Consumer electronics company.",
          },
        ],
      };
    });

    const { fetchFmpFundamentals, averageAnnualPe } = await import(
      "./fmp-fundamentals"
    );
    const res = await fetchFmpFundamentals("AAPL", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.ownHistPe).toBe(28.5);
    expect(res.histPeYears).toBe(5);
    expect(res.histPeAvg).toBeCloseTo(20, 5);
    expect(res.evEbitda).toBe(18.2);
    expect(res.netCash).toBe(true);
    expect(res.targetPrice).toBe(240);
    expect(res.revenueGrowthPct).toBeCloseTo(6.4, 5);
    expect(res.revenueGrowthHistoryPct).toHaveLength(5);
    expect(res.revenueGrowthHistoryPct[0]).toBeCloseTo(6.4, 5);
    expect(res.revenueGrowthHistoryPct[3]).toBeCloseTo(-3, 5);
    expect(res.currency).toBe("USD");
    expect(res.epsFy).toBe(6.1);
    expect(res.epsTtm).toBe(6.4);
    expect(res.normalizedPe).toBeCloseTo(200 / 6.1, 5);
    expect(res.earningsQualitySuspect).toBe(false);
    expect(res.annualSeries.length).toBeGreaterThanOrEqual(2);
    expect(res.annualSeries[0]?.year).toBe(2024);
    expect(res.annualSeries[0]?.freeCashFlow).toBe(100e9);
    expect(res.annualSeries[0]?.roicPct).toBeCloseTo(45, 5);
    expect(res.buyback).toBe(true);
    expect(res.severeDilution).toBe(false);
    expect(res.thinLiquidity).toBe(false);
    expect(res.fcfYield).toBeCloseTo(100e9 / 3e12, 5);
    expect(
      averageAnnualPe([{ priceToEarningsRatio: 10 }, { peRatio: -2 }]).histPeYears,
    ).toBe(1);
  });

  it("flags earnings quality when TTM EPS jumps vs FY", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("ratios-ttm")) {
        return {
          ok: true,
          json: async () => [
            {
              priceToEarningsRatioTTM: 8.8,
              netProfitMarginTTM: 22.05,
              netDebtToEBITDATTM: 3.35,
            },
          ],
        };
      }
      if (u.includes("key-metrics-ttm")) {
        return { ok: true, json: async () => [{ evToEBITDATTM: 13.72 }] };
      }
      if (u.includes("price-target-consensus")) {
        return { ok: true, json: async () => [{ targetConsensus: 60 }] };
      }
      if (u.includes("financial-growth")) {
        return {
          ok: true,
          json: async () => [{ revenueGrowth: 0.017 }],
        };
      }
      if (u.includes("income-statement-ttm")) {
        return {
          ok: true,
          json: async () => [
            { epsDiluted: 6.05, netIncome: 1.5e9, revenue: 6.8e9 },
          ],
        };
      }
      if (u.includes("income-statement")) {
        return {
          ok: true,
          json: async () => [
            { epsDiluted: 2.94, netIncome: 0.8e9, revenue: 6.9e9 },
          ],
        };
      }
      return {
        ok: true,
        json: async () => [
          { symbol: "MKC", currency: "USD", price: 52.92 },
        ],
      };
    });

    const { fetchFmpFundamentals } = await import("./fmp-fundamentals");
    const res = await fetchFmpFundamentals("MKC", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.earningsQualitySuspect).toBe(true);
    expect(res.normalizedPe).toBeCloseTo(18.0, 0);
    expect(res.ndEbitda).toBe(3.35);
  });

  it("still accepts legacy FMP field names", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("ratios-ttm")) {
        return {
          ok: true,
          json: async () => [
            {
              peRatioTTM: 28.5,
              forwardPE: 24.1,
              enterpriseValueOverEBITDATTM: 18.2,
              netDebtToEBITDATTM: -0.5,
              dividendYielPercentageTTM: 0.55,
            },
          ],
        };
      }
      if (u.includes("key-metrics-ttm")) {
        return { ok: true, json: async () => [{}] };
      }
      if (u.includes("price-target-consensus")) {
        return { ok: true, json: async () => [] };
      }
      if (u.includes("financial-growth")) {
        return { ok: true, json: async () => [] };
      }
      if (u.includes("income-statement")) {
        return { ok: true, json: async () => [] };
      }
      return {
        ok: true,
        json: async () => [
          {
            symbol: "AAPL",
            currency: "USD",
            price: 200,
            priceTarget: 240,
            description: "Consumer electronics company.",
          },
        ],
      };
    });

    const { fetchFmpFundamentals } = await import("./fmp-fundamentals");
    const res = await fetchFmpFundamentals("AAPL", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.fwdPe).toBe(24.1);
    expect(res.ownHistPe).toBe(28.5);
    expect(res.evEbitda).toBe(18.2);
    expect(res.targetPrice).toBe(240);
  });
});
