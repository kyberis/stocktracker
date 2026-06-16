import { getIdpIssuer } from "@/lib/idp/config";
import { findUserIdByIdpSub } from "@/lib/db";

const IDP_ACCESS_PREFIX = "dev-access-";

export function isIdpOAuthAccessToken(bearer: string): boolean {
  return bearer.trim().startsWith(IDP_ACCESS_PREFIX);
}

/** Validate IdP OAuth access tokens issued by user.trefolio.com (Claude Connectors OAuth flow). */
export async function verifyIdpOAuthAccessBearer(
  bearer: string,
): Promise<{ sub: string; userId: string } | null> {
  if (!isIdpOAuthAccessToken(bearer)) return null;
  const issuer = getIdpIssuer();
  if (!issuer) return null;

  let res: Response;
  try {
    res = await fetch(`${issuer.replace(/\/+$/, "")}/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${bearer.trim()}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[idp-oauth-access-auth] userinfo fetch failed", err);
    return null;
  }

  let data: { sub?: string };
  try {
    data = (await res.json()) as { sub?: string };
  } catch {
    return null;
  }
  if (!res.ok || !data.sub) return null;

  const userId = await findUserIdByIdpSub(data.sub);
  if (!userId) return null;
  return { sub: data.sub, userId };
}
