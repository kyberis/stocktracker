import { describe, it, expect, vi, beforeEach } from "vitest";
import { webcrypto } from "crypto";

vi.stubGlobal("crypto", webcrypto);

const { mockSend, mockGetGlobalResendApiKey } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetGlobalResendApiKey: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    getGlobalResendApiKey: mockGetGlobalResendApiKey,
  };
});

import {
  isTreefolioTestEmail,
  isTestVerificationToken,
  createVerificationToken,
  verifyVerificationToken,
  sendVerificationEmail,
  sendAlertEmail,
  sendPercentAlertEmail,
  sendWelcomeEmail,
  sendBifolioUpgradeEmail,
  sendTrefolioUpgradeEmail,
  TEST_VERIFICATION_TOKEN,
} from "./email";

describe("email", () => {
  beforeEach(() => {
    process.env.APP_SESSION_SECRET =
      "test-secret-for-email-tests-32chars-minimum";
    process.env.RESEND_API_KEY = "re_test_key";
    mockGetGlobalResendApiKey.mockResolvedValue("re_test_key");
    mockSend.mockClear();
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("isTreefolioTestEmail", () => {
    it("test+foo@trefolio.com returns true", () => {
      expect(isTreefolioTestEmail("test+foo@trefolio.com")).toBe(true);
    });

    it("normal@gmail.com returns false", () => {
      expect(isTreefolioTestEmail("normal@gmail.com")).toBe(false);
    });

    it("test+bar@TREFOLIO.COM returns true (case insensitive)", () => {
      expect(isTreefolioTestEmail("test+bar@TREFOLIO.COM")).toBe(true);
    });

    it("user@trefolio.com without test+ prefix returns false", () => {
      expect(isTreefolioTestEmail("user@trefolio.com")).toBe(false);
    });
  });

  describe("isTestVerificationToken", () => {
    it("TEST token returns true", () => {
      expect(isTestVerificationToken(TEST_VERIFICATION_TOKEN)).toBe(true);
    });

    it("other token returns false", () => {
      expect(isTestVerificationToken("other-token")).toBe(false);
      expect(isTestVerificationToken("")).toBe(false);
    });
  });

  describe("createVerificationToken", () => {
    it("returns test token for test email", async () => {
      const token = await createVerificationToken(
        "user-123",
        "test+foo@trefolio.com"
      );
      expect(token).toBe(TEST_VERIFICATION_TOKEN);
    });

    it("returns JWT for real email", async () => {
      const token = await createVerificationToken(
        "user-456",
        "real@example.com"
      );
      expect(token).not.toBe(TEST_VERIFICATION_TOKEN);
      expect(token.split(".")).toHaveLength(3);
    });
  });

  describe("verifyVerificationToken", () => {
    it("valid token returns { userId, email }", async () => {
      const token = await createVerificationToken(
        "user-789",
        "verify@example.com"
      );
      const result = await verifyVerificationToken(token);
      expect(result).toEqual({
        userId: "user-789",
        email: "verify@example.com",
      });
    });

    it("invalid token returns null", async () => {
      const result = await verifyVerificationToken("invalid-jwt-token");
      expect(result).toBeNull();
    });

    it("test token returns null (not a valid JWT)", async () => {
      const result = await verifyVerificationToken(TEST_VERIFICATION_TOKEN);
      expect(result).toBeNull();
    });
  });

  describe("getResendClient fallback (no API key)", () => {
    beforeEach(() => {
      mockGetGlobalResendApiKey.mockResolvedValue(null);
      delete process.env.RESEND_API_KEY;
    });

    it("sendVerificationEmail returns success without sending when no API key", async () => {
      const result = await sendVerificationEmail(
        "user@real-domain.com",
        "some-token"
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("sendVerificationEmail", () => {
    it("returns success for test emails (test+foo@trefolio.com)", async () => {
      const result = await sendVerificationEmail(
        "test+foo@trefolio.com",
        "token-123"
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns success for test emails (user@test.example.com)", async () => {
      const result = await sendVerificationEmail(
        "user@test.example.com",
        "token-123"
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns success when sending succeeds", async () => {
      mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
      const result = await sendVerificationEmail(
        "user@real-domain.com",
        "token-123"
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).toHaveBeenCalled();
    });

    it("returns { success: false, error } when sending fails", async () => {
      mockSend.mockRejectedValue(new Error("Resend API error"));
      const result = await sendVerificationEmail(
        "user@real-domain.com",
        "token-123"
      );
      expect(result).toEqual({ success: false, error: "Resend API error" });
    });
  });

  describe("sendAlertEmail", () => {
    const alert = {
      ticker: "AAPL",
      name: "Apple Inc",
      condition: "above" as const,
      threshold: 150,
      currentPrice: 155,
      currency: "USD",
    };

    it("returns success for test emails", async () => {
      const result = await sendAlertEmail("test+foo@trefolio.com", alert);
      expect(result).toMatchObject({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns success when sending succeeds", async () => {
      mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
      const result = await sendAlertEmail("user@real-domain.com", alert);
      expect(result).toMatchObject({ success: true });
      expect(mockSend).toHaveBeenCalled();
    });

    it("returns { success: false, error } when sending fails", async () => {
      mockSend.mockRejectedValue(new Error("Alert email failed"));
      const result = await sendAlertEmail("user@real-domain.com", alert);
      expect(result).toEqual({ success: false, error: "Alert email failed" });
    });
  });

  describe("sendPercentAlertEmail", () => {
    const alert = {
      ticker: "MSFT",
      name: "Microsoft",
      currentPrice: 420,
      currency: "USD",
      percentChange: 5.5,
      percentBasis: "daily" as const,
      isPortfolioWide: false,
    };

    it("returns success for test emails", async () => {
      const result = await sendPercentAlertEmail(
        "user@test.example.com",
        alert
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns success when sending succeeds", async () => {
      mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
      const result = await sendPercentAlertEmail(
        "user@real-domain.com",
        alert
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).toHaveBeenCalled();
    });

    it("returns { success: false, error } when sending fails", async () => {
      mockSend.mockRejectedValue(new Error("Percent alert failed"));
      const result = await sendPercentAlertEmail(
        "user@real-domain.com",
        alert
      );
      expect(result).toEqual({ success: false, error: "Percent alert failed" });
    });
  });

  describe("sendWelcomeEmail", () => {
    it("returns success for test emails", async () => {
      const result = await sendWelcomeEmail(
        "test+foo@trefolio.com",
        "Alice",
        "en"
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns success when sending succeeds", async () => {
      mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
      const result = await sendWelcomeEmail(
        "user@real-domain.com",
        "Bob",
        "en"
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).toHaveBeenCalled();
    });

    it("returns { success: false, error } when sending fails", async () => {
      mockSend.mockRejectedValue(new Error("Welcome email failed"));
      const result = await sendWelcomeEmail(
        "user@real-domain.com",
        "Bob",
        "en"
      );
      expect(result).toEqual({ success: false, error: "Welcome email failed" });
    });
  });

  describe("sendBifolioUpgradeEmail", () => {
    it("returns success for test emails", async () => {
      const result = await sendBifolioUpgradeEmail(
        "test+foo@trefolio.com",
        "Alice",
        "en"
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns success when sending succeeds", async () => {
      mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
      const result = await sendBifolioUpgradeEmail(
        "user@real-domain.com",
        "Bob",
        "en"
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).toHaveBeenCalled();
    });

    it("returns { success: false, error } when sending fails", async () => {
      mockSend.mockRejectedValue(new Error("Bifolio upgrade failed"));
      const result = await sendBifolioUpgradeEmail(
        "user@real-domain.com",
        "Bob",
        "en"
      );
      expect(result).toEqual({
        success: false,
        error: "Bifolio upgrade failed",
      });
    });
  });

  describe("sendTrefolioUpgradeEmail", () => {
    it("returns success for test emails", async () => {
      const result = await sendTrefolioUpgradeEmail(
        "test+foo@trefolio.com",
        "Alice",
        "en"
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns success when sending succeeds", async () => {
      mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
      const result = await sendTrefolioUpgradeEmail(
        "user@real-domain.com",
        "Bob",
        "en"
      );
      expect(result).toMatchObject({ success: true });
      expect(mockSend).toHaveBeenCalled();
    });

    it("returns { success: false, error } when sending fails", async () => {
      mockSend.mockRejectedValue(new Error("Trefolio upgrade failed"));
      const result = await sendTrefolioUpgradeEmail(
        "user@real-domain.com",
        "Bob",
        "en"
      );
      expect(result).toEqual({
        success: false,
        error: "Trefolio upgrade failed",
      });
    });
  });
});
