import { findUserByEmail, findUserIdByIdpSub } from "@/lib/db";
import { linkLocalUserToIdpSub } from "@/lib/idp/entitlements";

export interface ClaraWarrenUserLookup {
  sub?: string;
  email?: string;
}

/**
 * Resolve the local trefolio user Clara is consulting Warren for.
 * Prefer IdP `sub`, fall back to email, optionally backfill `idp_sub`.
 */
export async function resolveClaraWarrenUser(
  lookup: ClaraWarrenUserLookup,
): Promise<string | null> {
  const sub = lookup.sub?.trim();
  const email = lookup.email?.trim().toLowerCase();

  if (sub) {
    const bySub = await findUserIdByIdpSub(sub);
    if (bySub) return bySub;
  }

  if (!email) return null;

  const byEmail = await findUserByEmail(email);
  if (!byEmail) return null;

  if (sub && !byEmail.idp_sub?.trim()) {
    await linkLocalUserToIdpSub({ localUserId: byEmail.id, idpSub: sub });
  }

  return byEmail.id;
}

export function trefolioPublicSignupUrl(): string {
  const base =
    process.env.APP_BASE_URL?.trim().replace(/\/+$/g, "") || "https://trefolio.com";
  return `${base}/signup`;
}
