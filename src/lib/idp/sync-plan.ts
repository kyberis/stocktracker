import { isIdpEnabled } from "@/lib/idp/config";
import { importUser } from "@/lib/idp/client";
import type { DbUser } from "@/lib/db/helpers";
import { effectivePlan } from "@/lib/subscription";
import { idpLegacyPlan, planAtLeast } from "@/lib/plan-rank";
import type { SubscriptionPlan } from "@/lib/types";

/**
 * Push the local Warren plan cache to the IdP so session refresh does not
 * overwrite admin grants, referral rewards, trials, etc.
 */
export async function syncLocalPlanToIdp(
  userId: string,
  email: string,
  plan: SubscriptionPlan,
  planExpiresAt: string,
): Promise<void> {
  if (!isIdpEnabled() || !email.trim()) return;

  try {
    const legacy = idpLegacyPlan(plan);
    const imported = await importUser({
      email: email.trim(),
      plan: legacy,
      trefolioPlan: plan,
      proUntil: planAtLeast(plan, "basic") ? planExpiresAt || undefined : undefined,
    });
    if (imported.sub) {
      const { linkLocalUserToIdpSub } = await import("./entitlements");
      await linkLocalUserToIdpSub({ localUserId: userId, idpSub: imported.sub });
    }
  } catch (err) {
    console.error(
      "[idp] failed to sync local plan:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** When local Pro is active without Stripe but IdP still says free, push up — do not downgrade. */
export function shouldPushLocalPlanToIdp(
  user: Pick<DbUser, "plan" | "plan_expires_at" | "stripe_subscription_id">,
  idpHasPro: boolean,
): boolean {
  if (idpHasPro) return false;
  if (user.stripe_subscription_id.trim()) return false;
  return planAtLeast(effectivePlan(user.plan, user.plan_expires_at), "pro");
}
