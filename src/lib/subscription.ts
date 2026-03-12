import type { SubscriptionFeature, SubscriptionPlan, LayoutTheme } from "@/lib/types";
import { PLATFORM_LIMITS } from "@/lib/platform-config";

/**
 * Features always available to every plan.
 */
const FREE_FEATURES = new Set<SubscriptionFeature>([
  "yahoo",
  "charts",
  "cash",
  "benchmarks",
  "crypto",
  "event-calendar-earnings",
]);

/**
 * Features available on Starter and Pro (not Free).
 */
const STARTER_FEATURES = new Set<SubscriptionFeature>([
  "portfolio-sharing",
  "csv-export",
  "alerts-email",
  "alerts-push",
  "metrics",
  "portfolio-history-full",
  "event-calendar-economic",
  "net-worth",
]);

/**
 * Features only available on Pro.
 */
const PRO_FEATURES = new Set<SubscriptionFeature>([
  "alphavantage",
  "fundamentals",
  "intelligence",
  "economic-indicators",
  "alerts-whatsapp",
  "alerts-device",
  "crypto-pro",
  "crypto-portfolio",
  "event-calendar-ipo",
]);

export interface EntitlementInput {
  plan: SubscriptionPlan;
  aiCallsThisMonth: number;
  freeAiMonthlyLimit?: number;
}

export interface EntitlementResult {
  allowed: boolean;
  reason?: "upgrade_required" | "ai_limit_reached";
  limit?: number;
  used?: number;
}

export const FREE_AI_MONTHLY_LIMIT = PLATFORM_LIMITS.AI_FREE_MONTHLY_LIMIT;
export const STARTER_AI_MONTHLY_LIMIT = PLATFORM_LIMITS.AI_STARTER_MONTHLY_LIMIT;

export function canAccessFeature(
  feature: SubscriptionFeature,
  input: EntitlementInput
): EntitlementResult {
  const freeLimit = input.freeAiMonthlyLimit ?? FREE_AI_MONTHLY_LIMIT;

  if (FREE_FEATURES.has(feature)) {
    return { allowed: true };
  }

  if (STARTER_FEATURES.has(feature)) {
    if (input.plan === "starter" || input.plan === "pro") return { allowed: true };
    return { allowed: false, reason: "upgrade_required" };
  }

  if (PRO_FEATURES.has(feature)) {
    if (input.plan === "pro") return { allowed: true };
    return { allowed: false, reason: "upgrade_required" };
  }

  if (feature === "ai") {
    if (input.plan === "pro") return { allowed: true };
    if (input.plan === "starter") {
      if (input.aiCallsThisMonth < STARTER_AI_MONTHLY_LIMIT) return { allowed: true };
      return {
        allowed: false,
        reason: "ai_limit_reached",
        limit: STARTER_AI_MONTHLY_LIMIT,
        used: input.aiCallsThisMonth,
      };
    }
    // free
    if (input.aiCallsThisMonth < freeLimit) return { allowed: true };
    return {
      allowed: false,
      reason: "ai_limit_reached",
      limit: freeLimit,
      used: input.aiCallsThisMonth,
    };
  }

  return { allowed: false, reason: "upgrade_required" };
}

/**
 * Returns the holdings limit for a given plan.
 * Pro has no limit (returns Infinity).
 */
export function getHoldingsLimit(plan: SubscriptionPlan): number {
  if (plan === "pro") return Infinity;
  if (plan === "starter") return PLATFORM_LIMITS.STARTER_HOLDINGS_LIMIT;
  return PLATFORM_LIMITS.FREE_HOLDINGS_LIMIT;
}

/**
 * Returns the price alert limit for a given plan.
 * Pro has no limit (returns Infinity).
 */
export function getAlertLimit(plan: SubscriptionPlan): number {
  if (plan === "pro") return Infinity;
  if (plan === "starter") return PLATFORM_LIMITS.STARTER_ALERT_LIMIT;
  return PLATFORM_LIMITS.FREE_ALERT_LIMIT;
}

/**
 * Returns the portfolio limit for a given plan.
 * Free/Starter: 1 portfolio. Pro: up to 3.
 */
export function getPortfolioLimit(plan: SubscriptionPlan): number {
  if (plan === "pro") return PLATFORM_LIMITS.PRO_PORTFOLIO_LIMIT;
  if (plan === "starter") return PLATFORM_LIMITS.STARTER_PORTFOLIO_LIMIT;
  return PLATFORM_LIMITS.FREE_PORTFOLIO_LIMIT;
}

/**
 * Returns the manual asset limit (non-cash types) for a given plan.
 * Free: 0. Starter: 10. Pro: unlimited.
 */
export function getManualAssetLimit(plan: SubscriptionPlan): number {
  if (plan === "pro") return PLATFORM_LIMITS.PRO_MANUAL_ASSET_LIMIT;
  if (plan === "starter") return PLATFORM_LIMITS.STARTER_MANUAL_ASSET_LIMIT;
  return PLATFORM_LIMITS.FREE_MANUAL_ASSET_LIMIT;
}

/**
 * Returns the SnapTrade broker connection limit for a given plan.
 * Free: 0 (no access). Starter: 1. Pro: unlimited.
 */
export function getSnapTradeConnectionLimit(plan: SubscriptionPlan): number {
  if (plan === "pro") return PLATFORM_LIMITS.PRO_SNAPTRADE_LIMIT;
  if (plan === "starter") return PLATFORM_LIMITS.STARTER_SNAPTRADE_LIMIT;
  return PLATFORM_LIMITS.FREE_SNAPTRADE_LIMIT;
}

/**
 * Theme access rules per plan.
 * Default: all tiers. Canvas: starter+. Terminal/Studio: pro only.
 */
const THEME_ACCESS: Record<LayoutTheme, Set<SubscriptionPlan>> = {
  default: new Set(["free", "starter", "pro"]),
  canvas: new Set(["starter", "pro"]),
  terminal: new Set(["pro"]),
  studio: new Set(["pro"]),
};

export function canAccessTheme(theme: LayoutTheme, plan: SubscriptionPlan): boolean {
  return THEME_ACCESS[theme]?.has(plan) ?? false;
}

export function getAvailableThemes(plan: SubscriptionPlan): LayoutTheme[] {
  return (Object.keys(THEME_ACCESS) as LayoutTheme[]).filter((t) => THEME_ACCESS[t].has(plan));
}

export function getThemeUpgradeTarget(theme: LayoutTheme): SubscriptionPlan | null {
  if (theme === "canvas") return "starter";
  if (theme === "terminal" || theme === "studio") return "pro";
  return null;
}

/** Maps internal plan identifiers to user-facing tier names. */
export function planDisplayName(plan: SubscriptionPlan): string {
  switch (plan) {
    case "free":
      return "Folio";
    case "starter":
      return "Bifolio";
    case "pro":
      return "Trefolio";
  }
}

