import type { SubscriptionFeature, SubscriptionPlan } from "@/lib/types";
import { PLATFORM_LIMITS } from "@/lib/platform-config";

/**
 * Features always available to every plan.
 */
const FREE_FEATURES = new Set<SubscriptionFeature>([
  "yahoo",
  "charts",
  "cash",
  "benchmarks",
]);

/**
 * Features available on Starter and Pro (not Free).
 */
const STARTER_FEATURES = new Set<SubscriptionFeature>([
  "portfolio-sharing",
  "csv-export",
]);

/**
 * Features only available on Pro.
 */
const PRO_FEATURES = new Set<SubscriptionFeature>([
  "alphavantage",
  "fundamentals",
  "intelligence",
  "economic-indicators",
  "alerts-email",
  "metrics",
  "portfolio-history-full",
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

