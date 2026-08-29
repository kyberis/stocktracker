import { describe, expect, it } from "vitest";
import {
  isLocalProSunsetCandidate,
  isStripeManaged,
  getSunsetExpiresAt,
  LOCAL_PRO_SUNSET_MS,
} from "./local-pro-sunset";

describe("isStripeManaged", () => {
  it("treats any subscription id as managed", () => {
    expect(isStripeManaged("sub_123")).toBe(true);
    expect(isStripeManaged("")).toBe(false);
    expect(isStripeManaged("  ")).toBe(false);
  });
});

describe("isLocalProSunsetCandidate", () => {
  it("includes local Pro without Stripe", () => {
    expect(
      isLocalProSunsetCandidate({
        plan: "pro",
        planExpiresAt: "",
        stripeSubscriptionId: "",
      }),
    ).toBe(true);
  });

  it("excludes Stripe subscribers", () => {
    expect(
      isLocalProSunsetCandidate({
        plan: "pro",
        planExpiresAt: "",
        stripeSubscriptionId: "sub_live",
      }),
    ).toBe(false);
  });

  it("excludes already-expired Pro", () => {
    expect(
      isLocalProSunsetCandidate({
        plan: "pro",
        planExpiresAt: "2020-01-01T00:00:00.000Z",
        stripeSubscriptionId: "",
      }),
    ).toBe(false);
  });
});

describe("getSunsetExpiresAt", () => {
  it("adds 7 days", () => {
    const from = Date.parse("2026-09-01T00:00:00.000Z");
    expect(getSunsetExpiresAt(from)).toBe(new Date(from + LOCAL_PRO_SUNSET_MS).toISOString());
  });
});
