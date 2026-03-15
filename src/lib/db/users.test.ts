import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbUser } from "./helpers";
import * as users from "./users";
import { trackEvent } from "./analytics";

const { mockExecute, mockBatch, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockBatch = vi.fn();
  const mockClient = { execute: mockExecute, batch: mockBatch };
  return { mockExecute, mockBatch, mockClient };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("./seed", () => ({
  seedHoldingsForUser: vi.fn().mockResolvedValue(0),
  seedCashForUser: vi.fn().mockResolvedValue(0),
  seedTransactionsForUser: vi.fn().mockResolvedValue(0),
}));

vi.mock("./portfolios", () => ({
  resolvePortfolioId: vi.fn().mockResolvedValue("default-portfolio"),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("user-uuid-123"),
  randomBytes: vi.fn().mockImplementation((size: number) =>
    size === 12 ? Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2]) : Buffer.alloc(size)
  ),
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue("hashed"),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const dbUserRow = {
  id: "u1",
  username: "test",
  password_hash: "hash",
  role: "user",
  must_change_password: 0,
  created_at: "2024-01-01",
  email: "t@t.com",
  display_name: "Test",
  avatar_url: "",
  plan: "free",
  stripe_customer_id: "",
  stripe_subscription_id: "",
  plan_expires_at: "",
  ai_calls_this_month: 0,
  ai_calls_reset_at: "2024-01-01",
  ai_calls_today: 0,
  ai_daily_reset_at: "2024-01-01",
  email_verified: 1,
  auth_provider: "credentials",
  google_id: "",
  apple_id: "",
  portfolio_review_count: 0,
  portfolio_review_reset_at: "",
  widget_token_hash: "",
  device_passkey_hash: "",
  device_template_id: "",
  device_linked_at: "",
  device_pro_redeemed_at: "",
  device_portfolio_id: "",
  last_active_at: "",
  tax_residency: "",
  onboarding_completed: 0,
};

describe("users", () => {
  describe("findUserByUsername", () => {
    it("returns DbUser when found", async () => {
      mockExecute.mockResolvedValue({ rows: [dbUserRow] });
      const result = await users.findUserByUsername("test");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE username = ?",
        args: ["test"],
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe("u1");
      expect(result?.username).toBe("test");
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.findUserByUsername("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("findUserByEmail", () => {
    it("returns DbUser when found", async () => {
      mockExecute.mockResolvedValue({ rows: [dbUserRow] });
      const result = await users.findUserByEmail("t@t.com");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE LOWER(email) = LOWER(?)",
        args: ["t@t.com"],
      });
      expect(result).not.toBeNull();
      expect(result?.email).toBe("t@t.com");
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.findUserByEmail("nope@nope.com");
      expect(result).toBeNull();
    });
  });

  describe("findUserById", () => {
    it("returns DbUser when found", async () => {
      mockExecute.mockResolvedValue({ rows: [dbUserRow] });
      const result = await users.findUserById("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE id = ?",
        args: ["u1"],
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe("u1");
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.findUserById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("listUsers", () => {
    it("returns PublicUser array ordered by created_at", async () => {
      mockExecute.mockResolvedValue({ rows: [dbUserRow] });
      const result = await users.listUsers();
      expect(mockExecute).toHaveBeenCalledWith("SELECT * FROM users ORDER BY created_at ASC");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "u1",
        username: "test",
        email: "t@t.com",
        displayName: "Test",
      });
    });
  });

  describe("createUser", () => {
    it("calls batch for inserts then findUserById, returns PublicUser", async () => {
      mockBatch.mockResolvedValue(undefined);
      mockExecute.mockResolvedValue({ rows: [dbUserRow] });

      const result = await users.createUser({
        username: "newuser",
        passwordHash: "hashed",
        seedWithData: false,
      });

      expect(mockBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sql: expect.stringContaining("INSERT INTO users"),
            args: expect.arrayContaining(["user-uuid-123", "newuser", "hashed"]),
          }),
          expect.objectContaining({
            sql: expect.stringContaining("INSERT INTO user_settings"),
            args: ["user-uuid-123"],
          }),
        ]),
        "write"
      );
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE id = ?",
        args: ["user-uuid-123"],
      });
      expect(result).toMatchObject({
        id: "u1",
        username: "test",
        email: "t@t.com",
      });
    });

    it("seeds holdings/cash/transactions when seedWithData is true", async () => {
      const { seedHoldingsForUser, seedCashForUser, seedTransactionsForUser } = await import("./seed");
      const { resolvePortfolioId } = await import("./portfolios");
      mockBatch.mockResolvedValue(undefined);
      mockExecute.mockResolvedValue({ rows: [dbUserRow] });

      await users.createUser({
        username: "newuser",
        passwordHash: "hashed",
        seedWithData: true,
      });

      expect(resolvePortfolioId).toHaveBeenCalledWith("user-uuid-123");
      expect(seedHoldingsForUser).toHaveBeenCalledWith(mockClient, "user-uuid-123", "default-portfolio");
      expect(seedCashForUser).toHaveBeenCalledWith(mockClient, "user-uuid-123", "default-portfolio");
      expect(seedTransactionsForUser).toHaveBeenCalledWith(mockClient, "user-uuid-123", "default-portfolio");
    });
  });

  describe("updateUserPassword", () => {
    it("updates password_hash and must_change_password", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.updateUserPassword("u1", "newhash", true);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?",
        args: ["newhash", 1, "u1"],
      });
    });

    it("sets must_change_password to 0 when false", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.updateUserPassword("u1", "newhash", false);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?",
        args: ["newhash", 0, "u1"],
      });
    });
  });

  describe("updateUserRole", () => {
    it("updates role", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.updateUserRole("u1", "admin");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET role = ? WHERE id = ?",
        args: ["admin", "u1"],
      });
    });
  });

  describe("deleteUser", () => {
    it("deletes user by id", async () => {
      mockExecute.mockResolvedValue({ rowsAffected: 1 });
      await users.deleteUser("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "DELETE FROM users WHERE id = ?",
        args: ["u1"],
      });
    });
  });

  describe("findUserByStripeCustomerId", () => {
    it("returns DbUser when found", async () => {
      mockExecute.mockResolvedValue({ rows: [{ ...dbUserRow, stripe_customer_id: "cus_123" }] });
      const result = await users.findUserByStripeCustomerId("cus_123");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE stripe_customer_id = ?",
        args: ["cus_123"],
      });
      expect(result).not.toBeNull();
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.findUserByStripeCustomerId("cus_none");
      expect(result).toBeNull();
    });
  });

  describe("getAiUsage", () => {
    it("returns usage when user exists and window is current", async () => {
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
      const row = { ...dbUserRow, ai_calls_this_month: 3, ai_calls_reset_at: currentMonth };
      mockExecute.mockResolvedValue({ rows: [row] });

      const result = await users.getAiUsage("u1");

      expect(result).toEqual({
        plan: "free",
        aiCallsThisMonth: 3,
        aiCallsResetAt: currentMonth,
      });
    });

    it("resets usage when month changed and returns 0", async () => {
      const oldMonth = "2024-01-01";
      const row = { ...dbUserRow, ai_calls_this_month: 5, ai_calls_reset_at: oldMonth };
      mockExecute
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await users.getAiUsage("u1");

      expect(result.plan).toBe("free");
      expect(result.aiCallsThisMonth).toBe(0);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET ai_calls_this_month = 0, ai_calls_reset_at = datetime('now') WHERE id = ?",
        args: ["u1"],
      });
    });

    it("returns defaults when user not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.getAiUsage("nonexistent");
      expect(result).toMatchObject({
        plan: "free",
        aiCallsThisMonth: 0,
      });
      expect(result.aiCallsResetAt).toBeDefined();
    });
  });

  describe("incrementAiUsage", () => {
    it("increments ai_calls_this_month and returns new count", async () => {
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
      const row = { ...dbUserRow, ai_calls_this_month: 2, ai_calls_reset_at: currentMonth };
      mockExecute
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await users.incrementAiUsage("u1");

      expect(result).toBe(3);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET ai_calls_this_month = ? WHERE id = ?",
        args: [3, "u1"],
      });
    });
  });

  describe("countProSubscribers", () => {
    it("returns count of starter and pro users", async () => {
      mockExecute.mockResolvedValue({ rows: [{ cnt: 42 }] });
      const result = await users.countProSubscribers();
      expect(mockExecute).toHaveBeenCalledWith(
        "SELECT COUNT(*) as cnt FROM users WHERE plan IN ('starter', 'pro')"
      );
      expect(result).toBe(42);
    });
  });

  describe("updateLastActive", () => {
    it("updates last_active_at", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.updateLastActive("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET last_active_at = datetime('now') WHERE id = ?",
        args: ["u1"],
      });
    });
  });

  describe("findUserByGoogleId", () => {
    it("returns DbUser when found", async () => {
      mockExecute.mockResolvedValue({ rows: [{ ...dbUserRow, google_id: "google-123" }] });
      const result = await users.findUserByGoogleId("google-123");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE google_id = ?",
        args: ["google-123"],
      });
      expect(result).not.toBeNull();
      expect(result?.google_id).toBe("google-123");
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.findUserByGoogleId("google-none");
      expect(result).toBeNull();
    });
  });

  describe("findUserByAppleId", () => {
    it("returns DbUser when found", async () => {
      mockExecute.mockResolvedValue({ rows: [{ ...dbUserRow, apple_id: "apple-123" }] });
      const result = await users.findUserByAppleId("apple-123");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE apple_id = ?",
        args: ["apple-123"],
      });
      expect(result).not.toBeNull();
      expect(result?.apple_id).toBe("apple-123");
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.findUserByAppleId("apple-none");
      expect(result).toBeNull();
    });
  });

  describe("findUserByStripeSubscriptionId", () => {
    it("returns DbUser when found", async () => {
      mockExecute.mockResolvedValue({ rows: [{ ...dbUserRow, stripe_subscription_id: "sub_123" }] });
      const result = await users.findUserByStripeSubscriptionId("sub_123");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE stripe_subscription_id = ?",
        args: ["sub_123"],
      });
      expect(result).not.toBeNull();
      expect(result?.stripe_subscription_id).toBe("sub_123");
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.findUserByStripeSubscriptionId("sub_none");
      expect(result).toBeNull();
    });
  });

  describe("updateUserProfile", () => {
    it("updates profile and returns PublicUser when user exists", async () => {
      const updatedRow = { ...dbUserRow, display_name: "Updated", email: "new@t.com" };
      mockExecute
        .mockResolvedValueOnce({ rows: [dbUserRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await users.updateUserProfile("u1", {
        displayName: "Updated",
        email: "new@t.com",
      });

      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: "SELECT * FROM users WHERE id = ?",
        args: ["u1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: "UPDATE users SET email = ?, display_name = ?, avatar_url = ?, device_portfolio_id = ?, tax_residency = ? WHERE id = ?",
        args: ["new@t.com", "Updated", "", "", "", "u1"],
      });
      expect(result).not.toBeNull();
      expect(result?.displayName).toBe("Updated");
    });

    it("returns null when user not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.updateUserProfile("nonexistent", { displayName: "X" });
      expect(result).toBeNull();
    });
  });

  describe("completeOnboarding", () => {
    it("updates onboarding_completed with displayName and taxResidency", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.completeOnboarding("u1", {
        displayName: "John",
        taxResidency: "ES",
      });
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("UPDATE users SET"),
        args: ["John", "ES", "u1"],
      });
      expect(mockExecute.mock.calls[0][0].sql).toContain("onboarding_completed = 1");
      expect(mockExecute.mock.calls[0][0].sql).toContain("display_name = ?");
      expect(mockExecute.mock.calls[0][0].sql).toContain("tax_residency = ?");
    });

    it("updates only onboarding_completed when no optional data", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.completeOnboarding("u1", {});
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET onboarding_completed = 1 WHERE id = ?",
        args: ["u1"],
      });
    });
  });

  describe("updateUserSubscription", () => {
    it("updates plan and stripe fields when user exists", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [dbUserRow] })
        .mockResolvedValueOnce({ rows: [] });

      await users.updateUserSubscription("u1", {
        plan: "pro",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        planExpiresAt: "2025-12-31",
      });

      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: "SELECT * FROM users WHERE id = ?",
        args: ["u1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("UPDATE users"),
        args: ["pro", "cus_123", "sub_123", "2025-12-31", "u1"],
      });
    });

    it("does nothing when user not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.updateUserSubscription("nonexistent", { plan: "pro" });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe("getDailyAiUsage", () => {
    it("returns usage when user exists and daily window is current", async () => {
      const today = new Date().toISOString();
      const row = { ...dbUserRow, ai_calls_today: 5, ai_daily_reset_at: today };
      mockExecute.mockResolvedValue({ rows: [row] });

      const result = await users.getDailyAiUsage("u1");

      expect(result).toEqual({
        aiCallsToday: 5,
        aiDailyResetAt: today,
      });
    });

    it("resets and returns 0 when daily window is stale", async () => {
      const oldDate = "2024-01-01";
      const row = { ...dbUserRow, ai_calls_today: 3, ai_daily_reset_at: oldDate };
      mockExecute
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await users.getDailyAiUsage("u1");

      expect(result.aiCallsToday).toBe(0);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET ai_calls_today = 0, ai_daily_reset_at = datetime('now') WHERE id = ?",
        args: ["u1"],
      });
    });

    it("returns defaults when user not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.getDailyAiUsage("nonexistent");
      expect(result.aiCallsToday).toBe(0);
      expect(result.aiDailyResetAt).toBeDefined();
    });
  });

  describe("incrementDailyAiUsage", () => {
    it("increments ai_calls_today and returns new count", async () => {
      const today = new Date().toISOString();
      const row = { ...dbUserRow, ai_calls_today: 2, ai_daily_reset_at: today };
      mockExecute
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await users.incrementDailyAiUsage("u1");

      expect(result).toBe(3);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET ai_calls_today = ? WHERE id = ?",
        args: [3, "u1"],
      });
    });
  });

  describe("toPublicUser", () => {
    it("returns PublicUser from DbUser", () => {
      const result = users.toPublicUser(dbUserRow as DbUser);
      expect(result).toMatchObject({
        id: "u1",
        username: "test",
        email: "t@t.com",
        displayName: "Test",
      });
    });
  });

  describe("getPortfolioReviewUsage", () => {
    it("returns usage when user exists and window is current", async () => {
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
      const row = { ...dbUserRow, portfolio_review_count: 4, portfolio_review_reset_at: currentMonth };
      mockExecute.mockResolvedValue({ rows: [row] });

      const result = await users.getPortfolioReviewUsage("u1");

      expect(result).toEqual({
        count: 4,
        resetAt: currentMonth,
      });
    });

    it("resets and returns 0 when window is stale", async () => {
      const oldDate = "2024-01-01";
      const row = { ...dbUserRow, portfolio_review_count: 2, portfolio_review_reset_at: oldDate };
      mockExecute
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await users.getPortfolioReviewUsage("u1");

      expect(result.count).toBe(0);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET portfolio_review_count = 0, portfolio_review_reset_at = datetime('now') WHERE id = ?",
        args: ["u1"],
      });
    });

    it("returns defaults when user not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.getPortfolioReviewUsage("nonexistent");
      expect(result.count).toBe(0);
      expect(result.resetAt).toBeDefined();
    });
  });

  describe("setEmailVerified", () => {
    it("sets email_verified to 1 when true", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.setEmailVerified("u1", true);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET email_verified = ? WHERE id = ?",
        args: [1, "u1"],
      });
    });

    it("sets email_verified to 0 when false", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.setEmailVerified("u1", false);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET email_verified = ? WHERE id = ?",
        args: [0, "u1"],
      });
    });
  });

  describe("linkGoogleAccount", () => {
    it("updates google_id", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.linkGoogleAccount("u1", "google-456");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET google_id = ? WHERE id = ?",
        args: ["google-456", "u1"],
      });
    });
  });

  describe("unlinkGoogleAccount", () => {
    it("clears google_id", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.unlinkGoogleAccount("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET google_id = '' WHERE id = ?",
        args: ["u1"],
      });
    });
  });

  describe("linkAppleAccount", () => {
    it("updates apple_id", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.linkAppleAccount("u1", "apple-789");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET apple_id = ? WHERE id = ?",
        args: ["apple-789", "u1"],
      });
    });
  });

  describe("unlinkAppleAccount", () => {
    it("clears apple_id", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.unlinkAppleAccount("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET apple_id = '' WHERE id = ?",
        args: ["u1"],
      });
    });
  });

  describe("generateWidgetToken", () => {
    it("updates widget_token_hash and returns token starting with tfw_", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.generateWidgetToken("u1");
      expect(result).toMatch(/^tfw_/);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET widget_token_hash = ? WHERE id = ?",
        args: ["hashed", "u1"],
      });
    });
  });

  describe("revokeWidgetToken", () => {
    it("clears widget_token_hash", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.revokeWidgetToken("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET widget_token_hash = '' WHERE id = ?",
        args: ["u1"],
      });
    });
  });

  describe("findUserByWidgetToken", () => {
    it("returns null for invalid prefix", async () => {
      const result = await users.findUserByWidgetToken("invalid_token");
      expect(result).toBeNull();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("returns null for empty token", async () => {
      const result = await users.findUserByWidgetToken("");
      expect(result).toBeNull();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("returns DbUser when valid token found", async () => {
      mockExecute.mockResolvedValue({ rows: [dbUserRow] });
      const result = await users.findUserByWidgetToken("tfw_abc123");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE widget_token_hash = ?",
        args: ["hashed"],
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe("u1");
    });

    it("returns null when valid prefix but no matching user", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.findUserByWidgetToken("tfw_xyz");
      expect(result).toBeNull();
    });
  });

  describe("trackEvent", () => {
    it("inserts into analytics_events with userId, event, and optional metadata", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await trackEvent("u1", "portfolio_import", { broker: "degiro" });
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "INSERT INTO analytics_events (id, user_id, event, metadata) VALUES (?, ?, ?, ?)",
        args: ["user-uuid-123", "u1", "portfolio_import", '{"broker":"degiro"}'],
      });
    });

    it("inserts with null metadata when data not provided", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await trackEvent("u1", "signup");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "INSERT INTO analytics_events (id, user_id, event, metadata) VALUES (?, ?, ?, ?)",
        args: ["user-uuid-123", "u1", "signup", null],
      });
    });
  });

  describe("generateDevicePasskey", () => {
    it("generates 12-digit passkey, hashes it, stores hash and returns passkey", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.generateDevicePasskey("u1");
      expect(result).toBe("1234-5678-9012");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET device_passkey_hash = ? WHERE id = ?",
        args: ["hashed", "u1"],
      });
    });
  });

  describe("revokeDevicePasskey", () => {
    it("clears device_passkey_hash", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.revokeDevicePasskey("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET device_passkey_hash = '' WHERE id = ?",
        args: ["u1"],
      });
    });
  });

  describe("findUserByDevicePasskey", () => {
    it("returns null for empty passkey", async () => {
      const result = await users.findUserByDevicePasskey("");
      expect(result).toBeNull();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("returns null for invalid format", async () => {
      const result = await users.findUserByDevicePasskey("invalid");
      expect(result).toBeNull();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("accepts legacy format xxxx-xxxx and returns user when found", async () => {
      mockExecute.mockResolvedValue({ rows: [dbUserRow] });
      const result = await users.findUserByDevicePasskey("1234-5678");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE device_passkey_hash = ?",
        args: ["hashed"],
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe("u1");
    });

    it("accepts new format xxxx-xxxx-xxxx and returns user when found", async () => {
      mockExecute.mockResolvedValue({ rows: [dbUserRow] });
      const result = await users.findUserByDevicePasskey("1234-5678-9012");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM users WHERE device_passkey_hash = ?",
        args: ["hashed"],
      });
      expect(result).not.toBeNull();
    });

    it("returns null when valid format but no matching user", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.findUserByDevicePasskey("1234-5678");
      expect(result).toBeNull();
    });
  });

  describe("markDeviceLinked", () => {
    it("sets device_linked_at when not already set", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.markDeviceLinked("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET device_linked_at = datetime('now') WHERE id = ? AND device_linked_at = ''",
        args: ["u1"],
      });
    });
  });

  describe("markDeviceProRedeemed", () => {
    it("sets device_pro_redeemed_at when not already set", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.markDeviceProRedeemed("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET device_pro_redeemed_at = datetime('now') WHERE id = ? AND device_pro_redeemed_at = ''",
        args: ["u1"],
      });
    });
  });

  describe("updateDeviceTemplate", () => {
    it("updates device_template_id", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await users.updateDeviceTemplate("u1", "minimal-light");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE users SET device_template_id = ? WHERE id = ?",
        args: ["minimal-light", "u1"],
      });
    });
  });

  describe("getDeviceTemplate", () => {
    it("returns device_template_id when user exists and has template", async () => {
      mockExecute.mockResolvedValue({ rows: [{ device_template_id: "minimal-dark" }] });
      const result = await users.getDeviceTemplate("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT device_template_id FROM users WHERE id = ?",
        args: ["u1"],
      });
      expect(result).toBe("minimal-dark");
    });

    it("returns classic-dark when user not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.getDeviceTemplate("nonexistent");
      expect(result).toBe("classic-dark");
    });

    it("returns classic-dark when device_template_id is empty", async () => {
      mockExecute.mockResolvedValue({ rows: [{ device_template_id: "" }] });
      const result = await users.getDeviceTemplate("u1");
      expect(result).toBe("classic-dark");
    });
  });

  describe("listUsersWithStats", () => {
    it("returns admin user list with aggregated stats", async () => {
      const adminRow = {
        id: "u1",
        username: "test",
        role: "user",
        plan: "free",
        email: "t@t.com",
        display_name: "Test",
        auth_provider: "credentials",
        email_verified: 1,
        must_change_password: 0,
        created_at: "2024-01-01",
        last_active_at: "2024-01-15",
        plan_expires_at: "",
        stripe_customer_id: "",
        stripe_subscription_id: "",
        tax_residency: "",
        onboarding_completed: 1,
        ai_calls_this_month: 0,
        portfolio_count: 2,
        holding_count: 5,
        total_holdings_eur: 1000,
        cash_count: 1,
        total_cash_eur: 500,
        transaction_count: 10,
        broker_accounts: "degiro",
        broker_imports: "degiro",
      };
      mockExecute.mockResolvedValue({ rows: [adminRow] });
      const result = await users.listUsersWithStats();
      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining("SELECT"));
      expect(mockExecute.mock.calls[0][0]).toContain("portfolio_count");
      expect(mockExecute.mock.calls[0][0]).toContain("holding_count");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "u1",
        username: "test",
        portfolioCount: 2,
        holdingCount: 5,
        totalHoldingsEur: 1000,
        cashCount: 1,
        totalCashEur: 500,
        transactionCount: 10,
        brokerAccounts: "degiro",
        brokerImports: "degiro",
      });
    });
  });

  describe("getUserDetailData", () => {
    it("returns portfolios and import events for user", async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [
            { id: "p1", name: "Main", currency: "EUR", is_default: 1 },
            { id: "p2", name: "Crypto", currency: "EUR", is_default: 0 },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { portfolio_id: "p1", cnt: 3, total_eur: 500 },
            { portfolio_id: "p2", cnt: 2, total_eur: 200 },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { event: "portfolio_import", metadata: '{"broker":"degiro"}', created_at: "2024-01-10" },
          ],
        });
      const result = await users.getUserDetailData("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT id, name, currency, is_default FROM portfolios WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC",
        args: ["u1"],
      });
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("holdings WHERE user_id = ? GROUP BY portfolio_id"),
        args: ["u1"],
      });
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("analytics_events"),
        args: ["u1"],
      });
      expect(result.portfolios).toHaveLength(2);
      expect(result.portfolios[0]).toMatchObject({
        id: "p1",
        name: "Main",
        currency: "EUR",
        isDefault: true,
        holdingCount: 3,
        totalValueEur: 500,
      });
      expect(result.portfolios[1]).toMatchObject({
        id: "p2",
        name: "Crypto",
        holdingCount: 2,
        totalValueEur: 200,
      });
      expect(result.importEvents).toHaveLength(1);
      expect(result.importEvents[0]).toMatchObject({
        event: "portfolio_import",
        metadata: '{"broker":"degiro"}',
        createdAt: "2024-01-10",
      });
    });
  });

  describe("getLastActive", () => {
    it("returns last_active_at when user exists", async () => {
      mockExecute.mockResolvedValue({ rows: [{ last_active_at: "2024-01-15T10:00:00Z" }] });
      const result = await users.getLastActive("u1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT last_active_at FROM users WHERE id = ?",
        args: ["u1"],
      });
      expect(result).toBe("2024-01-15T10:00:00Z");
    });

    it("returns empty string when user not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await users.getLastActive("nonexistent");
      expect(result).toBe("");
    });
  });
});
