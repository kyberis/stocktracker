import { describe, expect, it } from "vitest";
import { shouldPushLocalPlanToIdp } from "./sync-plan";

describe("shouldPushLocalPlanToIdp", () => {
  const base = {
    plan: "pro" as const,
    plan_expires_at: new Date(Date.now() + 86400000).toISOString(),
    stripe_subscription_id: "",
  };

  it("returns false when IdP already has pro", () => {
    expect(shouldPushLocalPlanToIdp(base, true)).toBe(false);
  });

  it("returns false when Stripe manages the subscription", () => {
    expect(
      shouldPushLocalPlanToIdp({ ...base, stripe_subscription_id: "sub_123" }, false),
    ).toBe(false);
  });

  it("returns false when local plan is not effective pro", () => {
    expect(
      shouldPushLocalPlanToIdp(
        { ...base, plan: "free", plan_expires_at: "" },
        false,
      ),
    ).toBe(false);
  });

  it("returns true for active local pro without Stripe when IdP is free", () => {
    expect(shouldPushLocalPlanToIdp(base, false)).toBe(true);
  });
});
