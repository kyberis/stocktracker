import { NextResponse } from "next/server";
import { getExpiredSessionCookieConfig } from "@/lib/auth/session";
import { getExpiredLayoutThemeCookieConfig, THEME_MODE_STORAGE_KEY } from "@/lib/theme-preferences";

/**
 * Front-channel logout endpoint loaded as a hidden iframe by the IdP's
 * `/api/oauth2/end_session` page during single sign-out. Clears the local
 * trefolio session cookie unconditionally — there is nothing else to
 * authenticate here, the cookie itself is the credential being revoked.
 *
 * Public on purpose. Intentionally returns a tiny HTML body (not 204) so
 * browsers happily render it inside an iframe across all major engines.
 */
export const dynamic = "force-dynamic";

function handle() {
  const res = new NextResponse(
    `<!doctype html><html><body><script>try{localStorage.removeItem(${JSON.stringify(THEME_MODE_STORAGE_KEY)})}catch(e){}</script></body></html>`,
    {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-frame-options": "ALLOWALL",
    },
  });
  res.cookies.set(getExpiredSessionCookieConfig());
  res.cookies.set(getExpiredLayoutThemeCookieConfig());
  return res;
}

export const GET = handle;
export const POST = handle;
