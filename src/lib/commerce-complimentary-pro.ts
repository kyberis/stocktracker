import { findUserById, updateUserSubscription, computeMembershipGrantExpiry } from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import type { DbUser } from "@/lib/db/helpers";
import { isCommerceEnabled } from "@/lib/commerce-server";
import { effectivePlan } from "@/lib/subscription";
import { linkLocalUserToIdpSub } from "@/lib/idp/entitlements";

export const COMMERCE_COMPLIMENTARY_DAYS = 30;

export type CommerceComplimentarySkipReason =
  | "commerce_enabled"
  | "local_pro_sunset"
  | "user_not_found"
  | "stripe_managed"
  | "permanent_pro"
  | "not_expired"
  | "not_candidate";

/** Complimentary Pro is retired; paid access is Stripe-only. */
export const LOCAL_PRO_SUNSET_ACTIVE = true;

export function isCommerceComplimentaryCandidate(
  user: Pick<DbUser, "commerce_complimentary_at" | "stripe_subscription_id">,
): boolean {
  if (!user.commerce_complimentary_at.trim()) return false;
  return !user.stripe_subscription_id.trim();
}

export function isCommerceComplimentaryActive(
  user: Pick<DbUser, "commerce_complimentary_at" | "stripe_subscription_id" | "plan" | "plan_expires_at">,
): boolean {
  if (!isCommerceComplimentaryCandidate(user)) return false;
  return effectivePlan(user.plan, user.plan_expires_at) === "pro";
}

function isPermanentPro(user: Pick<DbUser, "plan" | "plan_expires_at">): boolean {
  return user.plan === "pro" && !user.plan_expires_at.trim();
}

async function markCommerceComplimentaryAt(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE users SET commerce_complimentary_at = datetime('now') WHERE id = ? AND commerce_complimentary_at = ''`,
    args: [userId],
  });
}

export async function syncCommerceComplimentaryToIdp(
  userId: string,
  email: string,
  planExpiresAt: string,
): Promise<void> {
  const { isIdpEnabled } = await import("@/lib/idp/config");
  const { importUser } = await import("@/lib/idp/client");
  if (!isIdpEnabled() || !email.trim()) return;

  try {
    const imported = await importUser({
      email: email.trim(),
      plan: "pro",
      proUntil: planExpiresAt,
    });
    if (imported.sub) {
      await linkLocalUserToIdpSub({ localUserId: userId, idpSub: imported.sub });
    }
  } catch (err) {
    console.error(
      "[idp] failed to sync commerce complimentary pro:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function grantCommerceComplimentaryPro(
  userId: string,
): Promise<{ granted: true; planExpiresAt: string } | { granted: false; reason: CommerceComplimentarySkipReason }> {
  if (LOCAL_PRO_SUNSET_ACTIVE) {
    return { granted: false, reason: "local_pro_sunset" };
  }
  if (await isCommerceEnabled()) {
    return { granted: false, reason: "commerce_enabled" };
  }

  const user = await findUserById(userId);
  if (!user) return { granted: false, reason: "user_not_found" };
  if (user.stripe_subscription_id.trim()) {
    return { granted: false, reason: "stripe_managed" };
  }
  if (isPermanentPro(user)) {
    return { granted: false, reason: "permanent_pro" };
  }

  const planExpiresAt = computeMembershipGrantExpiry(user, "pro", COMMERCE_COMPLIMENTARY_DAYS).toISOString();
  await updateUserSubscription(userId, { plan: "pro", planExpiresAt });
  await markCommerceComplimentaryAt(userId);

  if (user.email) {
    await syncCommerceComplimentaryToIdp(userId, user.email, planExpiresAt);
  }

  return { granted: true, planExpiresAt };
}

export async function renewCommerceComplimentaryPro(
  userId: string,
): Promise<{ renewed: true; planExpiresAt: string } | { renewed: false; reason: CommerceComplimentarySkipReason }> {
  if (LOCAL_PRO_SUNSET_ACTIVE) {
    return { renewed: false, reason: "local_pro_sunset" };
  }
  if (await isCommerceEnabled()) {
    return { renewed: false, reason: "commerce_enabled" };
  }

  const user = await findUserById(userId);
  if (!user) return { renewed: false, reason: "user_not_found" };
  if (!isCommerceComplimentaryCandidate(user)) {
    return { renewed: false, reason: "not_candidate" };
  }
  if (user.stripe_subscription_id.trim()) {
    return { renewed: false, reason: "stripe_managed" };
  }
  if (isPermanentPro(user)) {
    return { renewed: false, reason: "permanent_pro" };
  }
  if (effectivePlan(user.plan, user.plan_expires_at) === "pro") {
    return { renewed: false, reason: "not_expired" };
  }

  const planExpiresAt = computeMembershipGrantExpiry(user, "pro", COMMERCE_COMPLIMENTARY_DAYS).toISOString();
  await updateUserSubscription(userId, { plan: "pro", planExpiresAt });

  if (user.email) {
    await syncCommerceComplimentaryToIdp(userId, user.email, planExpiresAt);
  }

  return { renewed: true, planExpiresAt };
}
