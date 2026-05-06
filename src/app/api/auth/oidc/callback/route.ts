import { NextRequest, NextResponse } from "next/server";
import {
  ensureDefaultPortfolio,
  findUserByEmail,
  createUser,
  trackEvent,
  type DbUser,
} from "@/lib/db";
import {
  createSessionToken,
  getSessionCookieConfig,
} from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import { authEventsTotal } from "@/lib/metrics";
import {
  exchangeAuthorizationCode,
  verifyIdToken,
} from "@/lib/idp/oidc";
import {
  findLocalUserByIdpSub,
  linkLocalUserToIdpSub,
  syncEntitlementsForUser,
} from "@/lib/idp/entitlements";
import { isIdpEnabled } from "@/lib/idp/config";
import { sendWelcomeEmail, getEmailLocale } from "@/lib/email";
import {
  getRequestPublicOrigin,
  isRequestPublicHttps,
} from "@/lib/http/request-public-origin";

/**
 * GET /api/auth/oidc/callback
 *
 * Final leg of the OIDC Authorization Code + PKCE flow with the
 * trefolio-accounts IdP at user.trefolio.com. Inert when IDP_BASE_URL is not
 * configured.
 *
 * Behaviour:
 *  1. Validates `state` against the cookie set by /api/auth/oidc/start.
 *  2. Exchanges the `code` for tokens (sends `code_verifier`).
 *  3. Verifies the ID token (issuer, audience, signature, nonce).
 *  4. Resolves a local user:
 *       a. By `idp_sub` if already linked.
 *       b. By email otherwise (links the existing account).
 *       c. Creates a brand-new local user if neither match.
 *  5. Syncs entitlements (pro/free, plan_expires_at) from the ID token.
 *  6. Issues a `trefolio_session` cookie with the local user identity.
 */
export const dynamic = "force-dynamic";

const STATE_COOKIE = "trefolio_oidc_state";
const VERIFIER_COOKIE = "trefolio_oidc_verifier";
const NONCE_COOKIE = "trefolio_oidc_nonce";
const REDIRECT_COOKIE = "trefolio_oidc_redirect";

function getCallbackUrl(req: NextRequest): string {
  const base = getRequestPublicOrigin(req);
  return `${base}/api/auth/oidc/callback`;
}

function clearFlowCookies(req: NextRequest, res: NextResponse): void {
  const secure = process.env.NODE_ENV === "production" || isRequestPublicHttps(req);
  for (const name of [STATE_COOKIE, VERIFIER_COOKIE, NONCE_COOKIE, REDIRECT_COOKIE]) {
    res.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });
  }
}

function errorRedirect(req: NextRequest, message: string): NextResponse {
  const base = getRequestPublicOrigin(req);
  const url = new URL("/login", base);
  url.searchParams.set("error", message);
  const res = NextResponse.redirect(url);
  clearFlowCookies(req, res);
  return res;
}

function safeRedirect(input: string | undefined): string {
  if (!input) return "/";
  if (!input.startsWith("/") || input.startsWith("//")) return "/";
  return input;
}

export async function GET(req: NextRequest) {
  if (!isIdpEnabled()) {
    return errorRedirect(req, "OIDC is not enabled in this environment.");
  }
  ensureSessionSecret();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const idpError = url.searchParams.get("error");

  if (idpError) {
    return errorRedirect(req, `IdP returned ${idpError}`);
  }
  if (!code || !state) {
    return errorRedirect(req, "Missing code or state from IdP.");
  }

  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  const codeVerifier = req.cookies.get(VERIFIER_COOKIE)?.value;
  const expectedNonce = req.cookies.get(NONCE_COOKIE)?.value;
  const redirectTarget = safeRedirect(req.cookies.get(REDIRECT_COOKIE)?.value);

  if (!cookieState || !codeVerifier || cookieState !== state) {
    return errorRedirect(req, "OIDC state mismatch. Please try again.");
  }

  let tokens;
  try {
    tokens = await exchangeAuthorizationCode({
      code,
      redirectUri: getCallbackUrl(req),
      codeVerifier,
    });
  } catch (err) {
    console.error("[oidc] token exchange failed", err);
    return errorRedirect(req, "Could not exchange authorization code.");
  }

  let claims;
  try {
    claims = await verifyIdToken(tokens.id_token, expectedNonce);
  } catch (err) {
    console.error("[oidc] id token verification failed", err);
    return errorRedirect(req, "Could not verify identity from IdP.");
  }

  // Resolve local user.
  let dbUser: DbUser | null = await findLocalUserByIdpSub(claims.sub);
  let isNewSignup = false;
  if (!dbUser && claims.email) {
    dbUser = await findUserByEmail(claims.email);
    if (dbUser) {
      await linkLocalUserToIdpSub({ localUserId: dbUser.id, idpSub: claims.sub });
    }
  }
  if (!dbUser) {
    isNewSignup = true;
    const username = (claims.email || `user-${claims.sub}`)
      .split("@")[0]
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 30) || "user";
    const publicUser = await createUser({
      username,
      passwordHash: "",
      email: (claims.email || "").toLowerCase(),
      displayName: claims.name || "",
      authProvider: "credentials",
      emailVerified: claims.email_verified,
      seedWithData: false,
    });
    await ensureDefaultPortfolio(publicUser.id);
    await linkLocalUserToIdpSub({ localUserId: publicUser.id, idpSub: claims.sub });
    dbUser = (await findLocalUserByIdpSub(claims.sub)) as DbUser;
    if (!dbUser) {
      return errorRedirect(req, "Could not provision local account.");
    }
    sendWelcomeEmail(
      (claims.email || "").toLowerCase(),
      claims.name || "",
      getEmailLocale(claims.locale || "en"),
      publicUser.id,
    ).catch((err) => console.error("[oidc] welcome email failed", err));
  }

  // Sync entitlements from the IdP into local users.plan / plan_expires_at.
  await syncEntitlementsForUser(dbUser.id).catch((err) =>
    console.error("[oidc] sync entitlements failed", err),
  );

  // Re-read the user after entitlement sync so the session payload reflects
  // current plan (the writes above bumped it).
  const refreshed = await findLocalUserByIdpSub(claims.sub);
  const finalUser = refreshed ?? dbUser;

  const sessionToken = await createSessionToken({
    userId: finalUser.id,
    username: finalUser.username,
    email: finalUser.email,
    role: finalUser.role,
    mustChangePassword: false,
    plan: finalUser.plan,
    emailVerified: finalUser.email_verified === 1 || claims.email_verified,
    onboardingCompleted: finalUser.onboarding_completed === 1,
  });

  trackEvent(finalUser.id, isNewSignup ? "signup" : "login", { method: "oidc" });
  authEventsTotal.inc({ event: isNewSignup ? "signup" : "login_success" });

  const response = NextResponse.redirect(
    new URL(redirectTarget, getRequestPublicOrigin(req)),
  );
  response.cookies.set(getSessionCookieConfig(sessionToken));
  clearFlowCookies(req, response);
  return response;
}
