import type { SubscriptionPlan } from "@/lib/types";

export type ClientPlatform = "desktop" | "mobile";

export type FeatureKey =
  // Dashboard tabs
  | "dashboard.portfolio"
  | "dashboard.diversification"
  | "dashboard.dividends"
  | "dashboard.news"
  | "dashboard.metrics"
  | "dashboard.growth"
  | "dashboard.events"
  | "dashboard.crypto"
  // Tools
  | "tools.watchlist"
  | "tools.dividends"
  | "tools.alerts"
  | "tools.transactions"
  | "tools.performance"
  | "tools.accounts"
  | "tools.rebalancing"
  | "tools.tax"
  | "tools.screener"
  | "tools.simulator"
  // Import
  | "import.manual"
  | "import.csv"
  | "import.ai"
  | "import.snaptrade"
  // Pages
  | "stock.detail"
  | "stock.intelligence"
  | "page.crypto"
  | "page.economic-indicators";

interface FeatureConfig {
  platforms: Set<ClientPlatform>;
  requiredPlan: SubscriptionPlan;
}

const ALL_PLATFORMS = new Set<ClientPlatform>(["desktop", "mobile"]);
const DESKTOP_ONLY = new Set<ClientPlatform>(["desktop"]);

const FEATURES: Record<FeatureKey, FeatureConfig> = {
  // Dashboard tabs — all 8 available on both platforms, tier-gated
  "dashboard.portfolio":        { platforms: ALL_PLATFORMS, requiredPlan: "free" },
  "dashboard.diversification":  { platforms: ALL_PLATFORMS, requiredPlan: "free" },
  "dashboard.dividends":        { platforms: ALL_PLATFORMS, requiredPlan: "free" },
  "dashboard.news":             { platforms: ALL_PLATFORMS, requiredPlan: "free" },
  "dashboard.metrics":          { platforms: ALL_PLATFORMS, requiredPlan: "starter" },
  "dashboard.growth":           { platforms: ALL_PLATFORMS, requiredPlan: "starter" },
  "dashboard.events":           { platforms: ALL_PLATFORMS, requiredPlan: "free" },
  "dashboard.crypto":           { platforms: ALL_PLATFORMS, requiredPlan: "pro" },

  // Tools — 5 on mobile, 11 on desktop
  "tools.watchlist":     { platforms: ALL_PLATFORMS, requiredPlan: "free" },
  "tools.dividends":     { platforms: ALL_PLATFORMS, requiredPlan: "free" },
  "tools.alerts":        { platforms: ALL_PLATFORMS, requiredPlan: "starter" },
  "tools.transactions":  { platforms: ALL_PLATFORMS, requiredPlan: "free" },
  "tools.performance":   { platforms: ALL_PLATFORMS, requiredPlan: "starter" },
  "tools.accounts":      { platforms: DESKTOP_ONLY,  requiredPlan: "free" },
  "tools.rebalancing":   { platforms: DESKTOP_ONLY,  requiredPlan: "free" },
  "tools.tax":           { platforms: DESKTOP_ONLY,  requiredPlan: "pro" },
  "tools.screener":      { platforms: DESKTOP_ONLY,  requiredPlan: "pro" },
  "tools.simulator":     { platforms: DESKTOP_ONLY,  requiredPlan: "pro" },

  // Import — Manual + SnapTrade on mobile; all on desktop
  "import.manual":    { platforms: ALL_PLATFORMS, requiredPlan: "free" },
  "import.csv":       { platforms: DESKTOP_ONLY,  requiredPlan: "free" },
  "import.ai":        { platforms: DESKTOP_ONLY,  requiredPlan: "pro" },
  "import.snaptrade": { platforms: ALL_PLATFORMS, requiredPlan: "starter" },

  // Pages
  "stock.detail":              { platforms: ALL_PLATFORMS, requiredPlan: "free" },
  "stock.intelligence":        { platforms: DESKTOP_ONLY,  requiredPlan: "pro" },
  "page.crypto":               { platforms: DESKTOP_ONLY,  requiredPlan: "pro" },
  "page.economic-indicators":  { platforms: DESKTOP_ONLY,  requiredPlan: "pro" },
};

const PLAN_RANK: Record<SubscriptionPlan, number> = { free: 0, starter: 1, pro: 2 };

/**
 * Whether a feature is available on the given platform, regardless of subscription tier.
 */
export function isFeatureOnPlatform(feature: FeatureKey, platform: ClientPlatform): boolean {
  return FEATURES[feature]?.platforms.has(platform) ?? false;
}

/**
 * Whether the user's plan meets the feature's tier requirement.
 */
export function isPlanSufficient(feature: FeatureKey, userPlan: SubscriptionPlan): boolean {
  const config = FEATURES[feature];
  if (!config) return false;
  return PLAN_RANK[userPlan] >= PLAN_RANK[config.requiredPlan];
}

/**
 * Full check: feature is available on this platform AND user's plan is sufficient.
 */
export function canAccessFeatureOnPlatform(
  feature: FeatureKey,
  platform: ClientPlatform,
  userPlan: SubscriptionPlan,
): boolean {
  return isFeatureOnPlatform(feature, platform) && isPlanSufficient(feature, userPlan);
}

/**
 * Returns the minimum plan required for a feature.
 */
export function getRequiredPlan(feature: FeatureKey): SubscriptionPlan {
  return FEATURES[feature]?.requiredPlan ?? "pro";
}

/**
 * Lists all features available on a given platform.
 */
export function getFeaturesForPlatform(platform: ClientPlatform): FeatureKey[] {
  return (Object.keys(FEATURES) as FeatureKey[]).filter(
    (key) => FEATURES[key].platforms.has(platform),
  );
}

/**
 * Lists all tools available on a given platform.
 */
export function getToolsForPlatform(platform: ClientPlatform): FeatureKey[] {
  return getFeaturesForPlatform(platform).filter((key) => key.startsWith("tools."));
}

/**
 * Lists all dashboard tabs available on a given platform.
 */
export function getDashboardTabsForPlatform(platform: ClientPlatform): FeatureKey[] {
  return getFeaturesForPlatform(platform).filter((key) => key.startsWith("dashboard."));
}
