import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockClient = { execute: mockExecute };
  return { mockExecute, mockClient };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

import {
  checkAndIncrementFeatureQuota,
  getFeatureQuotaUsage,
  getAllFeatureQuotas,
  refundFeatureQuota,
  currentWindowKey,
  isoWeekWindowKey,
  nextResetAt,
} from "./feature-quotas";
import { FEATURE_QUOTAS } from "./platform-config";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("feature-quotas", () => {
  const USER_ID = "user-1";

  describe("week window", () => {
    it("builds an ISO week key YYYY-Www", () => {
      // 2026-08-09 is a Sunday → ISO week 32 of 2026
      const key = isoWeekWindowKey(new Date("2026-08-09T12:00:00.000Z"));
      expect(key).toBe("2026-W32");
      expect(currentWindowKey("week", new Date("2026-08-09T12:00:00.000Z"))).toBe(key);
    });

    it("resets at next Monday 00:00 UTC", () => {
      const reset = nextResetAt("week", new Date("2026-08-09T12:00:00.000Z"));
      expect(reset).toBe("2026-08-10T00:00:00.000Z");
    });

    it("blocks Free investment_screening (quota 0)", async () => {
      const windowKey = currentWindowKey("month");
      mockExecute.mockResolvedValueOnce({
        rows: [{ call_count: 0, window_start: windowKey }],
      });

      const result = await checkAndIncrementFeatureQuota(
        USER_ID,
        "investment_screening",
        "free",
      );

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(FEATURE_QUOTAS.investment_screening.window).toBe("month");
      expect(FEATURE_QUOTAS.investment_screening.wealth).toBe(12);
    });
  });

  describe("getFeatureQuotaUsage", () => {
    it("returns 0 used when no row exists", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const usage = await getFeatureQuotaUsage(USER_ID, "fundamentals", "free");

      expect(usage.used).toBe(0);
      expect(usage.limit).toBe(FEATURE_QUOTAS.fundamentals.free);
      expect(usage.remaining).toBe(FEATURE_QUOTAS.fundamentals.free);
    });

    it("returns 0 used when row is from a different window", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{ call_count: 12, window_start: "1999-01" }],
      });

      const usage = await getFeatureQuotaUsage(USER_ID, "fundamentals", "free");

      expect(usage.used).toBe(0);
    });

    it("returns the stored count when window matches", async () => {
      const windowKey = currentWindowKey("month");
      mockExecute.mockResolvedValueOnce({
        rows: [{ call_count: 5, window_start: windowKey }],
      });

      const usage = await getFeatureQuotaUsage(USER_ID, "fundamentals", "free");

      expect(usage.used).toBe(5);
      expect(usage.remaining).toBe(FEATURE_QUOTAS.fundamentals.free - 5);
    });
  });

  describe("getAllFeatureQuotas", () => {
    it("loads all quota features in a single query", async () => {
      const windowKey = currentWindowKey("month");
      mockExecute.mockResolvedValueOnce({
        rows: [
          { provider: "quota:fundamentals", call_count: 5, window_start: windowKey },
          { provider: "quota:screener", call_count: 2, window_start: windowKey },
        ],
      });

      const quotas = await getAllFeatureQuotas(USER_ID, "free");

      expect(Object.keys(quotas)).toHaveLength(Object.keys(FEATURE_QUOTAS).length);
      expect(quotas.fundamentals.used).toBe(5);
      expect(quotas.screener.used).toBe(2);
      expect(quotas.intelligence.used).toBe(0);
      expect(mockExecute).toHaveBeenCalledTimes(1);
      const sql = mockExecute.mock.calls[0][0].sql as string;
      expect(sql).toContain("provider IN");
    });
  });

  describe("checkAndIncrementFeatureQuota", () => {
    it("inserts a new row when none exists", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // INSERT

      const result = await checkAndIncrementFeatureQuota(USER_ID, "intelligence", "free");

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(1);
      expect(result.limit).toBe(FEATURE_QUOTAS.intelligence.free);
      expect(mockExecute).toHaveBeenCalledTimes(2);
      const insertCall = mockExecute.mock.calls[1][0];
      expect(insertCall.sql).toContain("INSERT INTO rate_limits");
    });

    it("denies when usage equals the limit", async () => {
      const windowKey = currentWindowKey("month");
      mockExecute.mockResolvedValueOnce({
        rows: [{ call_count: FEATURE_QUOTAS.intelligence.free, window_start: windowKey }],
      });

      const result = await checkAndIncrementFeatureQuota(USER_ID, "intelligence", "free");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("uses the higher pro limit for pro plan", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await checkAndIncrementFeatureQuota(USER_ID, "intelligence", "pro");

      expect(result.limit).toBe(FEATURE_QUOTAS.intelligence.pro);
      expect(result.allowed).toBe(true);
    });

    it("resets the counter when the stored window differs", async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [{ call_count: 999, window_start: "1999-01" }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await checkAndIncrementFeatureQuota(USER_ID, "screener", "free");

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(1);
      const updateCall = mockExecute.mock.calls[1][0];
      expect(updateCall.sql).toContain("UPDATE rate_limits SET call_count = 1");
    });
  });

  describe("refundFeatureQuota", () => {
    it("decrements the counter by 1 when above zero", async () => {
      const windowKey = currentWindowKey("month");
      mockExecute
        .mockResolvedValueOnce({
          rows: [{ call_count: 3, window_start: windowKey }],
        })
        .mockResolvedValueOnce({ rows: [] });

      await refundFeatureQuota(USER_ID, "fundamentals");

      expect(mockExecute).toHaveBeenCalledTimes(2);
      const updateCall = mockExecute.mock.calls[1][0];
      expect(updateCall.args[0]).toBe(2);
    });

    it("is a no-op when no row exists", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await refundFeatureQuota(USER_ID, "fundamentals");

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when counter is already zero", async () => {
      const windowKey = currentWindowKey("month");
      mockExecute.mockResolvedValueOnce({
        rows: [{ call_count: 0, window_start: windowKey }],
      });

      await refundFeatureQuota(USER_ID, "fundamentals");

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });
});
