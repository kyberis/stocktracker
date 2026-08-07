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

  it("parses ratios + profile into card metrics", async () => {
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
    expect(res.evEbitda).toBe(18.2);
    expect(res.netCash).toBe(true);
    expect(res.targetPrice).toBe(240);
    expect(res.currency).toBe("USD");
  });
});
