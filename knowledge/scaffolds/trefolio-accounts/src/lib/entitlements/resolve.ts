import type { Plan, Entitlement } from "@prisma/client";

export type TrefolioPlan = "free" | "basic" | "pro" | "wealth";

/**
 * Canonical entitlement claims that ride on every ID token issued by the IdP.
 * Mirrored verbatim into local product DBs at sign-in time.
 */
export interface EntitlementClaims {
  trefolio_pro: boolean;
  trefolio_plan: TrefolioPlan;
  clara_daily_limit: number;
  will_daily_limit: number;
}

const CLARA_DAILY: Record<TrefolioPlan, number> = {
  free: 30,
  basic: 30,
  pro: 200,
  wealth: 500,
};

const WILL_DAILY: Record<TrefolioPlan, number> = {
  free: 3,
  basic: 30,
  pro: 200,
  wealth: 500,
};

function asTrefolioPlan(plan: Plan | string): TrefolioPlan {
  if (plan === "basic" || plan === "pro" || plan === "wealth" || plan === "free") return plan;
  if (plan === "starter") return "pro";
  return "free";
}

/**
 * Effective plan after considering proUntil expiry.
 * Mirrors trefolio's effectivePlan() helper in src/lib/subscription.ts.
 */
export function effectivePlan(plan: Plan, proUntil: Date | null | undefined, now: Date = new Date()): Plan {
  const tier = asTrefolioPlan(plan);
  if (tier === "free") return "free";
  if (!proUntil) return plan;
  return proUntil.getTime() > now.getTime() ? plan : "free";
}

/**
 * Convert a stored Entitlement row into the claims that go into the ID token.
 * Pure function. No I/O.
 */
export function resolveEntitlements(ent: Pick<Entitlement, "plan" | "proUntil">): EntitlementClaims {
  const stored = effectivePlan(ent.plan, ent.proUntil ?? null);
  const tier = asTrefolioPlan(stored);
  return {
    trefolio_pro: tier === "pro" || tier === "wealth",
    trefolio_plan: stored === "free" ? "free" : tier,
    clara_daily_limit: CLARA_DAILY[tier === "free" && stored === "free" ? "free" : tier],
    will_daily_limit: WILL_DAILY[tier === "free" && stored === "free" ? "free" : tier],
  };
}

/**
 * Default claims when no Entitlement row exists yet (brand-new user).
 */
export function freeClaims(): EntitlementClaims {
  return resolveEntitlements({ plan: "free", proUntil: null });
}
