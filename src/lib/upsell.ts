import type { TranslationKey } from "@/lib/i18n";
import type { SubscriptionPlan } from "@/lib/types";

export type UpsellReason = "ai_limit_reached" | "upgrade_required" | "holdings_limit_reached";

export type UpsellSurface =
  | "ai_limit"
  | "stock_detail_locked"
  | "intelligence_locked"
  | "economic_locked"
  | "dashboard_projection_locked"
  | "profile_always_on"
  | "settings_always_on"
  | "alerts_limit"
  | "holdings_limit"
  | "portfolio_news_locked"
  | "broker_sync_import"
  | "import_holdings_capped"
  | "metrics_locked"
  | "portfolio_history_locked";

export interface UpsellConfig {
  subtitleKey: TranslationKey;
  attemptedActionKey: TranslationKey;
  feature: string;
  freeItems: TranslationKey[];
  starterItems: TranslationKey[];
  proItems: TranslationKey[];
}

const DEFAULT_FREE_ITEMS: TranslationKey[] = [
  "upsellFreeItemYahoo",
  "upsellFreeItemBasicCharts",
  "upsellFreeItemAiLimited",
];

const DEFAULT_STARTER_ITEMS: TranslationKey[] = [
  "upsellStarterItemMoreHoldings",
  "upsellStarterItemSharing",
  "upsellStarterItemMoreAi",
];

const DEFAULT_PRO_ITEMS: TranslationKey[] = [
  "upsellProItemAlphaVantage",
  "upsellProItemPremiumScreens",
  "upsellProItemAiUnlimited",
];

const UPSELL_BY_SURFACE: Record<UpsellSurface, UpsellConfig> = {
  ai_limit: {
    subtitleKey: "upsellCompareSubtitleAI",
    attemptedActionKey: "upsellAttemptAiAnalysis",
    feature: "ai",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: DEFAULT_STARTER_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  stock_detail_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptFundamentals",
    feature: "fundamentals",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: DEFAULT_STARTER_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  intelligence_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptIntelligence",
    feature: "intelligence",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: DEFAULT_STARTER_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  economic_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptEconomicIndicators",
    feature: "economic-indicators",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: DEFAULT_STARTER_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  dashboard_projection_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptProjection",
    feature: "projection",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: DEFAULT_STARTER_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  profile_always_on: {
    subtitleKey: "upsellCompareSubtitleAlways",
    attemptedActionKey: "upsellAttemptAiAnalysis",
    feature: "profile",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: DEFAULT_STARTER_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  settings_always_on: {
    subtitleKey: "upsellCompareSubtitleAlways",
    attemptedActionKey: "upsellAttemptIntelligence",
    feature: "settings",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: DEFAULT_STARTER_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  alerts_limit: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptAlerts",
    feature: "alerts",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: [
      "upsellStarterItemMoreAlerts",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
    ],
    proItems: DEFAULT_PRO_ITEMS,
  },
  holdings_limit: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptHoldings",
    feature: "holdings",
    freeItems: [
      "upsellFreeItemHoldingsLimit",
      "upsellFreeItemYahoo",
      "upsellFreeItemAiLimited",
    ],
    starterItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
    ],
    proItems: [
      "upsellProItemUnlimitedHoldings",
      "upsellProItemAlphaVantage",
      "upsellProItemAiUnlimited",
    ],
  },
  portfolio_news_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptPortfolioNews",
    feature: "intelligence",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: DEFAULT_STARTER_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  broker_sync_import: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptBrokerSync",
    feature: "broker-sync",
    freeItems: [
      "upsellFreeItemBrokerCsv",
      "upsellFreeItemYahoo",
      "upsellFreeItemBasicCharts",
    ],
    starterItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemCsvExport",
    ],
    proItems: [
      "upsellProItemBrokerSync",
      "upsellProItemAlphaVantage",
      "upsellProItemAiUnlimited",
    ],
  },
  import_holdings_capped: {
    subtitleKey: "upsellCompareSubtitleImport",
    attemptedActionKey: "upsellAttemptImportHoldings",
    feature: "import-holdings",
    freeItems: [
      "upsellFreeItemHoldingsLimit",
      "upsellFreeItemYahoo",
      "upsellFreeItemAiLimited",
    ],
    starterItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
    ],
    proItems: [
      "upsellProItemUnlimitedHoldings",
      "upsellProItemAlphaVantage",
      "upsellProItemAiUnlimited",
    ],
  },
  metrics_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptMetrics",
    feature: "metrics",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: DEFAULT_STARTER_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
  portfolio_history_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptPortfolioHistory",
    feature: "portfolio-history",
    freeItems: DEFAULT_FREE_ITEMS,
    starterItems: DEFAULT_STARTER_ITEMS,
    proItems: DEFAULT_PRO_ITEMS,
  },
};

export function getUpsellConfig(surface: UpsellSurface): UpsellConfig {
  return UPSELL_BY_SURFACE[surface];
}

/**
 * Returns the next plan to suggest upgrading to.
 * Free users → Starter, Starter users → Pro.
 */
export function getUpgradeTarget(plan: SubscriptionPlan): "starter" | "pro" {
  if (plan === "free") return "starter";
  return "pro";
}

export function getUpsellReasonKey(reason?: UpsellReason): TranslationKey {
  if (reason === "ai_limit_reached") return "upsellAiLimitReached";
  if (reason === "holdings_limit_reached") return "upsellHoldingsLimitReached";
  return "upsellUpgradeRequired";
}
