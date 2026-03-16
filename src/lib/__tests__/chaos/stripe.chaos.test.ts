import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Stripe chaos", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  describe("getStripeClient", () => {
    it("throws when STRIPE_SECRET_KEY is not set", async () => {
      delete process.env.STRIPE_SECRET_KEY;
      vi.resetModules();
      const { getStripeClient } = await import("@/lib/stripe");
      expect(() => getStripeClient()).toThrow("STRIPE_SECRET_KEY is not configured");
    });

    it("returns a client when key is set", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_fake123";
      vi.resetModules();
      const { getStripeClient } = await import("@/lib/stripe");
      const client = getStripeClient();
      expect(client).toBeDefined();
    });

    it("caches the client across calls", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_fake456";
      vi.resetModules();
      const { getStripeClient } = await import("@/lib/stripe");
      const a = getStripeClient();
      const b = getStripeClient();
      expect(a).toBe(b);
    });
  });

  describe("webhook signature verification", () => {
    it("throws on invalid signature", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_fake";
      vi.resetModules();
      const { getStripeClient } = await import("@/lib/stripe");
      const stripe = getStripeClient();

      expect(() =>
        stripe.webhooks.constructEvent(
          '{"type":"test"}',
          "invalid-sig",
          "whsec_fake_secret",
        ),
      ).toThrow();
    });

    it("throws on empty payload", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_fake";
      vi.resetModules();
      const { getStripeClient } = await import("@/lib/stripe");
      const stripe = getStripeClient();

      expect(() =>
        stripe.webhooks.constructEvent("", "sig", "whsec_secret"),
      ).toThrow();
    });
  });

  describe("getBillingBaseUrl", () => {
    it("uses APP_BASE_URL when set", async () => {
      process.env.APP_BASE_URL = "https://trefolio.com";
      vi.resetModules();
      const { getBillingBaseUrl } = await import("@/lib/stripe");
      expect(getBillingBaseUrl()).toBe("https://trefolio.com");
    });

    it("falls back to fallbackOrigin", async () => {
      delete process.env.APP_BASE_URL;
      vi.resetModules();
      const { getBillingBaseUrl } = await import("@/lib/stripe");
      expect(getBillingBaseUrl("https://fallback.com")).toBe(
        "https://fallback.com",
      );
    });

    it("falls back to localhost", async () => {
      delete process.env.APP_BASE_URL;
      vi.resetModules();
      const { getBillingBaseUrl } = await import("@/lib/stripe");
      expect(getBillingBaseUrl()).toBe("http://localhost:3000");
    });
  });
});
