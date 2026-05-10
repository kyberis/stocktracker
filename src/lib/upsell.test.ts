import { describe, expect, it } from "vitest";
import { getUpsellConfig, getUpsellReasonKey } from "@/lib/upsell";
import type { UpsellSurface } from "@/lib/upsell";

describe("upsell mapping", () => {
  it("maps AI limit reason to dedicated copy key", () => {
    expect(getUpsellReasonKey("ai_limit_reached")).toBe("upsellAiLimitReached");
  });

  it("maps default reason to upgrade-required copy key", () => {
    expect(getUpsellReasonKey("upgrade_required")).toBe("upsellUpgradeRequired");
    expect(getUpsellReasonKey()).toBe("upsellUpgradeRequired");
  });

  it("provides AI-limit surface context", () => {
    const config = getUpsellConfig("ai_limit");
    expect(config.feature).toBe("ai");
    expect(config.attemptedActionKey).toBe("upsellAttemptAiAnalysis");
    expect(config.subtitleKey).toBe("upsellCompareSubtitleAI");
  });

  it("provides locked-feature context for stock details", () => {
    const config = getUpsellConfig("stock_detail_locked");
    expect(config.feature).toBe("fundamentals");
    expect(config.attemptedActionKey).toBe("upsellAttemptFundamentals");
    expect(config.subtitleKey).toBe("upsellCompareSubtitleLocked");
  });

  it("provides locked-feature context for projection", () => {
    const config = getUpsellConfig("dashboard_projection_locked");
    expect(config.feature).toBe("projection");
    expect(config.attemptedActionKey).toBe("upsellAttemptProjection");
    expect(config.subtitleKey).toBe("upsellCompareSubtitleLocked");
  });

  it("provides locked-feature context for portfolio score", () => {
    const config = getUpsellConfig("portfolio_score_locked");
    expect(config.feature).toBe("portfolio_score");
    expect(config.attemptedActionKey).toBe("upsellAttemptPortfolioScore");
    expect(config.subtitleKey).toBe("upsellCompareSubtitleLocked");
    expect(config.paidItems).toContain("upsellProItemPortfolioScore");
  });

  it("provides locked-feature context for tax report", () => {
    const config = getUpsellConfig("tax_report_locked");
    expect(config.feature).toBe("tax_report");
    expect(config.attemptedActionKey).toBe("upsellAttemptTaxReport");
    expect(config.subtitleKey).toBe("upsellCompareSubtitleLocked");
    expect(config.paidItems).toContain("upsellProItemTaxReport");
  });

  it("provides locked-feature context for screener", () => {
    const config = getUpsellConfig("screener_locked");
    expect(config.feature).toBe("screener");
    expect(config.attemptedActionKey).toBe("upsellAttemptScreener");
    expect(config.paidItems).toContain("upsellProItemScreener");
  });

  it("every declared surface has a valid config with required fields", () => {
    const surfaces: UpsellSurface[] = [
      "ai_limit", "stock_detail_locked", "intelligence_locked",
      "economic_locked", "dashboard_projection_locked", "profile_always_on",
      "settings_always_on", "alerts_limit", "holdings_limit",
      "broker_sync_import", "import_holdings_capped",
      "metrics_locked", "portfolio_history_locked", "crypto_pro_locked",
      "crypto_portfolio", "ai_import", "net_worth_locked",
      "screener_locked", "simulator_locked", "planning_locked",
      "portfolio_score_locked", "tax_report_locked", "ai_model_tier",
    ];
    for (const surface of surfaces) {
      const config = getUpsellConfig(surface);
      expect(config, `Missing config for surface: ${surface}`).toBeDefined();
      expect(config.feature).toBeTruthy();
      expect(config.subtitleKey).toBeTruthy();
      expect(config.attemptedActionKey).toBeTruthy();
      expect(config.freeItems.length).toBeGreaterThan(0);
      expect(config.paidItems.length).toBeGreaterThan(0);
    }
  });
});
