import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mockFetchResponse,
  mockFetchNetworkError,
} from "./_helpers";

vi.mock("@/lib/metrics", () => ({
  providerRequestsTotal: { inc: vi.fn() },
  providerRequestDuration: { startTimer: () => vi.fn() },
}));

const originalFetch = globalThis.fetch;

describe("Alpha Vantage chaos", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  describe("avFetchRaw (via AlphaVantageProvider)", () => {
    async function freshProvider() {
      vi.resetModules();
      const { AlphaVantageProvider } = await import(
        "@/lib/api-providers/alphavantage"
      );
      return new AlphaVantageProvider("test-key");
    }

    it("throws on rate limit (Information field)", async () => {
      mockFetchResponse(200, { Information: "API rate limit reached" });
      const provider = await freshProvider();

      await expect(provider.getQuote("AAPL")).rejects.toThrow(
        "Alpha Vantage rate limit reached",
      );
    });

    it("throws on HTTP 401", async () => {
      mockFetchResponse(401, {});
      const provider = await freshProvider();

      await expect(provider.getQuote("AAPL")).rejects.toThrow("401");
    });

    it("throws on Error Message in body", async () => {
      mockFetchResponse(200, {
        "Error Message": "Invalid API call. Try again.",
      });
      const provider = await freshProvider();

      await expect(provider.getQuote("AAPL")).rejects.toThrow(
        "Invalid API call. Try again.",
      );
    });

    it("throws on network failure", async () => {
      mockFetchNetworkError("Failed to fetch");
      const provider = await freshProvider();

      await expect(provider.getQuote("AAPL")).rejects.toThrow("Failed to fetch");
    });

    it("throws on HTTP 500", async () => {
      mockFetchResponse(500, { error: "internal" });
      const provider = await freshProvider();

      await expect(provider.getQuote("AAPL")).rejects.toThrow("500");
    });
  });

  describe("constructor validation", () => {
    it("throws when API key is empty", async () => {
      vi.resetModules();
      const { AlphaVantageProvider } = await import(
        "@/lib/api-providers/alphavantage"
      );
      expect(() => new AlphaVantageProvider("")).toThrow(
        "Alpha Vantage API key is required",
      );
    });
  });

  describe("createProvider fallback", () => {
    it("falls back to YahooProvider when AV constructor throws", async () => {
      vi.resetModules();
      const { createProvider } = await import("@/lib/api-providers/index");
      const provider = createProvider("alphavantage", "");
      expect(provider.name).toBe("yahoo");
    });

    it("creates AlphaVantageProvider when key is valid", async () => {
      vi.resetModules();
      const { createProvider } = await import("@/lib/api-providers/index");
      const provider = createProvider("alphavantage", "valid-key");
      expect(provider.name).toBe("alphavantage");
    });

    it("creates YahooProvider for yahoo name", async () => {
      vi.resetModules();
      const { createProvider } = await import("@/lib/api-providers/index");
      const provider = createProvider("yahoo");
      expect(provider.name).toBe("yahoo");
    });
  });
});
