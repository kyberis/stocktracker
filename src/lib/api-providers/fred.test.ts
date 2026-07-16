import { describe, it, expect, vi, afterEach } from "vitest";
import { getFredEconomicIndicator } from "./fred";

describe("fred", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns null without API key", async () => {
    vi.stubEnv("FRED_API_KEY", "");
    const result = await getFredEconomicIndicator("CPI");
    expect(result).toBeNull();
  });

  it("maps CPI to FRED series", async () => {
    vi.stubEnv("FRED_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          observations: [
            { date: "2024-01-01", value: "300.1" },
            { date: "2023-12-01", value: "." },
          ],
        }),
      }),
    );

    const result = await getFredEconomicIndicator("CPI", "monthly");
    expect(result?.name).toBe("CPI");
    expect(result?.data).toEqual([
      { date: "2024-01-01", value: 300.1 },
      { date: "2023-12-01", value: null },
    ]);
    expect(fetch).toHaveBeenCalled();
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("series_id=CPIAUCSL");
  });

  it("maps treasury maturity", async () => {
    vi.stubEnv("FRED_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: "2024-01-02", value: "4.2" }] }),
      }),
    );

    const result = await getFredEconomicIndicator("TREASURY_YIELD", "daily", "10year");
    expect(result?.name).toBe("Treasury 10year");
    expect(result?.data[0]?.value).toBe(4.2);
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("series_id=DGS10");
  });
});
