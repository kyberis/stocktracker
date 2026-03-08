import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

vi.mock("@/lib/db", () => ({
  getGlobalResendApiKey: vi.fn(),
}));

import { getGlobalResendApiKey } from "@/lib/db";
const mockedGetKey = vi.mocked(getGlobalResendApiKey);

describe("Resend chaos", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("sendVerificationEmail", () => {
    it("returns success (no-op) when no API key is configured", async () => {
      mockedGetKey.mockResolvedValueOnce("");
      delete process.env.RESEND_API_KEY;

      const { sendVerificationEmail } = await import("@/lib/email");
      const result = await sendVerificationEmail("user@test.com", "fake-token");

      expect(result).toEqual({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns success when send succeeds", async () => {
      mockedGetKey.mockResolvedValueOnce("re_test_key");
      mockSend.mockResolvedValueOnce({ id: "email-123" });

      const { sendVerificationEmail } = await import("@/lib/email");
      const result = await sendVerificationEmail("user@test.com", "fake-token");

      expect(result).toEqual({ success: true });
      expect(mockSend).toHaveBeenCalledOnce();
    });

    it("returns failure when send rejects", async () => {
      mockedGetKey.mockResolvedValueOnce("re_test_key");
      mockSend.mockRejectedValueOnce(new Error("Quota exceeded"));

      const { sendVerificationEmail } = await import("@/lib/email");
      const result = await sendVerificationEmail("user@test.com", "fake-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Quota exceeded");
    });

    it("returns failure on network error", async () => {
      mockedGetKey.mockResolvedValueOnce("re_test_key");
      mockSend.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      const { sendVerificationEmail } = await import("@/lib/email");
      const result = await sendVerificationEmail("user@test.com", "fake-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to fetch");
    });
  });

  describe("sendAlertEmail", () => {
    const alert = {
      ticker: "AAPL",
      name: "Apple Inc.",
      condition: "above",
      threshold: 200,
      currentPrice: 210,
      currency: "USD",
    };

    it("returns success (no-op) when no API key", async () => {
      mockedGetKey.mockResolvedValueOnce("");
      delete process.env.RESEND_API_KEY;

      const { sendAlertEmail } = await import("@/lib/email");
      const result = await sendAlertEmail("user@test.com", alert);

      expect(result).toEqual({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns failure when send rejects", async () => {
      mockedGetKey.mockResolvedValueOnce("re_test_key");
      mockSend.mockRejectedValueOnce(new Error("Rate limited by Resend"));

      const { sendAlertEmail } = await import("@/lib/email");
      const result = await sendAlertEmail("user@test.com", alert);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Rate limited by Resend");
    });

    it("returns success when send succeeds", async () => {
      mockedGetKey.mockResolvedValueOnce("re_test_key");
      mockSend.mockResolvedValueOnce({ id: "email-456" });

      const { sendAlertEmail } = await import("@/lib/email");
      const result = await sendAlertEmail("user@test.com", alert);

      expect(result).toEqual({ success: true });
    });
  });
});
