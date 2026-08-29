import { describe, expect, it } from "vitest";
import {
  aiModelLayerForPlan,
  idpLegacyPlan,
  nextUpgradeTarget,
  parseSubscriptionPlan,
  planAtLeast,
  planDisplayName,
  trefolioProClaim,
} from "./plan-rank";

describe("parseSubscriptionPlan", () => {
  it("maps starter to pro and unknown to free", () => {
    expect(parseSubscriptionPlan("starter")).toBe("pro");
    expect(parseSubscriptionPlan("ultra")).toBe("wealth");
    expect(parseSubscriptionPlan("wealth")).toBe("wealth");
    expect(parseSubscriptionPlan("nope")).toBe("free");
  });
});

describe("planAtLeast", () => {
  it("ranks free < basic < pro < wealth", () => {
    expect(planAtLeast("basic", "free")).toBe(true);
    expect(planAtLeast("pro", "basic")).toBe(true);
    expect(planAtLeast("basic", "pro")).toBe(false);
    expect(planAtLeast("wealth", "pro")).toBe(true);
  });
});

describe("nextUpgradeTarget", () => {
  it("walks Free → Basic → Pro → Wealth", () => {
    expect(nextUpgradeTarget("free")).toBe("basic");
    expect(nextUpgradeTarget("basic")).toBe("pro");
    expect(nextUpgradeTarget("pro")).toBe("wealth");
    expect(nextUpgradeTarget("wealth")).toBe("wealth");
  });
});

describe("display and IdP compat", () => {
  it("names plans and maps IdP boolean", () => {
    expect(planDisplayName("wealth")).toBe("Wealth · Ultra");
    expect(trefolioProClaim("pro")).toBe(true);
    expect(trefolioProClaim("basic")).toBe(false);
    expect(idpLegacyPlan("wealth")).toBe("pro");
    expect(idpLegacyPlan("basic")).toBe("free");
    expect(aiModelLayerForPlan("free")).toBe("lite");
    expect(aiModelLayerForPlan("wealth")).toBe("advanced");
  });
});
