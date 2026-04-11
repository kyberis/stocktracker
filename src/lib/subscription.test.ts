import { describe, expect, it } from "vitest";
import { PLATFORM_LIMITS } from "./platform-config";
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
  planDisplayName,
} from "./subscription";
import type { SubscriptionFeature } from "./types";

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

  it("allows AI for free users under monthly token limit", () => {
    const result = canAccessFeature("ai", {
      plan: "free",
      aiCallsThisMonth: 0,
      aiTokensThisMonth: FREE_AI_MONTHLY_TOKEN_LIMIT - 1,
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks AI for free users at monthly token limit", () => {
    const result = canAccessFeature("ai", {
      plan: "free",
      aiCallsThisMonth: 0,
      aiTokensThisMonth: FREE_AI_MONTHLY_TOKEN_LIMIT,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("ai_limit_reached");
    expect(result.limit).toBe(FREE_AI_MONTHLY_TOKEN_LIMIT);
    expect(result.used).toBe(FREE_AI_MONTHLY_TOKEN_LIMIT);
  });

  it("allows AI for pro users under token limit", () => {
    const result = canAccessFeature("ai", {
      plan: "pro",
      aiCallsThisMonth: 0,
      aiTokensThisMonth: PRO_AI_MONTHLY_TOKEN_LIMIT - 1,
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks AI for pro users at token limit", () => {
    const result = canAccessFeature("ai", {
      plan: "pro",
      aiCallsThisMonth: 0,
      aiTokensThisMonth: PRO_AI_MONTHLY_TOKEN_LIMIT,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("ai_limit_reached");
  });

  it("allows former starter-tier features for pro users", () => {
    const result = canAccessFeature("portfolio-sharing", {
      plan: "pro",
      aiCallsThisMonth: 0,
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks paid features for free users", () => {
    const result = canAccessFeature("metrics", {
      plan: "free",
      aiCallsThisMonth: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("upgrade_required");
  });

  it("uses freeAiMonthlyTokenLimit override for free users", () => {
    const customLimit = 50000;
    const resultUnder = canAccessFeature("ai", {
      plan: "free",
      aiCallsThisMonth: 0,
      aiTokensThisMonth: customLimit - 1,
      freeAiMonthlyTokenLimit: customLimit,
    });
    expect(resultUnder.allowed).toBe(true);

    const resultAt = canAccessFeature("ai", {
      plan: "free",
      aiCallsThisMonth: 0,
      aiTokensThisMonth: customLimit,
      freeAiMonthlyTokenLimit: customLimit,
    });
    expect(resultAt.allowed).toBe(false);
    expect(resultAt.reason).toBe("ai_limit_reached");
    expect(resultAt.limit).toBe(customLimit);
    expect(resultAt.used).toBe(customLimit);
  });

  it("returns upgrade_required for unknown feature", () => {
    const result = canAccessFeature("unknown" as SubscriptionFeature, {
      plan: "free",
      aiCallsThisMonth: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("upgrade_required");
  });
});

describe("getHoldingsLimit", () => {
  it("returns FREE_HOLDINGS_LIMIT for free plan", () => {
    expect(getHoldingsLimit("free")).toBe(PLATFORM_LIMITS.FREE_HOLDINGS_LIMIT);
  });

  it("returns Infinity for pro plan", () => {
    expect(getHoldingsLimit("pro")).toBe(Infinity);
  });
});

describe("getAlertLimit", () => {
  it("returns FREE_ALERT_LIMIT for free plan", () => {
    expect(getAlertLimit("free")).toBe(PLATFORM_LIMITS.FREE_ALERT_LIMIT);
  });

  it("returns Infinity for pro plan", () => {
    expect(getAlertLimit("pro")).toBe(Infinity);
  });
});

describe("getPortfolioLimit", () => {
  it("returns FREE_PORTFOLIO_LIMIT for free plan", () => {
    expect(getPortfolioLimit("free")).toBe(PLATFORM_LIMITS.FREE_PORTFOLIO_LIMIT);
  });

  it("returns PRO_PORTFOLIO_LIMIT for pro plan", () => {
    expect(getPortfolioLimit("pro")).toBe(PLATFORM_LIMITS.PRO_PORTFOLIO_LIMIT);
  });
});

describe("getManualAssetLimit", () => {
  it("returns FREE_MANUAL_ASSET_LIMIT for free plan", () => {
    expect(getManualAssetLimit("free")).toBe(PLATFORM_LIMITS.FREE_MANUAL_ASSET_LIMIT);
  });

  it("returns PRO_MANUAL_ASSET_LIMIT for pro plan", () => {
    expect(getManualAssetLimit("pro")).toBe(PLATFORM_LIMITS.PRO_MANUAL_ASSET_LIMIT);
  });
});

describe("getSnapTradeConnectionLimit", () => {
  it("returns FREE_SNAPTRADE_LIMIT for free plan", () => {
    expect(getSnapTradeConnectionLimit("free")).toBe(PLATFORM_LIMITS.FREE_SNAPTRADE_LIMIT);
  });

  it("returns PRO_SNAPTRADE_LIMIT for pro plan", () => {
    expect(getSnapTradeConnectionLimit("pro")).toBe(PLATFORM_LIMITS.PRO_SNAPTRADE_LIMIT);
  });
});

describe("canAccessTheme", () => {
  it("allows default theme for free and pro", () => {
    expect(canAccessTheme("default", "free")).toBe(true);
    expect(canAccessTheme("default", "pro")).toBe(true);
  });

  it("allows canvas theme for pro only", () => {
    expect(canAccessTheme("canvas", "free")).toBe(false);
    expect(canAccessTheme("canvas", "pro")).toBe(true);
  });

  it("allows terminal theme for pro only", () => {
    expect(canAccessTheme("terminal", "free")).toBe(false);
    expect(canAccessTheme("terminal", "pro")).toBe(true);
  });

  it("allows studio theme for pro only", () => {
    expect(canAccessTheme("studio", "free")).toBe(false);
    expect(canAccessTheme("studio", "pro")).toBe(true);
  });
});

describe("getAvailableThemes", () => {
  it("returns only default for free plan", () => {
    expect(getAvailableThemes("free")).toEqual(["default"]);
  });

  it("returns all themes for pro plan", () => {
    expect(getAvailableThemes("pro")).toEqual(["default", "canvas", "terminal", "studio"]);
  });
});

describe("getThemeUpgradeTarget", () => {
  it("returns pro for canvas theme", () => {
    expect(getThemeUpgradeTarget("canvas")).toBe("pro");
  });

  it("returns pro for terminal theme", () => {
    expect(getThemeUpgradeTarget("terminal")).toBe("pro");
  });

  it("returns pro for studio theme", () => {
    expect(getThemeUpgradeTarget("studio")).toBe("pro");
  });

  it("returns null for default theme", () => {
    expect(getThemeUpgradeTarget("default")).toBe(null);
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

describe("getAiTokenLimit", () => {
  it("returns FREE_AI_MONTHLY_TOKEN_LIMIT for free plan", () => {
    expect(getAiTokenLimit("free")).toBe(PLATFORM_LIMITS.AI_FREE_MONTHLY_TOKEN_LIMIT);
  });

  it("returns PRO_AI_MONTHLY_TOKEN_LIMIT for pro plan", () => {
    expect(getAiTokenLimit("pro")).toBe(PLATFORM_LIMITS.AI_PRO_MONTHLY_TOKEN_LIMIT);
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
