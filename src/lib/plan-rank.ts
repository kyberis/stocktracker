import type { SubscriptionPlan } from "@/lib/types";

export const SUBSCRIPTION_PLANS = ["free", "basic", "pro", "wealth"] as const;

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  wealth: 3,
};

const PLAN_SET = new Set<string>(SUBSCRIPTION_PLANS);

/** Coerce stored / JWT / IdP values. Legacy `starter` maps to `pro`. */
export function parseSubscriptionPlan(value: unknown): SubscriptionPlan {
  if (value === "starter") return "pro";
  if (value === "ultra") return "wealth";
  if (typeof value === "string" && PLAN_SET.has(value)) {
    return value as SubscriptionPlan;
  }
  return "free";
}

export function isPaidPlan(plan: SubscriptionPlan): boolean {
  return plan !== "free";
}

/** Coerce a user/session plan field for rank helpers. */
export function planOf(user: { plan?: string | null } | null | undefined): SubscriptionPlan {
  return parseSubscriptionPlan(user?.plan);
}

export function planAtLeast(plan: SubscriptionPlan, minimum: SubscriptionPlan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minimum];
}

/** Next paid tier for upsell (Wealth has no further upgrade). */
export function nextUpgradeTarget(plan: SubscriptionPlan): SubscriptionPlan {
  if (plan === "free") return "basic";
  if (plan === "basic") return "pro";
  return "wealth";
}

/** Display names (product, not Folio/Trefolio). */
export function planDisplayName(plan: SubscriptionPlan): string {
  switch (plan) {
    case "free":
      return "Free";
    case "basic":
      return "Basic";
    case "pro":
      return "Pro";
    case "wealth":
      return "Wealth · Ultra";
  }
}

/** Product AI quality layer shown in UI (not raw OpenAI ids). */
export type AiModelLayer = "lite" | "standard" | "standard_plus" | "advanced";

export function aiModelLayerForPlan(plan: SubscriptionPlan): AiModelLayer {
  switch (plan) {
    case "free":
      return "lite";
    case "basic":
      return "standard";
    case "pro":
      return "standard_plus";
    case "wealth":
      return "advanced";
  }
}

export const AI_MODEL_LAYER_LABEL: Record<AiModelLayer, string> = {
  lite: "Lite",
  standard: "Standard",
  standard_plus: "Standard+",
  advanced: "Advanced",
};

export function pickTierValue<T>(
  table: Record<SubscriptionPlan, T>,
  plan: SubscriptionPlan,
): T {
  return table[plan] ?? table.free;
}

/** IdP boolean compat: Pro and Wealth count as trefolio_pro. */
export function trefolioProClaim(plan: SubscriptionPlan): boolean {
  return planAtLeast(plan, "pro");
}

/** Map a 4-tier plan to the IdP's historical free|pro field. */
export function idpLegacyPlan(plan: SubscriptionPlan): "free" | "pro" {
  return trefolioProClaim(plan) ? "pro" : "free";
}

export function claraDailyLimit(plan: SubscriptionPlan): number {
  switch (plan) {
    case "free":
      return 30;
    case "basic":
      return 30;
    case "pro":
      return 200;
    case "wealth":
      return 500;
  }
}

export function willDailyLimit(plan: SubscriptionPlan): number {
  switch (plan) {
    case "free":
      return 3;
    case "basic":
      return 30;
    case "pro":
      return 200;
    case "wealth":
      return 500;
  }
}
