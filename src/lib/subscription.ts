import type { SubscriptionFeature, SubscriptionPlan } from "@/lib/types";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { countProSubscribers } from "@/lib/db";

const FREE_FEATURES = new Set<SubscriptionFeature>([
  "yahoo",
  "charts",
  "cash",
  "benchmarks",
]);

const PRO_FEATURES = new Set<SubscriptionFeature>([
  "alphavantage",
  "fundamentals",
  "intelligence",
  "economic-indicators",
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

export function canAccessFeature(
  feature: SubscriptionFeature,
  input: EntitlementInput
): EntitlementResult {
  const limit = input.freeAiMonthlyLimit ?? FREE_AI_MONTHLY_LIMIT;

  if (FREE_FEATURES.has(feature)) {
    return { allowed: true };
  }

  if (PRO_FEATURES.has(feature)) {
    if (input.plan === "pro") return { allowed: true };
    return { allowed: false, reason: "upgrade_required" };
  }

  if (feature === "ai") {
    if (input.plan === "pro") return { allowed: true };
    if (input.aiCallsThisMonth < limit) return { allowed: true };
    return {
      allowed: false,
      reason: "ai_limit_reached",
      limit,
      used: input.aiCallsThisMonth,
    };
  }

  return { allowed: false, reason: "upgrade_required" };
}

export async function isProCapacityAvailable(): Promise<{
  available: boolean;
  currentCount: number;
  maxCount: number;
  remaining: number;
}> {
  const currentCount = await countProSubscribers();
  const maxCount = PLATFORM_LIMITS.MAX_PRO_SUBSCRIBERS;
  return {
    available: currentCount < maxCount,
    currentCount,
    maxCount,
    remaining: Math.max(0, maxCount - currentCount),
  };
}
