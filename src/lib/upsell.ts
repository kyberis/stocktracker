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
  | "portfolio_history_locked"
  | "crypto_pro_locked"
  | "crypto_portfolio"
  | "ai_import"
  | "net_worth_locked"
  | "screener_locked"
  | "simulator_locked"
  | "planning_locked"
  | "portfolio_score_locked"
  | "tax_report_locked"
  | "ai_model_tier";

export interface UpsellConfig {
  subtitleKey: TranslationKey;
  attemptedActionKey: TranslationKey;
  feature: string;
  freeItems: TranslationKey[];
  /** Trefolio (paid) benefits vs Folio */
  paidItems: TranslationKey[];
}

const DEFAULT_FREE_ITEMS: TranslationKey[] = [
  "upsellFreeItemYahoo",
  "upsellFreeItemBasicCharts",
  "upsellFreeItemAiLimited",
];

const DEFAULT_PAID_ITEMS: TranslationKey[] = [
  "upsellStarterItemMoreHoldings",
  "upsellStarterItemSharing",
  "upsellStarterItemMoreAi",
  "upsellProItemBetterAiModel",
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
    paidItems: DEFAULT_PAID_ITEMS,
  },
  stock_detail_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptFundamentals",
    feature: "fundamentals",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: DEFAULT_PAID_ITEMS,
  },
  intelligence_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptIntelligence",
    feature: "intelligence",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: DEFAULT_PAID_ITEMS,
  },
  economic_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptEconomicIndicators",
    feature: "economic-indicators",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: DEFAULT_PAID_ITEMS,
  },
  dashboard_projection_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptProjection",
    feature: "projection",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: DEFAULT_PAID_ITEMS,
  },
  profile_always_on: {
    subtitleKey: "upsellCompareSubtitleAlways",
    attemptedActionKey: "upsellAttemptAiAnalysis",
    feature: "profile",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: DEFAULT_PAID_ITEMS,
  },
  settings_always_on: {
    subtitleKey: "upsellCompareSubtitleAlways",
    attemptedActionKey: "upsellAttemptIntelligence",
    feature: "settings",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: DEFAULT_PAID_ITEMS,
  },
  alerts_limit: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptAlerts",
    feature: "alerts",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: [
      "upsellStarterItemMoreAlerts",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
      "upsellProItemAlphaVantage",
      "upsellProItemPremiumScreens",
      "upsellProItemAiUnlimited",
    ],
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
    paidItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
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
    paidItems: DEFAULT_PAID_ITEMS,
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
    paidItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemCsvExport",
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
    paidItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
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
    paidItems: DEFAULT_PAID_ITEMS,
  },
  portfolio_history_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptPortfolioHistory",
    feature: "portfolio-history",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: DEFAULT_PAID_ITEMS,
  },
  crypto_pro_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptCryptoPro",
    feature: "crypto-pro",
    freeItems: [
      "upsellFreeItemCryptoBasic",
      "upsellFreeItemYahoo",
      "upsellFreeItemAiLimited",
    ],
    paidItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
      "upsellProItemCryptoFull",
      "upsellProItemAlphaVantage",
      "upsellProItemAiUnlimited",
    ],
  },
  crypto_portfolio: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptCryptoPortfolio",
    feature: "crypto-portfolio",
    freeItems: [
      "upsellFreeItemCryptoBasic",
      "upsellFreeItemYahoo",
      "upsellFreeItemAiLimited",
    ],
    paidItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
      "upsellProItemCryptoPortfolio",
      "upsellProItemCryptoFull",
      "upsellProItemAlphaVantage",
    ],
  },
  ai_import: {
    subtitleKey: "upsellCompareSubtitleAI",
    attemptedActionKey: "upsellAttemptAiAnalysis",
    feature: "ai-import",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: DEFAULT_PAID_ITEMS,
  },
  net_worth_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptNetWorth",
    feature: "net-worth",
    freeItems: [
      "upsellFreeItemYahoo",
      "upsellFreeItemBasicCharts",
      "upsellFreeItemAiLimited",
    ],
    paidItems: [
      "upsellStarterItemNetWorth",
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemMoreAi",
      "upsellProItemUnlimitedAssets",
      "upsellProItemAlphaVantage",
      "upsellProItemAiUnlimited",
    ],
  },
  screener_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptScreener",
    feature: "screener",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
      "upsellProItemScreener",
      "upsellProItemAlphaVantage",
      "upsellProItemAiUnlimited",
    ],
  },
  simulator_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptSimulator",
    feature: "simulator",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
      "upsellProItemSimulator",
      "upsellProItemAlphaVantage",
      "upsellProItemAiUnlimited",
    ],
  },
  planning_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptSimulator",
    feature: "planning",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
      "upsellProItemSimulator",
      "upsellProItemAlphaVantage",
      "upsellProItemAiUnlimited",
    ],
  },
  portfolio_score_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptPortfolioScore",
    feature: "portfolio_score",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
      "upsellProItemPortfolioScore",
      "upsellProItemAlphaVantage",
      "upsellProItemAiUnlimited",
    ],
  },
  tax_report_locked: {
    subtitleKey: "upsellCompareSubtitleLocked",
    attemptedActionKey: "upsellAttemptTaxReport",
    feature: "tax_report",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: [
      "upsellStarterItemMoreHoldings",
      "upsellStarterItemSharing",
      "upsellStarterItemMoreAi",
      "upsellProItemTaxReport",
      "upsellProItemAlphaVantage",
      "upsellProItemAiUnlimited",
    ],
  },
  ai_model_tier: {
    subtitleKey: "upsellCompareSubtitleAI",
    attemptedActionKey: "upsellAttemptAiAnalysis",
    feature: "ai",
    freeItems: DEFAULT_FREE_ITEMS,
    paidItems: DEFAULT_PAID_ITEMS,
  },
};

export function getUpsellConfig(surface: UpsellSurface): UpsellConfig {
  return UPSELL_BY_SURFACE[surface];
}

/** Paid tier is always Trefolio (pro). */
export function getUpgradeTarget(_plan: SubscriptionPlan): "pro" {
  return "pro";
}

export function getUpsellReasonKey(reason?: UpsellReason): TranslationKey {
  if (reason === "ai_limit_reached") return "upsellAiLimitReached";
  if (reason === "holdings_limit_reached") return "upsellHoldingsLimitReached";
  return "upsellUpgradeRequired";
}
