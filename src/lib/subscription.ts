import type { SubscriptionFeature, SubscriptionPlan, LayoutTheme } from "@/lib/types";
import { PLATFORM_LIMITS, SOFT_CAPS } from "@/lib/platform-config";

/**
 * In the universal-access model every feature is reachable from every plan.
 * Pro pays for *more* of the cost-bearing features (AI consultations and
 * paid-API requests) — see `FEATURE_QUOTAS` in `platform-config.ts`.
 *
 * `canAccessFeature` is kept as a thin compatibility shim for legacy callers,
 * but it always returns `{ allowed: true }` now. Per-feature quota checks live
 * in `feature-quotas.ts` and are enforced via `requireFeatureQuota` in guards.
 */

export interface EntitlementInput {
  plan: SubscriptionPlan;
  /** @deprecated Kept for backward compatibility; ignored under the quota model. */
  aiCallsThisMonth?: number;
  /** @deprecated Kept for backward compatibility; ignored under the quota model. */
  aiTokensThisMonth?: number;
  /** @deprecated Ignored. */
  freeAiMonthlyLimit?: number;
  /** @deprecated Ignored. */
  freeAiMonthlyTokenLimit?: number;
}

export interface EntitlementResult {
  allowed: boolean;
  reason?: "upgrade_required" | "ai_limit_reached" | "quota_exceeded";
  limit?: number;
  used?: number;
}

/** @deprecated Kept for analytics and `/me` exposure; not used as a gate. */
export const FREE_AI_MONTHLY_TOKEN_LIMIT = PLATFORM_LIMITS.AI_FREE_MONTHLY_TOKEN_LIMIT;
/** @deprecated Kept for analytics and `/me` exposure; not used as a gate. */
export const PRO_AI_MONTHLY_TOKEN_LIMIT = PLATFORM_LIMITS.AI_PRO_MONTHLY_TOKEN_LIMIT;

/** @deprecated Returns the legacy informational token budget for the plan. */
export function getAiTokenLimit(plan: SubscriptionPlan): number {
  if (plan === "pro") return PRO_AI_MONTHLY_TOKEN_LIMIT;
  return FREE_AI_MONTHLY_TOKEN_LIMIT;
}

/**
 * Universal-access shim. Always allows. New code should call
 * `checkFeatureQuota` from `feature-quotas.ts` instead.
 */
export function canAccessFeature(
  _feature: SubscriptionFeature,
  _input: EntitlementInput,
): EntitlementResult {
  return { allowed: true };
}

/* ── Soft caps (storage anti-abuse, not API quotas) ─────────────── */

export function getHoldingsLimit(plan: SubscriptionPlan): number {
  return plan === "pro" ? SOFT_CAPS.holdings.pro : SOFT_CAPS.holdings.free;
}

export function getAlertLimit(plan: SubscriptionPlan): number {
  return plan === "pro" ? SOFT_CAPS.alerts.pro : SOFT_CAPS.alerts.free;
}

export function getPortfolioLimit(plan: SubscriptionPlan): number {
  return plan === "pro" ? SOFT_CAPS.portfolios.pro : SOFT_CAPS.portfolios.free;
}

export function getManualAssetLimit(plan: SubscriptionPlan): number {
  return plan === "pro" ? SOFT_CAPS.manualAssets.pro : SOFT_CAPS.manualAssets.free;
}

export function getSnapTradeConnectionLimit(plan: SubscriptionPlan): number {
  return plan === "pro" ? SOFT_CAPS.snaptradeConnections.pro : SOFT_CAPS.snaptradeConnections.free;
}

export function getShareLinkLimit(plan: SubscriptionPlan): number {
  return plan === "pro" ? SOFT_CAPS.shareLinks.pro : SOFT_CAPS.shareLinks.free;
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

/* ── Themes: open to everyone ──────────────────────────────────── */

export function canAccessTheme(_theme: LayoutTheme, _plan: SubscriptionPlan): boolean {
  return true;
}

export function getAvailableThemes(_plan: SubscriptionPlan): LayoutTheme[] {
  return ["default", "canvas", "terminal", "studio"];
}

/** @deprecated No theme requires upgrade in the universal-access model. */
export function getThemeUpgradeTarget(_theme: LayoutTheme): SubscriptionPlan | null {
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
    case "pro":
      return "Trefolio";
  }
}
