import { describe, it, expect, vi, beforeEach } from "vitest";
import { webcrypto } from "crypto";

vi.stubGlobal("crypto", webcrypto);

const {
  mockSend,
  mockGetGlobalResendApiKey,
  mockCheckAndIncrementRateLimit,
  mockFindUserByEmail,
  mockGetUserSettings,
} = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetGlobalResendApiKey: vi.fn(),
  mockCheckAndIncrementRateLimit: vi.fn(),
  mockFindUserByEmail: vi.fn(),
  mockGetUserSettings: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

vi.mock("@/lib/email-flows/toggles", () => ({
  isEmailNodeEnabled: vi.fn().mockResolvedValue(true),
  setEmailNodeEnabled: vi.fn(),
  getEmailNodeEnabledMap: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    getGlobalResendApiKey: mockGetGlobalResendApiKey,
    checkAndIncrementRateLimit: mockCheckAndIncrementRateLimit,
    // Marketing emails (welcome / upgrades) look up the recipient when userId
    // is omitted — never hit the real DB from this unit suite.
    findUserByEmail: mockFindUserByEmail,
    getUserSettings: mockGetUserSettings,
  };
});

import {
  isTreefolioTestEmail,
  isTestVerificationToken,
  createVerificationToken,
  verifyVerificationToken,
  createAccountDeletionToken,
  verifyAccountDeletionToken,
  sendAccountDeletionEmail,
  canSendAccountDeletionEmail,
  sendVerificationEmail,
  sendAlertEmail,
  sendPercentAlertEmail,
  sendWelcomeEmail,
  sendBifolioUpgradeEmail,
  sendTrefolioUpgradeEmail,
  getCodeOwnedEmailPreview,
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
    mockCheckAndIncrementRateLimit.mockReset();
    mockCheckAndIncrementRateLimit.mockResolvedValue({ allowed: true, remaining: 0, resetAt: "" });
    mockFindUserByEmail.mockReset();
    mockFindUserByEmail.mockResolvedValue(null);
    mockGetUserSettings.mockReset();
    mockGetUserSettings.mockResolvedValue({ emailNotificationsEnabled: true });
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

  describe("createAccountDeletionToken / verifyAccountDeletionToken", () => {
    it("round-trips { userId, email } for a real signed JWT", async () => {
      const token = await createAccountDeletionToken("user-del-1", "delete-me@example.com");
      expect(token.split(".")).toHaveLength(3);
      const result = await verifyAccountDeletionToken(token);
      expect(result).toEqual({ userId: "user-del-1", email: "delete-me@example.com" });
    });

    it("never returns a predictable constant for test/trefolio-test emails (no test short-circuit)", async () => {
      const token = await createAccountDeletionToken("user-del-2", "test+someone@trefolio.com");
      expect(token).not.toBe(TEST_VERIFICATION_TOKEN);
      expect(token.split(".")).toHaveLength(3);
      const result = await verifyAccountDeletionToken(token);
      expect(result).toEqual({ userId: "user-del-2", email: "test+someone@trefolio.com" });
    });

    it("rejects an invalid/malformed token", async () => {
      const result = await verifyAccountDeletionToken("not-a-jwt");
      expect(result).toBeNull();
    });

    it("rejects a tampered signature", async () => {
      const token = await createAccountDeletionToken("user-del-3", "tamper@example.com");
      const tampered = token.slice(0, -4) + "abcd";
      const result = await verifyAccountDeletionToken(tampered);
      expect(result).toBeNull();
    });

    it("rejects an expired token", async () => {
      vi.useFakeTimers();
      try {
        const token = await createAccountDeletionToken("user-del-4", "expired@example.com");
        vi.advanceTimersByTime(16 * 60 * 1000); // past the 15-minute TTL
        const result = await verifyAccountDeletionToken(token);
        expect(result).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it("purpose isolation: an email_verification token is rejected by verifyAccountDeletionToken", async () => {
      const verificationToken = await createVerificationToken("user-del-5", "cross-purpose@example.com");
      const result = await verifyAccountDeletionToken(verificationToken);
      expect(result).toBeNull();
    });

    it("purpose isolation: an account_deletion token is rejected by verifyVerificationToken", async () => {
      const deletionToken = await createAccountDeletionToken("user-del-6", "cross-purpose-2@example.com");
      const result = await verifyVerificationToken(deletionToken);
      expect(result).toBeNull();
    });
  });

  describe("sendAccountDeletionEmail", () => {
    it("returns success for test emails without calling Resend", async () => {
      const result = await sendAccountDeletionEmail("test+foo@trefolio.com", "some-token");
      expect(result).toMatchObject({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns success when sending succeeds", async () => {
      mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
      const result = await sendAccountDeletionEmail("user@real-domain.com", "token-123");
      expect(result).toMatchObject({ success: true });
      expect(mockSend).toHaveBeenCalled();
    });

    it("returns { success: false, error } when sending fails", async () => {
      mockSend.mockRejectedValue(new Error("Resend API error"));
      const result = await sendAccountDeletionEmail("user@real-domain.com", "token-123");
      expect(result).toEqual({ success: false, error: "Resend API error" });
    });
  });

  describe("canSendAccountDeletionEmail", () => {
    it("allows the first send and is backed by the shared Turso rate_limits table (not in-memory)", async () => {
      mockCheckAndIncrementRateLimit.mockResolvedValue({ allowed: true, remaining: 0, resetAt: "" });
      const result = await canSendAccountDeletionEmail("user-cooldown-1");
      expect(result).toBe(true);
      expect(mockCheckAndIncrementRateLimit).toHaveBeenCalledWith(
        "user-cooldown-1",
        "account_deletion_email",
        1,
        expect.any(String),
      );
    });

    it("blocks a resend within the cooldown window", async () => {
      mockCheckAndIncrementRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: "" });
      const result = await canSendAccountDeletionEmail("user-cooldown-2");
      expect(result).toBe(false);
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

    it("includes recent headlines and a disclaimer", async () => {
      mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
      await sendAlertEmail("user@real-domain.com", {
        ...alert,
        headlines: [
          { title: "Apple <beats> estimates", source: "Reuters", url: "https://example.com/aapl" },
        ],
      });
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain("Recent headlines");
      expect(html).toContain("https://example.com/aapl");
      expect(html).toContain("Apple &lt;beats&gt; estimates");
      expect(html).toContain("not investment advice");
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

    it("includes recent headlines and a disclaimer", async () => {
      mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
      await sendPercentAlertEmail("user@real-domain.com", {
        ...alert,
        headlines: [
          { title: "Microsoft <beats> estimates", source: "Reuters", url: "https://example.com/msft" },
        ],
      });
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain("Recent headlines");
      expect(html).toContain("https://example.com/msft");
      expect(html).toContain("Microsoft &lt;beats&gt; estimates");
      expect(html).toContain("not investment advice");
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

  describe("getCodeOwnedEmailPreview", () => {
    it("returns subject and HTML for signup confirmation", () => {
      const preview = getCodeOwnedEmailPreview("sendVerificationEmail", "en");
      expect(preview.subject.length).toBeGreaterThan(0);
      expect(preview.html).toContain("trefolio");
      expect(preview.html).toContain("PREVIEW");
    });
  });
});
