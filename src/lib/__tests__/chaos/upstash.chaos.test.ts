import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("Upstash Redis chaos", () => {
  describe("not configured (env vars missing)", () => {
    it("getRedisClient returns null", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      vi.resetModules();
      const { getRedisClient } = await import("@/lib/upstash");
      expect(getRedisClient()).toBeNull();
    });

    it("avRateLimiter returns null", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      vi.resetModules();
      const { avRateLimiter } = await import("@/lib/upstash");
      expect(avRateLimiter()).toBeNull();
    });

    it("aiImportRateLimiter returns null", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      vi.resetModules();
      const { aiImportRateLimiter } = await import("@/lib/upstash");
      expect(aiImportRateLimiter()).toBeNull();
    });

    it("signupRateLimiter returns null", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      vi.resetModules();
      const { signupRateLimiter } = await import("@/lib/upstash");
      expect(signupRateLimiter()).toBeNull();
    });

    it("loginRateLimiter returns null", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      vi.resetModules();
      const { loginRateLimiter } = await import("@/lib/upstash");
      expect(loginRateLimiter()).toBeNull();
    });

    it("deviceAuthRateLimiter returns null", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      vi.resetModules();
      const { deviceAuthRateLimiter } = await import("@/lib/upstash");
      expect(deviceAuthRateLimiter()).toBeNull();
    });
  });

  describe("Turso fallback in rate-limit.ts", () => {
    it("checkAvRateLimit falls back to Turso when limiter is null", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      vi.resetModules();

      vi.doMock("@/lib/upstash", () => ({
        avRateLimiter: () => null,
        aiImportRateLimiter: () => null,
        signupRateLimiter: () => null,
        loginRateLimiter: () => null,
        deviceAuthRateLimiter: () => null,
      }));

      vi.doMock("@/lib/db", () => ({
        checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
          allowed: true,
          remaining: 9,
          resetAt: "2026-01-01T00:01:00Z",
        }),
        recordRateLimitUsage: vi.fn().mockResolvedValue(undefined),
        getDailyAiUsage: vi.fn().mockResolvedValue({ aiCallsToday: 0, aiDailyResetAt: "" }),
        getPlatformSetting: vi.fn().mockResolvedValue(""),
        setPlatformSetting: vi.fn().mockResolvedValue(undefined),
      }));

      const { checkAvRateLimit } = await import("@/lib/rate-limit");
      const result = await checkAvRateLimit("user-1");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("checkSignupRateLimit falls back to Turso when limiter is null", async () => {
      vi.resetModules();

      vi.doMock("@/lib/upstash", () => ({
        avRateLimiter: () => null,
        aiImportRateLimiter: () => null,
        signupRateLimiter: () => null,
        loginRateLimiter: () => null,
        deviceAuthRateLimiter: () => null,
      }));

      vi.doMock("@/lib/db", () => ({
        checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
          allowed: true,
          remaining: 4,
          resetAt: "2026-01-01T01:00:00Z",
        }),
        recordRateLimitUsage: vi.fn(),
        getDailyAiUsage: vi.fn().mockResolvedValue({ aiCallsToday: 0, aiDailyResetAt: "" }),
        getPlatformSetting: vi.fn().mockResolvedValue(""),
        setPlatformSetting: vi.fn(),
      }));

      const { checkSignupRateLimit } = await import("@/lib/rate-limit");
      const result = await checkSignupRateLimit("192.168.1.1");

      expect(result.allowed).toBe(true);
    });

    it("checkLoginRateLimit falls back to Turso when limiter is null", async () => {
      vi.resetModules();

      vi.doMock("@/lib/upstash", () => ({
        avRateLimiter: () => null,
        aiImportRateLimiter: () => null,
        signupRateLimiter: () => null,
        loginRateLimiter: () => null,
        deviceAuthRateLimiter: () => null,
      }));

      vi.doMock("@/lib/db", () => ({
        checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetAt: "2026-01-01T00:15:00Z",
        }),
        recordRateLimitUsage: vi.fn(),
        getDailyAiUsage: vi.fn().mockResolvedValue({ aiCallsToday: 0, aiDailyResetAt: "" }),
        getPlatformSetting: vi.fn().mockResolvedValue(""),
        setPlatformSetting: vi.fn(),
      }));

      const { checkLoginRateLimit } = await import("@/lib/rate-limit");
      const result = await checkLoginRateLimit("10.0.0.1");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("checkDeviceAuthRateLimit falls back to Turso when limiter is null", async () => {
      vi.resetModules();

      vi.doMock("@/lib/upstash", () => ({
        avRateLimiter: () => null,
        aiImportRateLimiter: () => null,
        signupRateLimiter: () => null,
        loginRateLimiter: () => null,
        deviceAuthRateLimiter: () => null,
      }));

      vi.doMock("@/lib/db", () => ({
        checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
          allowed: true,
          remaining: 99,
          resetAt: "2026-01-01T00:15:00Z",
        }),
        recordRateLimitUsage: vi.fn(),
        getDailyAiUsage: vi.fn().mockResolvedValue({ aiCallsToday: 0, aiDailyResetAt: "" }),
        getPlatformSetting: vi.fn().mockResolvedValue(""),
        setPlatformSetting: vi.fn(),
      }));

      const { checkDeviceAuthRateLimit } = await import("@/lib/rate-limit");
      const result = await checkDeviceAuthRateLimit("172.16.0.1");

      expect(result.allowed).toBe(true);
    });
  });

  describe("rate limiter error propagation", () => {
    it("checkAvRateLimit propagates limiter.limit() rejection", async () => {
      vi.resetModules();

      const mockLimit = vi.fn().mockRejectedValue(new Error("Redis connection lost"));
      vi.doMock("@/lib/upstash", () => ({
        avRateLimiter: () => ({ limit: mockLimit }),
        aiImportRateLimiter: () => null,
        signupRateLimiter: () => null,
        loginRateLimiter: () => null,
        deviceAuthRateLimiter: () => null,
      }));

      vi.doMock("@/lib/db", () => ({
        checkAndIncrementRateLimit: vi.fn(),
        recordRateLimitUsage: vi.fn(),
        getDailyAiUsage: vi.fn(),
        getPlatformSetting: vi.fn().mockResolvedValue(""),
        setPlatformSetting: vi.fn(),
      }));

      const { checkAvRateLimit } = await import("@/lib/rate-limit");

      await expect(checkAvRateLimit("user-1")).rejects.toThrow(
        "Redis connection lost",
      );
    });

    it("checkAiImportRateLimit propagates limiter.limit() rejection", async () => {
      vi.resetModules();

      const mockLimit = vi.fn().mockRejectedValue(new Error("Redis timeout"));
      vi.doMock("@/lib/upstash", () => ({
        avRateLimiter: () => null,
        aiImportRateLimiter: () => ({ limit: mockLimit }),
        signupRateLimiter: () => null,
        loginRateLimiter: () => null,
        deviceAuthRateLimiter: () => null,
      }));

      vi.doMock("@/lib/db", () => ({
        checkAndIncrementRateLimit: vi.fn(),
        recordRateLimitUsage: vi.fn(),
        getDailyAiUsage: vi.fn(),
        getPlatformSetting: vi.fn().mockResolvedValue(""),
        setPlatformSetting: vi.fn(),
      }));

      const { checkAiImportRateLimit } = await import("@/lib/rate-limit");

      await expect(checkAiImportRateLimit("user-2")).rejects.toThrow(
        "Redis timeout",
      );
    });
  });

  describe("global AI cap", () => {
    it("allows when no usage recorded", async () => {
      vi.resetModules();

      vi.doMock("@/lib/upstash", () => ({
        avRateLimiter: () => null,
        aiImportRateLimiter: () => null,
        signupRateLimiter: () => null,
        loginRateLimiter: () => null,
        deviceAuthRateLimiter: () => null,
      }));

      vi.doMock("@/lib/db", () => ({
        checkAndIncrementRateLimit: vi.fn(),
        recordRateLimitUsage: vi.fn(),
        getDailyAiUsage: vi.fn(),
        getPlatformSetting: vi.fn().mockResolvedValue(""),
        setPlatformSetting: vi.fn(),
      }));

      const { checkGlobalAiCap } = await import("@/lib/rate-limit");
      const result = await checkGlobalAiCap();
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(0);
    });
  });
});
