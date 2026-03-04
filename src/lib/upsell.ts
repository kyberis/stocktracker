import type { TranslationKey } from "@/lib/i18n";

export type UpsellReason = "ai_limit_reached" | "upgrade_required";

export type UpsellSurface =
  | "ai_limit"
  | "stock_detail_locked"
  | "intelligence_locked"
  | "economic_locked"
  | "dashboard_projection_locked"
  | "profile_always_on"
  | "settings_always_on";

export interface UpsellConfig {
  subtitleKey: TranslationKey;
  attemptedActionKey: TranslationKey;
  feature: string;
  freeItems: TranslationKey[];
  proItems: TranslationKey[];
}

const DEFAULT_FREE_ITEMS: TranslationKey[] = [
  "upsellFreeItemYahoo",
  "upsellFreeItemBasicCharts",
  "upsellFreeItemAiLimited",
];

const DEFAULT_PRO_ITEMS: TranslationKey[] = [
  "upsellProItemAlphaVantage",
  "upsellProItemPremiumScreens",
  "upsellProItemAiUnlimited",
];

const UPSSELL_BY_SURFACE: Record<UpsellSurface, UpsellConfig> = {
  ai_limit: {
    subtitleKey: "upsellCompareSubtitleAI",
    attemptedActionKey: "upsellAttemptAiAnalysis",
    feature: "ai",
    freeItems: DEFAULT_FREE_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  stock_detail_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptFundamentals",
    feature: "fundamentals",
    freeItems: DEFAULT_FREE_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  intelligence_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptIntelligence",
    feature: "intelligence",
    freeItems: DEFAULT_FREE_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  economic_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptEconomicIndicators",
    feature: "economic-indicators",
    freeItems: DEFAULT_FREE_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  dashboard_projection_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptProjection",
    feature: "projection",
    freeItems: DEFAULT_FREE_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  profile_always_on: {
    subtitleKey: "upsellCompareSubtitleAlways",
    attemptedActionKey: "upsellAttemptAiAnalysis",
    feature: "profile",
    freeItems: DEFAULT_FREE_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  settings_always_on: {
    subtitleKey: "upsellCompareSubtitleAlways",
    attemptedActionKey: "upsellAttemptIntelligence",
    feature: "settings",
    freeItems: DEFAULT_FREE_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
};

export function getUpsellConfig(surface: UpsellSurface): UpsellConfig {
  return UPSSELL_BY_SURFACE[surface];
}

export function getUpsellReasonKey(reason?: UpsellReason): TranslationKey {
  if (reason === "ai_limit_reached") return "upsellAiLimitReached";
  return "upsellUpgradeRequired";
}
