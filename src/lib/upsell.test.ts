import { describe, expect, it } from "vitest";
import { getUpsellConfig, getUpsellReasonKey } from "@/lib/upsell";

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
});
