import { describe, expect, it } from "vitest";
import { PLATFORM_LIMITS, SOFT_CAPS } from "./platform-config";
import {
  FREE_AI_MONTHLY_TOKEN_LIMIT,
  PRO_AI_MONTHLY_TOKEN_LIMIT,
  getAiTokenLimit,
  canAccessFeature,
  canAccessTheme,
  effectivePlan,
  getAlertLimit,
  getAvailableThemes,
  getHoldingsLimit,
  getManualAssetLimit,
  getPortfolioLimit,
  getSnapTradeConnectionLimit,
  getThemeUpgradeTarget,
  canUseBrokerSync,
  planDisplayName,
} from "./subscription";

/**
 * In subscription model v2 every feature is universally accessible. The legacy
 * `canAccessFeature` and `canAccessTheme` are kept as no-op shims that always
 * allow; per-feature gating now happens through `requireFeatureQuota`.
 */
describe("canAccessFeature (universal access shim)", () => {
  it("always allows for free users regardless of feature", () => {
    expect(canAccessFeature("charts", { plan: "free", aiCallsThisMonth: 0 }).allowed).toBe(true);
    expect(canAccessFeature("fundamentals", { plan: "free", aiCallsThisMonth: 0 }).allowed).toBe(true);
    expect(canAccessFeature("intelligence", { plan: "free", aiCallsThisMonth: 0 }).allowed).toBe(true);
    expect(canAccessFeature("metrics", { plan: "free", aiCallsThisMonth: 0 }).allowed).toBe(true);
  });

  it("always allows for pro users", () => {
    expect(canAccessFeature("ai", { plan: "pro", aiCallsThisMonth: 0 }).allowed).toBe(true);
    expect(canAccessFeature("portfolio-sharing", { plan: "pro", aiCallsThisMonth: 0 }).allowed).toBe(true);
  });
});

describe("getHoldingsLimit", () => {
  it("returns the free soft cap for free plan", () => {
    expect(getHoldingsLimit("free")).toBe(SOFT_CAPS.holdings.free);
  });

  it("returns the pro soft cap for pro plan", () => {
    expect(getHoldingsLimit("pro")).toBe(SOFT_CAPS.holdings.pro);
  });
});

describe("getAlertLimit", () => {
  it("returns the free soft cap for free plan", () => {
    expect(getAlertLimit("free")).toBe(SOFT_CAPS.alerts.free);
  });

  it("returns the pro soft cap for pro plan", () => {
    expect(getAlertLimit("pro")).toBe(SOFT_CAPS.alerts.pro);
  });
});

describe("getPortfolioLimit", () => {
  it("returns the free soft cap for free plan", () => {
    expect(getPortfolioLimit("free")).toBe(SOFT_CAPS.portfolios.free);
  });

  it("returns the pro soft cap for pro plan", () => {
    expect(getPortfolioLimit("pro")).toBe(SOFT_CAPS.portfolios.pro);
  });
});

describe("getManualAssetLimit", () => {
  it("returns the free soft cap for free plan", () => {
    expect(getManualAssetLimit("free")).toBe(SOFT_CAPS.manualAssets.free);
  });

  it("returns the pro soft cap for pro plan", () => {
    expect(getManualAssetLimit("pro")).toBe(SOFT_CAPS.manualAssets.pro);
  });
});

describe("getSnapTradeConnectionLimit", () => {
  it("returns the free soft cap for free plan", () => {
    expect(getSnapTradeConnectionLimit("free")).toBe(SOFT_CAPS.snaptradeConnections.free);
  });

  it("returns the pro soft cap for pro plan", () => {
    expect(getSnapTradeConnectionLimit("pro")).toBe(SOFT_CAPS.snaptradeConnections.pro);
  });
});

describe("canUseBrokerSync", () => {
  it("denies free users", () => {
    expect(canUseBrokerSync("free", "")).toBe(false);
  });

  it("allows Bifolio (starter) and Trefolio (pro)", () => {
    expect(canUseBrokerSync("starter", "")).toBe(true);
    expect(canUseBrokerSync("pro", "")).toBe(true);
  });

  it("denies paid tiers after plan expiry", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(canUseBrokerSync("pro", past)).toBe(false);
    expect(canUseBrokerSync("starter", past)).toBe(false);
  });

  it("allows admins regardless of plan", () => {
    expect(canUseBrokerSync("free", "", { isAdmin: true })).toBe(true);
  });
});

describe("canAccessTheme (themes are universal)", () => {
  it("allows every theme for both plans", () => {
    for (const theme of ["default", "canvas", "terminal", "studio"] as const) {
      expect(canAccessTheme(theme, "free")).toBe(true);
      expect(canAccessTheme(theme, "pro")).toBe(true);
    }
  });
});

describe("getAvailableThemes", () => {
  it("returns every theme for both plans", () => {
    expect(getAvailableThemes("free")).toEqual(["default", "canvas", "terminal", "studio"]);
    expect(getAvailableThemes("pro")).toEqual(["default", "canvas", "terminal", "studio"]);
  });
});

describe("getThemeUpgradeTarget", () => {
  it("returns null for every theme (no theme requires upgrade)", () => {
    for (const theme of ["default", "canvas", "terminal", "studio"] as const) {
      expect(getThemeUpgradeTarget(theme)).toBe(null);
    }
  });
});

describe("effectivePlan", () => {
  it("returns free when plan is free regardless of expiry", () => {
    expect(effectivePlan("free", "")).toBe("free");
    expect(effectivePlan("free", "2099-12-31T23:59:59Z")).toBe("free");
  });

  it("returns plan when planExpiresAt is empty string", () => {
    expect(effectivePlan("pro", "")).toBe("pro");
  });

  it("returns plan when planExpiresAt is in the future", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(effectivePlan("pro", future.toISOString())).toBe("pro");
  });

  it("returns free when planExpiresAt is in the past", () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    expect(effectivePlan("pro", past.toISOString())).toBe("free");
  });
});

describe("planDisplayName", () => {
  it("returns Folio for free plan", () => {
    expect(planDisplayName("free")).toBe("Folio");
  });

  it("returns Trefolio for pro plan", () => {
    expect(planDisplayName("pro")).toBe("Trefolio");
  });
});

describe("getAiTokenLimit (legacy informational)", () => {
  it("returns the free token limit for free plan", () => {
    expect(getAiTokenLimit("free")).toBe(PLATFORM_LIMITS.AI_FREE_MONTHLY_TOKEN_LIMIT);
    expect(FREE_AI_MONTHLY_TOKEN_LIMIT).toBe(PLATFORM_LIMITS.AI_FREE_MONTHLY_TOKEN_LIMIT);
  });

  it("returns the pro token limit for pro plan", () => {
    expect(getAiTokenLimit("pro")).toBe(PLATFORM_LIMITS.AI_PRO_MONTHLY_TOKEN_LIMIT);
    expect(PRO_AI_MONTHLY_TOKEN_LIMIT).toBe(PLATFORM_LIMITS.AI_PRO_MONTHLY_TOKEN_LIMIT);
  });
});

describe("effectivePlan — trial scenarios", () => {
  it("returns pro during active trial (future planExpiresAt)", () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(effectivePlan("pro", future)).toBe("pro");
  });

  it("returns free when trial has expired (past planExpiresAt)", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(effectivePlan("pro", past)).toBe("free");
  });

  it("returns free when trial just expired (1 second ago)", () => {
    const justExpired = new Date(Date.now() - 1).toISOString();
    expect(effectivePlan("pro", justExpired)).toBe("free");
  });

  it("returns pro with no expiry (regular paid subscriber)", () => {
    expect(effectivePlan("pro", "")).toBe("pro");
  });

  it("returns free if plan is free regardless of expiry", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(effectivePlan("free", future)).toBe("free");
  });
});
