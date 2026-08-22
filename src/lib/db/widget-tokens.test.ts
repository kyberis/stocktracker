import { describe, it, expect, vi, beforeEach } from "vitest";
import * as widgetTokens from "./widget-tokens";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockClient = { execute: mockExecute };
  return { mockExecute, mockClient };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((value: string) => `enc:${value}`),
  decrypt: vi.fn((value: string) => value.replace(/^enc:/, "")),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("token-uuid-1"),
  randomBytes: vi.fn().mockReturnValue(Buffer.alloc(24, 0xab)),
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue("hashed"),
  }),
}));

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
  onboarding_completed: 1,
  google_id: "",
  apple_id: "",
  widget_token_hash: "",
  device_passkey_hash: "",
  device_template_id: "classic-dark",
  device_linked_at: "",
  device_pro_redeemed_at: "",
  device_portfolio_id: "",
  tax_residency: "",
  preferred_currency: "EUR",
  preferred_language: "en",
  stripe_price_id: "",
  trial_ends_at: "",
  membership_grant_token: "",
  membership_grant_expires_at: "",
  pending_membership_grant_plan: "",
  pending_membership_grant_days: 0,
  idp_sub: "",
  attribution_json: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockExecute.mockReset();
});

describe("widget-tokens", () => {
  describe("generateWidgetToken", () => {
    it("inserts a new token and syncs legacy hash", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await widgetTokens.generateWidgetToken("u1");
      expect(result).toMatch(/^tfw_/);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining("INSERT INTO widget_tokens"),
          args: expect.arrayContaining(["token-uuid-1", "u1", "hashed"]),
        }),
      );
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: "UPDATE users SET widget_token_hash = ? WHERE id = ?",
        }),
      );
    });
  });

  describe("getLatestValidWidgetToken", () => {
    it("decrypts the newest active token", async () => {
      mockExecute.mockResolvedValue({
        rows: [{ token_encrypted: "enc:tfw_latest" }],
      });
      const result = await widgetTokens.getLatestValidWidgetToken("u1");
      expect(result).toBe("tfw_latest");
    });
  });

  describe("revokeWidgetToken", () => {
    it("revokes one token when id is provided", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await widgetTokens.revokeWidgetToken("u1", "tok-1");
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining("WHERE id = ? AND user_id = ?"),
          args: ["tok-1", "u1"],
        }),
      );
    });

    it("revokes all active tokens when id is omitted", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await widgetTokens.revokeWidgetToken("u1");
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining("WHERE user_id = ? AND revoked_at = ''"),
          args: ["u1"],
        }),
      );
    });
  });

  describe("findUserByWidgetToken", () => {
    it("returns null for invalid prefix", async () => {
      const result = await widgetTokens.findUserByWidgetToken("invalid_token");
      expect(result).toBeNull();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("looks up active tokens in widget_tokens first", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [dbUserRow] });
      const result = await widgetTokens.findUserByWidgetToken("tfw_abc123");
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining("INNER JOIN widget_tokens"),
          args: ["hashed"],
        }),
      );
      expect(result?.id).toBe("u1");
    });

    it("falls back to legacy users.widget_token_hash", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [dbUserRow] });
      const result = await widgetTokens.findUserByWidgetToken("tfw_legacy");
      expect(result?.id).toBe("u1");
    });
  });

  describe("widgetTokenPrefix", () => {
    it("shortens long tokens for display", () => {
      const token = `tfw_${"a".repeat(40)}`;
      expect(widgetTokens.widgetTokenPrefix(token)).toBe(`${token.slice(0, 12)}…${token.slice(-4)}`);
    });
  });
});
