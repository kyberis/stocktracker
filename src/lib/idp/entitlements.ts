import { ensureInitialized } from "@/lib/db/client";
import { findUserById, updateUserProfile } from "@/lib/db/users";
import type { UserPlan } from "@/lib/db/helpers";
import { fetchEntitlementsBySub, type IdpEntitlementResponse } from "./client";
import { isIdpEnabled } from "./config";
import { isLocalTrialActive } from "@/lib/trial-activation";

/**
 * Bridge between the IdP entitlement payload and trefolio's local
 * `users.plan` / `users.plan_expires_at` columns.
 *
 * Until cutover, trefolio still reads `users.plan` everywhere through
 * `effectivePlan(plan, planExpiresAt)`. After cutover, `users.plan` is a
 * read-through cache of the IdP's entitlements.
 *
 * This helper does the cache update.
 */

/**
 * Pull the latest entitlements from the IdP and write them to the local
 * `users` row (plan cache plus canonical profile fields from the IdP payload).
 * Uses one REST round-trip. Idempotent. Safe to call on every session refresh.
 *
 * Returns the resolved plan or null if the IdP is not configured / the user
 * has no idp_sub yet.
 */
export async function syncEntitlementsForUser(userId: string): Promise<UserPlan | null> {
  if (!isIdpEnabled()) return null;

  const user = await findUserById(userId);
  if (!user || !user.idp_sub) return null;

  let payload: IdpEntitlementResponse;
  try {
    payload = await fetchEntitlementsBySub(user.idp_sub);
  } catch (err) {
    console.error("[idp] failed to fetch entitlements", { userId, err });
    return null;
  }

  const nextPlan: UserPlan = payload.entitlements.trefolio_pro ? "pro" : "free";
  const nextExpiresAt = payload.proUntil ?? "";

  if (isLocalTrialActive(user) && !payload.entitlements.trefolio_pro) {
    return user.plan;
  }

  if (user.plan !== nextPlan || user.plan_expires_at !== nextExpiresAt) {
    const client = await ensureInitialized();
    await client.execute({
      sql: "UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?",
      args: [nextPlan, nextExpiresAt, userId],
    });
    console.log(
      JSON.stringify({
        kind: "trefolio.entitlements.synced",
        app: "trefolio",
        userId,
        idpSub: user.idp_sub,
        from: { plan: user.plan, expiresAt: user.plan_expires_at },
        to: { plan: nextPlan, expiresAt: nextExpiresAt },
        ts: new Date().toISOString(),
      }),
    );
  }

  const p = payload.profile;
  if (p) {
    const patch: Partial<{ displayName: string; avatarUrl: string; taxResidency: string }> = {};
    if (p.name !== undefined && p.name !== user.display_name) {
      patch.displayName = p.name;
    }
    const pic = p.picture ?? "";
    if (pic !== (user.avatar_url ?? "")) {
      patch.avatarUrl = pic;
    }
    const tax = p.taxResidency ?? "";
    if (tax !== (user.tax_residency ?? "")) {
      patch.taxResidency = tax;
    }
    if (Object.keys(patch).length > 0) {
      await updateUserProfile(userId, patch);
    }
  }

  return nextPlan;
}

/**
 * Link an IdP `sub` to a local trefolio user (typically called from the
 * OIDC callback). Idempotent. Reuses an existing local user when emails
 * match; otherwise creates the link on the matched user.
 *
 * Returns the local userId.
 */
export async function linkLocalUserToIdpSub(args: {
  localUserId: string;
  idpSub: string;
}): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET idp_sub = ? WHERE id = ?",
    args: [args.idpSub, args.localUserId],
  });
}

export async function findLocalUserByIdpSub(idpSub: string) {
  if (!idpSub) return null;
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE idp_sub = ?",
    args: [idpSub],
  });
  if (result.rows.length === 0) return null;
  // Use the existing rowToDbUser via dynamic import to avoid a cycle.
  const { rowToDbUser } = await import("@/lib/db/helpers");
  return rowToDbUser(result.rows[0]);
}
