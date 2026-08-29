import { describe, expect, it } from "vitest";
import { getPlanExpiryBannerVisibility } from "./plan-expiry-banner";

const now = Date.parse("2026-09-01T12:00:00.000Z");

describe("getPlanExpiryBannerVisibility", () => {
  it("hides Stripe-managed users", () => {
    expect(
      getPlanExpiryBannerVisibility({
        trialActivatedAt: "",
        plan: "pro",
        planExpiresAt: "2026-09-08T12:00:00.000Z",
        stripeManaged: true,
        nowMs: now,
      }),
    ).toEqual({ show: false });
  });

  it("shows sunset countdown without trial flag", () => {
    const v = getPlanExpiryBannerVisibility({
      trialActivatedAt: "",
      plan: "pro",
      planExpiresAt: "2026-09-03T12:00:00.000Z",
      nowMs: now,
    });
    expect(v.show).toBe(true);
    expect(v.variant).toBe("active");
    expect(v.kind).toBe("sunset");
    expect(v.days).toBe(2);
  });

  it("marks trial kind when activated", () => {
    const v = getPlanExpiryBannerVisibility({
      trialActivatedAt: "2026-08-25T12:00:00.000Z",
      plan: "pro",
      planExpiresAt: "2026-09-02T12:00:00.000Z",
      nowMs: now,
    });
    expect(v.kind).toBe("trial");
    expect(v.days).toBe(1);
  });
});
