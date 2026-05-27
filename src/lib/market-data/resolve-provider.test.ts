import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolvePremiumStockDataProvider,
  resolveFundamentalsProvider,
} from "./resolve-provider";

vi.mock("@/lib/api-providers/fmp-market-data", () => ({
  FmpMarketDataProvider: vi.fn().mockImplementation(() => ({
    name: "fmp",
    callCount: 2,
  })),
}));

vi.mock("@/lib/api-providers/yahoo", () => ({
  YahooProvider: vi.fn().mockImplementation(() => ({ name: "yahoo" })),
}));

vi.mock("@/lib/db", () => ({
  getGlobalFmpApiKey: vi.fn(),
  isFeatureEnabled: vi.fn(),
  isFeatureEnabledForUser: vi.fn(),
  hasPremiumMarketDataConfigured: vi.fn(),
}));

const { getGlobalFmpApiKey, isFeatureEnabled, isFeatureEnabledForUser } = await import("@/lib/db");
const { FmpMarketDataProvider } = await import("@/lib/api-providers/fmp-market-data");
const { YahooProvider } = await import("@/lib/api-providers/yahoo");

describe("resolve-provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGlobalFmpApiKey).mockReturnValue("fmp-key");
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
  });

  describe("resolvePremiumStockDataProvider", () => {
    it("returns FMP when key and flag are set", async () => {
      const resolved = await resolvePremiumStockDataProvider(null, "fundamentals");
      expect(resolved?.backend).toBe("fmp");
      expect(FmpMarketDataProvider).toHaveBeenCalledWith("fmp-key");
    });

    it("returns null without FMP key", async () => {
      vi.mocked(getGlobalFmpApiKey).mockReturnValue("");
      const resolved = await resolvePremiumStockDataProvider(null, "fundamentals");
      expect(resolved).toBeNull();
    });
  });

  describe("resolveFundamentalsProvider", () => {
    it("returns FMP when configured", async () => {
      const resolved = await resolveFundamentalsProvider("user-1");
      expect(resolved.backend).toBe("fmp");
      expect(FmpMarketDataProvider).toHaveBeenCalled();
    });

    it("falls back to Yahoo without FMP key", async () => {
      vi.mocked(getGlobalFmpApiKey).mockReturnValue("");
      const resolved = await resolveFundamentalsProvider(null);
      expect(resolved.backend).toBe("yahoo");
      expect(YahooProvider).toHaveBeenCalled();
    });
  });
});
