import { describe, expect, it } from "vitest";
import { FREE_AI_MONTHLY_LIMIT, canAccessFeature } from "./subscription";

describe("canAccessFeature", () => {
  it("allows free features for free users", () => {
    const result = canAccessFeature("charts", { plan: "free", aiCallsThisMonth: 0 });
    expect(result.allowed).toBe(true);
  });

  it("blocks pro-only features for free users with upgrade reason", () => {
    const result = canAccessFeature("fundamentals", { plan: "free", aiCallsThisMonth: 0 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("upgrade_required");
  });

  it("allows pro-only features for pro users", () => {
    const result = canAccessFeature("intelligence", { plan: "pro", aiCallsThisMonth: 999 });
    expect(result.allowed).toBe(true);
  });

  it("allows AI for free users under monthly limit", () => {
    const result = canAccessFeature("ai", {
      plan: "free",
      aiCallsThisMonth: FREE_AI_MONTHLY_LIMIT - 1,
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks AI for free users at monthly limit", () => {
    const result = canAccessFeature("ai", {
      plan: "free",
      aiCallsThisMonth: FREE_AI_MONTHLY_LIMIT,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("ai_limit_reached");
    expect(result.limit).toBe(FREE_AI_MONTHLY_LIMIT);
    expect(result.used).toBe(FREE_AI_MONTHLY_LIMIT);
  });

  it("allows unlimited AI for pro users", () => {
    const result = canAccessFeature("ai", {
      plan: "pro",
      aiCallsThisMonth: 10000,
    });
    expect(result.allowed).toBe(true);
  });
});
