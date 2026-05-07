import type { Plan, Entitlement } from "@prisma/client";

/**
 * Canonical entitlement claims that ride on every ID token issued by the IdP.
 * Mirrored verbatim into local product DBs at sign-in time.
 */
export interface EntitlementClaims {
  trefolio_pro: boolean;
  clara_daily_limit: number;
  will_daily_limit: number;
}

const FREE_DAILY_LIMIT = 30;
const PRO_DAILY_LIMIT = 200;

/**
 * Effective plan after considering proUntil expiry.
 * Mirrors trefolio's effectivePlan() helper in src/lib/subscription.ts.
 */
export function effectivePlan(plan: Plan, proUntil: Date | null | undefined, now: Date = new Date()): Plan {
  if (plan === "free") return "free";
  if (!proUntil) return "pro";
  return proUntil.getTime() > now.getTime() ? "pro" : "free";
}

/**
 * Convert a stored Entitlement row into the claims that go into the ID token.
 * Pure function. No I/O.
 */
export function resolveEntitlements(ent: Pick<Entitlement, "plan" | "proUntil">): EntitlementClaims {
  const eff = effectivePlan(ent.plan, ent.proUntil ?? null);
  if (eff === "pro") {
    return {
      trefolio_pro: true,
      clara_daily_limit: PRO_DAILY_LIMIT,
      will_daily_limit: PRO_DAILY_LIMIT,
    };
  }
  return {
    trefolio_pro: false,
    clara_daily_limit: FREE_DAILY_LIMIT,
    will_daily_limit: FREE_DAILY_LIMIT,
  };
}

/**
 * Default claims when no Entitlement row exists yet (brand-new user).
 */
export function freeClaims(): EntitlementClaims {
  return resolveEntitlements({ plan: "free", proUntil: null });
}
