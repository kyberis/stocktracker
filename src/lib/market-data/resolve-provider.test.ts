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

vi.mock("@/lib/api-providers/free-premium", () => ({
  FreePremiumProvider: vi.fn().mockImplementation(() => ({ name: "free", callCount: 1 })),
  isFreePremiumStackAvailable: vi.fn(() => true),
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
const { FreePremiumProvider } = await import("@/lib/api-providers/free-premium");

describe("resolve-provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGlobalFmpApiKey).mockReturnValue("");
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(false);
  });

  describe("resolvePremiumStockDataProvider", () => {
    it("returns free stack by default", async () => {
      const resolved = await resolvePremiumStockDataProvider(null, "fundamentals");
      expect(resolved?.backend).toBe("free");
      expect(FreePremiumProvider).toHaveBeenCalled();
    });

    it("returns FMP when key and flag are set", async () => {
      vi.mocked(getGlobalFmpApiKey).mockReturnValue("fmp-key");
      vi.mocked(isFeatureEnabled).mockResolvedValue(true);
      const resolved = await resolvePremiumStockDataProvider(null, "fundamentals");
      expect(resolved?.backend).toBe("fmp");
      expect(FmpMarketDataProvider).toHaveBeenCalledWith("fmp-key");
    });
  });

  describe("resolveFundamentalsProvider", () => {
    it("returns Yahoo without FMP", async () => {
      const resolved = await resolveFundamentalsProvider(null);
      expect(resolved.backend).toBe("yahoo");
      expect(YahooProvider).toHaveBeenCalled();
    });

    it("returns FMP when configured", async () => {
      vi.mocked(getGlobalFmpApiKey).mockReturnValue("fmp-key");
      vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
      const resolved = await resolveFundamentalsProvider("user-1");
      expect(resolved.backend).toBe("fmp");
      expect(FmpMarketDataProvider).toHaveBeenCalled();
    });
  });
});
