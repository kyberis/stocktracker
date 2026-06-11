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
  "support-chat",
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
  "screener",
  "tax-reports",
  "simulator",
  "planning",
]);

export interface EntitlementInput {
  plan: SubscriptionPlan;
  /** @deprecated Use aiTokensThisMonth for token-based limits */
  aiCallsThisMonth: number;
  /** Monthly token usage — primary AI limit check */
  aiTokensThisMonth?: number;
  freeAiMonthlyLimit?: number;
  freeAiMonthlyTokenLimit?: number;
}

export interface EntitlementResult {
  allowed: boolean;
  reason?: "upgrade_required" | "ai_limit_reached";
  limit?: number;
  used?: number;
}

export const FREE_AI_MONTHLY_LIMIT = PLATFORM_LIMITS.AI_FREE_MONTHLY_LIMIT;
export const STARTER_AI_MONTHLY_LIMIT = PLATFORM_LIMITS.AI_STARTER_MONTHLY_LIMIT;

export const FREE_AI_MONTHLY_TOKEN_LIMIT = PLATFORM_LIMITS.AI_FREE_MONTHLY_TOKEN_LIMIT;
export const STARTER_AI_MONTHLY_TOKEN_LIMIT = PLATFORM_LIMITS.AI_STARTER_MONTHLY_TOKEN_LIMIT;
export const PRO_AI_MONTHLY_TOKEN_LIMIT = PLATFORM_LIMITS.AI_PRO_MONTHLY_TOKEN_LIMIT;

export function getAiTokenLimit(plan: SubscriptionPlan): number {
  if (plan === "pro") return PRO_AI_MONTHLY_TOKEN_LIMIT;
  if (plan === "starter") return STARTER_AI_MONTHLY_TOKEN_LIMIT;
  return FREE_AI_MONTHLY_TOKEN_LIMIT;
}

export function canAccessFeature(
  feature: SubscriptionFeature,
  input: EntitlementInput
): EntitlementResult {
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
    const tokensUsed = input.aiTokensThisMonth ?? 0;
    const tokenLimit = input.freeAiMonthlyTokenLimit != null && input.plan === "free"
      ? input.freeAiMonthlyTokenLimit
      : getAiTokenLimit(input.plan);

    if (tokensUsed < tokenLimit) return { allowed: true };
    return {
      allowed: false,
      reason: "ai_limit_reached",
      limit: tokenLimit,
      used: tokensUsed,
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
 * Free/Starter: 1 portfolio. Pro: up to 5.
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

/** Bifolio (starter) and Trefolio (pro) can connect brokers via SnapTrade. */
export function canUseBrokerSync(
  plan: SubscriptionPlan,
  planExpiresAt: string,
  opts?: { isAdmin?: boolean },
): boolean {
  if (opts?.isAdmin) return true;
  return getSnapTradeConnectionLimit(effectivePlan(plan, planExpiresAt)) > 0;
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

/**
 * Resolves the plan the user should currently be treated as, considering
 * a pending expiry date. If `planExpiresAt` is set and in the past the
 * user's paid period has ended and they should be treated as free.
 */
export function effectivePlan(plan: SubscriptionPlan, planExpiresAt: string): SubscriptionPlan {
  if (plan === "free" || !planExpiresAt) return plan;
  return new Date(planExpiresAt) > new Date() ? plan : "free";
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

