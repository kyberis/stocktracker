import { findUserById, updateUserRole } from "@/lib/db";

/**
 * Product admins on trefolio use `users.role === "admin"` in the local DB.
 * The IdP (`user.trefolio.com`) gates its own admin UI via `IDP_ADMIN_EMAILS`.
 *
 * When operators sign in with OIDC, we promote the local row to `admin` when
 * their email is on the allowlist so `/api/admin/*` and `requireAdmin` work
 * without a separate manual SQL step.
 *
 * Set **`TREFOLIO_ADMIN_EMAILS`** on the trefolio Vercel project (comma-separated).
 * If unset, **`IDP_ADMIN_EMAILS`** is used so one list can match both services.
 */
export function getTrefolioAdminEmailSet(): Set<string> {
  const primary = process.env.TREFOLIO_ADMIN_EMAILS?.trim() ?? "";
  const fallback = process.env.IDP_ADMIN_EMAILS?.trim() ?? "";
  const raw = primary || fallback;
  return new Set(
    raw
      .split(/[,;]/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isTrefolioAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getTrefolioAdminEmailSet().has(email.trim().toLowerCase());
}

/**
 * If the email is allow-listed and the user is still `user`, sets `role` to `admin`.
 * Returns whether the DB row is now admin (including already-admin).
 */
export async function ensureTrefolioAdminRoleForUser(
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  if (!isTrefolioAdminEmail(email)) return false;
  const user = await findUserById(userId);
  if (!user) return false;
  if (user.role === "admin") return true;
  await updateUserRole(userId, "admin");
  return true;
}
