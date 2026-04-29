import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  checkAndIncrementRateLimit: vi.fn(),
  recordRateLimitUsage: vi.fn(),
  getDailyAiUsage: vi.fn(),
  getPlatformSetting: vi.fn(),
  setPlatformSetting: vi.fn(),
}));

vi.mock("@/lib/upstash", () => ({
  avRateLimiter: vi.fn().mockReturnValue(null),
  aiImportRateLimiter: vi.fn().mockReturnValue(null),
  signupRateLimiter: vi.fn().mockReturnValue(null),
  loginRateLimiter: vi.fn().mockReturnValue(null),
  deviceAuthRateLimiter: vi.fn().mockReturnValue(null),
}));

const {
  checkAndIncrementRateLimit,
  recordRateLimitUsage,
  getDailyAiUsage,
  getPlatformSetting,
  setPlatformSetting,
} = await import("@/lib/db");
const { avRateLimiter, aiImportRateLimiter } = await import("@/lib/upstash");

import {
  checkAvRateLimit,
  recordAvUsageAsync,
  checkAiRateLimit,
  checkAiImportRateLimit,
  checkSupportChatRateLimit,
  getRateLimitProvider,
  getClientIp,
  checkGlobalAiCap,
  incrementGlobalAiCalls,
} from "./rate-limit";
import { PLATFORM_LIMITS } from "./platform-config";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(avRateLimiter).mockReturnValue(null);
    vi.mocked(aiImportRateLimiter).mockReturnValue(null);
    vi.mocked(checkAndIncrementRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 14,
      resetAt: new Date(Date.now() + 60000).toISOString(),
    });
    vi.mocked(getDailyAiUsage).mockResolvedValue({
      aiCallsToday: 5,
      aiDailyResetAt: new Date().toISOString(),
    });
    vi.mocked(getPlatformSetting).mockResolvedValue("100|2025-03");
    vi.mocked(setPlatformSetting).mockResolvedValue(undefined);
  });

  describe("checkAvRateLimit", () => {
    it("when no Upstash limiter, falls back to Turso", async () => {
      vi.mocked(avRateLimiter).mockReturnValue(null);

      const result = await checkAvRateLimit("user-1");

      expect(checkAndIncrementRateLimit).toHaveBeenCalledWith(
        "user-1",
        "alphavantage",
        expect.any(Number),
        expect.any(String)
      );
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(14);
    });

    it("when Upstash limiter available, uses it", async () => {
      vi.mocked(avRateLimiter).mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 15,
          remaining: 14,
          reset: Date.now() + 60000,
        }),
      } as never);

      const result = await checkAvRateLimit("user-1");

      expect(checkAndIncrementRateLimit).not.toHaveBeenCalled();
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(15);
      expect(result.remaining).toBe(14);
    });
  });

  describe("recordAvUsageAsync", () => {
    it("does not call DB when count <= 0", async () => {
      await recordAvUsageAsync("user-1", 0);

      expect(recordRateLimitUsage).not.toHaveBeenCalled();
    });

    it("calls recordRateLimitUsage when count > 0", async () => {
      await recordAvUsageAsync("user-1", 3);

      expect(recordRateLimitUsage).toHaveBeenCalledWith(
        "user-1",
        "alphavantage",
        3,
        expect.any(String)
      );
    });
  });

  describe("checkAiRateLimit", () => {
    it("admin always allowed", async () => {
      const result = await checkAiRateLimit("user-1", "pro", "admin");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(getDailyAiUsage).not.toHaveBeenCalled();
    });

    it("non-pro allowed", async () => {
      const result = await checkAiRateLimit("user-1", "free");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(getDailyAiUsage).not.toHaveBeenCalled();
    });

    it("pro + under limit allowed", async () => {
      vi.mocked(getDailyAiUsage).mockResolvedValue({
        aiCallsToday: 10,
        aiDailyResetAt: new Date().toISOString(),
      });

      const result = await checkAiRateLimit("user-1", "pro");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(PLATFORM_LIMITS.AI_PRO_DAILY_LIMIT - 10);
    });

    it("pro + over limit blocked", async () => {
      vi.mocked(getDailyAiUsage).mockResolvedValue({
        aiCallsToday: PLATFORM_LIMITS.AI_PRO_DAILY_LIMIT,
        aiDailyResetAt: new Date().toISOString(),
      });

      const result = await checkAiRateLimit("user-1", "pro");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("checkAiImportRateLimit", () => {
    it("Turso fallback when no Upstash", async () => {
      vi.mocked(aiImportRateLimiter).mockReturnValue(null);

      const result = await checkAiImportRateLimit("user-1");

      expect(checkAndIncrementRateLimit).toHaveBeenCalledWith(
        "user-1",
        "openai_import",
        expect.any(Number),
        expect.any(String)
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("checkSupportChatRateLimit", () => {
    it("calls Turso checkAndIncrementRateLimit", async () => {
      await checkSupportChatRateLimit("user-1", "pro");

      expect(checkAndIncrementRateLimit).toHaveBeenCalledWith(
        "user-1",
        "support_chat",
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe("getRateLimitProvider", () => {
    it("maps known strings", () => {
      expect(getRateLimitProvider("alphavantage")).toBe("alphavantage");
      expect(getRateLimitProvider("openai")).toBe("openai");
      expect(getRateLimitProvider("openai_import")).toBe("openai_import");
      expect(getRateLimitProvider("support_chat")).toBe("support_chat");
    });

    it("returns null for unknown", () => {
      expect(getRateLimitProvider("unknown")).toBeNull();
      expect(getRateLimitProvider("")).toBeNull();
    });
  });

  describe("getClientIp", () => {
    it("from x-forwarded-for", () => {
      const req = {
        headers: new Headers({
          "x-forwarded-for": " 192.168.1.1, 10.0.0.1 ",
        }),
      } as never;
      expect(getClientIp(req)).toBe("192.168.1.1");
    });

    it("from x-real-ip when no x-forwarded-for", () => {
      const req = {
        headers: new Headers({ "x-real-ip": "10.0.0.2" }),
      } as never;
      expect(getClientIp(req)).toBe("10.0.0.2");
    });

    it("returns unknown when no headers", () => {
      const req = { headers: new Headers() } as never;
      expect(getClientIp(req)).toBe("unknown");
    });
  });

  describe("checkGlobalAiCap", () => {
    it("admin bypasses", async () => {
      const result = await checkGlobalAiCap("admin");

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(0);
      expect(result.cap).toBe(Infinity);
      expect(getPlatformSetting).not.toHaveBeenCalled();
    });

    it("under cap allowed", async () => {
      const monthKey = new Date().toISOString().slice(0, 7);
      vi.mocked(getPlatformSetting).mockResolvedValue(`100|${monthKey}`);

      const result = await checkGlobalAiCap();

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(100);
    });

    it("over cap blocked", async () => {
      const monthKey = new Date().toISOString().slice(0, 7);
      vi.mocked(getPlatformSetting).mockResolvedValue(`50000001|${monthKey}`);

      const result = await checkGlobalAiCap();

      expect(result.allowed).toBe(false);
      expect(result.used).toBe(50000001);
    });
  });

  describe("incrementGlobalAiCalls", () => {
    it("gets + sets platform setting", async () => {
      const monthKey = new Date().toISOString().slice(0, 7);
      vi.mocked(getPlatformSetting).mockResolvedValue(`50|${monthKey}`);

      await incrementGlobalAiCalls();

      expect(getPlatformSetting).toHaveBeenCalled();
      expect(setPlatformSetting).toHaveBeenCalledWith(
        "openai_monthly_calls",
        `51|${monthKey}`
      );
    });
  });
});
