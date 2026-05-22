import { NextRequest, NextResponse } from "next/server";
import { getExpiredSessionCookieConfig } from "@/lib/auth/session";
import { getExpiredLayoutThemeCookieConfig } from "@/lib/theme-preferences";
import { withMetrics } from "@/lib/with-metrics";
import { authEventsTotal } from "@/lib/metrics";
import { getIdpClientId, getIdpIssuer } from "@/lib/idp/config";
import { getRequestPublicOrigin } from "@/lib/http/request-public-origin";

/**
 * Clears the local trefolio session and, when the IdP is configured,
 * returns its `/api/oauth2/end_session` URL so the client can navigate
 * there. The IdP page in turn fires hidden iframes against every
 * registered client's `/api/auth/idp-logout`, achieving single sign-out
 * across trefolio, Clara, and Will in one click.
 *
 * Response shape: `{ ok: true, next: string }`. `next` is either the IdP
 * end-session URL (preferred) or the local origin (fallback when the IdP
 * is not configured).
 */
export const POST = withMetrics("/api/auth/logout", async (req: NextRequest) => {
  authEventsTotal.inc({ event: "logout" });

  const origin = getRequestPublicOrigin(req);
  const idpPublic = getIdpIssuer();
  let next = origin;
  if (idpPublic) {
    const u = new URL(`${idpPublic}/api/oauth2/end_session`);
    u.searchParams.set("client_id", getIdpClientId());
    u.searchParams.set("post_logout_redirect_uri", `${origin}/`);
    next = u.toString();
  }

  const response = NextResponse.json({ ok: true, next });
  response.cookies.set(getExpiredSessionCookieConfig());
  response.cookies.set(getExpiredLayoutThemeCookieConfig());
  return response;
});
