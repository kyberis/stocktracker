import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createProvider,
  getProviderFromRequest,
  getAlphaVantageFromRequest,
} from "./index";

vi.mock("./yahoo", () => ({
  YahooProvider: vi.fn().mockImplementation(() => ({ name: "yahoo" })),
}));

vi.mock("./alphavantage", () => ({
  AlphaVantageProvider: vi.fn().mockImplementation((_key: string) => ({
    name: "alphavantage",
  })),
}));

vi.mock("@/lib/db", () => ({
  getGlobalAlphaVantageApiKey: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionFromRequest: vi.fn(),
}));

const { YahooProvider } = await import("./yahoo");
const { AlphaVantageProvider } = await import("./alphavantage");
const { getGlobalAlphaVantageApiKey } = await import("@/lib/db");
const { getSessionFromRequest } = await import("@/lib/auth/session");

describe("api-providers index", () => {
  beforeEach(() => {
    vi.mocked(getGlobalAlphaVantageApiKey).mockReturnValue("av-key");
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);
  });

  describe("createProvider", () => {
    it('createProvider("yahoo") returns YahooProvider', () => {
      const provider = createProvider("yahoo");
      expect(provider).toEqual({ name: "yahoo" });
      expect(YahooProvider).toHaveBeenCalled();
    });

    it('createProvider("alphavantage", "key") returns AlphaVantageProvider', () => {
      const provider = createProvider("alphavantage", "key");
      expect(provider).toEqual({ name: "alphavantage" });
      expect(AlphaVantageProvider).toHaveBeenCalledWith("key");
    });

    it('createProvider("alphavantage") when AV constructor throws falls back to YahooProvider', () => {
      vi.mocked(AlphaVantageProvider).mockImplementationOnce(() => {
        throw new Error("AV init failed");
      });
      const provider = createProvider("alphavantage");
      expect(provider).toEqual({ name: "yahoo" });
      expect(YahooProvider).toHaveBeenCalled();
    });
  });

  describe("getProviderFromRequest", () => {
    it("returns YahooProvider", async () => {
      const req = {} as Request;
      const provider = await getProviderFromRequest(req as never);
      expect(provider).toEqual({ name: "yahoo" });
      expect(YahooProvider).toHaveBeenCalled();
    });
  });

  describe("getAlphaVantageFromRequest", () => {
    it("with pro session + key returns AV provider", async () => {
      vi.mocked(getSessionFromRequest).mockResolvedValue({
        userId: "u1",
        plan: "pro",
      } as never);
      vi.mocked(getGlobalAlphaVantageApiKey).mockReturnValue("av-key");

      const req = {} as Request;
      const provider = await getAlphaVantageFromRequest(req as never);

      expect(provider).toEqual({ name: "alphavantage" });
      expect(AlphaVantageProvider).toHaveBeenCalledWith("av-key");
    });

    it("with free session returns null", async () => {
      vi.mocked(getSessionFromRequest).mockResolvedValue({
        userId: "u1",
        plan: "free",
      } as never);

      const req = {} as Request;
      const provider = await getAlphaVantageFromRequest(req as never);

      expect(provider).toBeNull();
    });

    it("with no key returns null", async () => {
      vi.mocked(getSessionFromRequest).mockResolvedValue({
        userId: "u1",
        plan: "pro",
      } as never);
      vi.mocked(getGlobalAlphaVantageApiKey).mockReturnValue("");

      const req = {} as Request;
      const provider = await getAlphaVantageFromRequest(req as never);

      expect(provider).toBeNull();
    });
  });
});
