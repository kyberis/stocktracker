import { findUserById, updateUserProfile } from "@/lib/db/users";
import { fetchEntitlementsBySub } from "./client";
import { isIdpEnabled } from "./config";

/**
 * Pull canonical profile fields from the IdP entitlements payload and write
 * them to the local Turso row when they differ (IdP wins).
 */
export async function syncProfileFieldsFromIdp(userId: string): Promise<void> {
  if (!isIdpEnabled()) return;

  const user = await findUserById(userId);
  if (!user?.idp_sub) return;

  let payload;
  try {
    payload = await fetchEntitlementsBySub(user.idp_sub);
  } catch (err) {
    console.error("[idp] profile sync failed", { userId, err });
    return;
  }

  const p = payload.profile;
  if (!p) return;

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

  if (Object.keys(patch).length === 0) return;

  await updateUserProfile(userId, patch);
}
