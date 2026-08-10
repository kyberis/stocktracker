import { NextRequest, NextResponse } from "next/server";
import {
  ensureDefaultPortfolio,
  findUserByEmail,
  findUserById,
  findUserByReferralCode,
  createUser,
  createReferral,
  acceptReferral,
  trackEvent,
  updateUserProfile,
  type DbUser,
} from "@/lib/db";
import {
  createSessionToken,
  getSessionCookieConfig,
} from "@/lib/auth/session";
import { ensureSessionSecret } from "@/lib/auth/session-secret";
import {
  authProbeLog,
  authProbeWarn,
  emailProbeHint,
  subTail,
} from "@/lib/auth/login-probe-log";
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
import { ensureTrefolioAdminRoleForUser } from "@/lib/auth/admin-allowlist";
import { enqueueProdOpsUserRegisteredEvent } from "@/lib/prodops";
import { grantCommerceComplimentaryPro } from "@/lib/commerce-complimentary-pro";

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
 *  5. Schedules an entitlement sync from the IdP (background; does not delay
 *     the redirect — `/api/auth/me` also reconciles plan lazily).
 *  6. Issues a `trefolio_session` cookie with the local user identity.
 */
export const dynamic = "force-dynamic";

const STATE_COOKIE = "trefolio_oidc_state";
const VERIFIER_COOKIE = "trefolio_oidc_verifier";
const NONCE_COOKIE = "trefolio_oidc_nonce";
const REDIRECT_COOKIE = "trefolio_oidc_redirect";
const OIDC_REFERRAL_COOKIE = "trefolio_oidc_ref";

function getCallbackUrl(req: NextRequest): string {
  const base = getRequestPublicOrigin(req);
  return `${base}/api/auth/oidc/callback`;
}

function clearFlowCookies(req: NextRequest, res: NextResponse): void {
  const secure = process.env.NODE_ENV === "production" || isRequestPublicHttps(req);
  for (const name of [STATE_COOKIE, VERIFIER_COOKIE, NONCE_COOKIE, REDIRECT_COOKIE, OIDC_REFERRAL_COOKIE]) {
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
  const inbound = req.headers;
  if (!isIdpEnabled()) {
    authProbeWarn("callback.abort", { reason: "idp_disabled" }, inbound);
    return errorRedirect(req, "OIDC is not enabled in this environment.");
  }
  ensureSessionSecret();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const idpError = url.searchParams.get("error");

  if (idpError) {
    authProbeWarn(
      "callback.idp_error_param",
      {
        error: idpError,
        errorDescription: url.searchParams.get("error_description")?.slice(0, 300),
      },
      inbound,
    );
    return errorRedirect(req, `IdP returned ${idpError}`);
  }
  if (!code || !state) {
    authProbeWarn(
      "callback.missing_params",
      { hasCode: Boolean(code), hasState: Boolean(state) },
      inbound,
    );
    return errorRedirect(req, "Missing code or state from IdP.");
  }

  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  const codeVerifier = req.cookies.get(VERIFIER_COOKIE)?.value;
  const expectedNonce = req.cookies.get(NONCE_COOKIE)?.value;
  const redirectTarget = safeRedirect(req.cookies.get(REDIRECT_COOKIE)?.value);

  if (!cookieState || !codeVerifier || cookieState !== state) {
    authProbeWarn(
      "callback.state_mismatch",
      {
        cookieStatePresent: Boolean(cookieState),
        verifierPresent: Boolean(codeVerifier),
        stateMatches: cookieState === state && Boolean(cookieState),
      },
      inbound,
    );
    return errorRedirect(req, "OIDC state mismatch. Please try again.");
  }

  authProbeLog(
    "callback.pkc_ok_begin_exchange",
    {
      redirectTo: redirectTarget,
      codeLen: code.length,
      stateLen: state.length,
      callbackHost: (() => {
        try {
          return new URL(getCallbackUrl(req)).host;
        } catch {
          return undefined;
        }
      })(),
    },
    inbound,
  );

  let tokens;
  try {
    tokens = await exchangeAuthorizationCode({
      code,
      redirectUri: getCallbackUrl(req),
      codeVerifier,
    });
  } catch (err) {
    authProbeWarn(
      "callback.token_exchange_threw",
      {
        message: err instanceof Error ? err.message.slice(0, 400) : String(err).slice(0, 400),
      },
      inbound,
    );
    console.error("[oidc] token exchange failed", err);
    return errorRedirect(req, "Could not exchange authorization code.");
  }

  let claims;
  try {
    claims = await verifyIdToken(tokens.id_token, expectedNonce);
  } catch (err) {
    authProbeWarn(
      "callback.id_token_verify_threw",
      {
        message: err instanceof Error ? err.message.slice(0, 400) : String(err).slice(0, 400),
      },
      inbound,
    );
    console.error("[oidc] id token verification failed", err);
    return errorRedirect(req, "Could not verify identity from IdP.");
  }

  authProbeLog(
    "callback.id_token_ok",
    {
      subTail: subTail(claims.sub),
      emailHint: emailProbeHint(claims.email),
      emailVerified: claims.email_verified,
      trefolioPro: claims.entitlements.trefolio_pro,
    },
    inbound,
  );

  // Resolve local user.
  let resolvePath: "by_sub" | "linked_email" | "created" = "by_sub";
  let dbUser: DbUser | null = await findLocalUserByIdpSub(claims.sub);
  let isNewSignup = false;
  if (!dbUser && claims.email) {
    resolvePath = "linked_email";
    dbUser = await findUserByEmail(claims.email);
    if (dbUser) {
      await linkLocalUserToIdpSub({ localUserId: dbUser.id, idpSub: claims.sub });
    }
  }
  if (!dbUser) {
    isNewSignup = true;
    resolvePath = "created";
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
    await grantCommerceComplimentaryPro(publicUser.id);

    // Referral capture: the code survives the redirect to the IdP as a
    // short-lived cookie set by /api/auth/oidc/signup-start (query params
    // don't round-trip through the IdP's own authorize/callback hop).
    // The IdP has already verified this email as part of its own signup
    // flow, so accept immediately rather than waiting on a local
    // verify-email click that will never happen for OIDC users — the
    // legacy local-password path still relies on that click via
    // /api/auth/verify-email.
    const refCode = req.cookies.get(OIDC_REFERRAL_COOKIE)?.value || "";
    if (refCode) {
      const referrer = await findUserByReferralCode(refCode);
      if (referrer && referrer.id !== publicUser.id) {
        try {
          await createReferral(referrer.id, publicUser.id);
          trackEvent(publicUser.id, "referral_signup", { referrerId: referrer.id, method: "oidc" });
          if (claims.email_verified) {
            await acceptReferral(publicUser.id);
          }
        } catch (err) {
          console.error("[oidc] referral capture failed", err);
        }
      }
    }

    dbUser = (await findLocalUserByIdpSub(claims.sub)) as DbUser;
    if (!dbUser) {
      authProbeWarn(
        "callback.provision_failed_after_create",
        { subTail: subTail(claims.sub), resolvePathAttempted: resolvePath },
        inbound,
      );
      return errorRedirect(req, "Could not provision local account.");
    }
    const normalizedEmail = (claims.email || "").toLowerCase();
    sendWelcomeEmail(
      normalizedEmail,
      claims.name || "",
      getEmailLocale(claims.locale || "en"),
      publicUser.id,
    ).catch((err) => console.error("[oidc] welcome email failed", err));
    await enqueueProdOpsUserRegisteredEvent({
      userId: publicUser.id,
      method: "oidc",
    });
    // Admin "new user" email is sent once from user.trefolio.com (IdP) on createUser — not here.
  }

  // Sync entitlements in the background — never block the redirect on IdP
  // latency or outages; /api/auth/me also runs lazyIdpEntitlementSync.
  void syncEntitlementsForUser(dbUser.id).catch((err) =>
    console.error("[oidc] sync entitlements failed", err),
  );

  try {
    const patch: Parameters<typeof updateUserProfile>[1] = {};
    if (claims.name !== undefined) patch.displayName = claims.name;
    if (claims.picture !== undefined && claims.picture !== null) patch.avatarUrl = claims.picture;
    if (claims.picture === "") patch.avatarUrl = "";
    if (claims.tax_residency !== undefined && claims.tax_residency !== null)
      patch.taxResidency = claims.tax_residency;
    if (claims.tax_residency === "") patch.taxResidency = "";
    if (Object.keys(patch).length > 0) {
      await updateUserProfile(dbUser.id, patch);
    }
  } catch (err) {
    console.error("[oidc] profile fields sync failed", err);
  }

  await ensureTrefolioAdminRoleForUser(dbUser.id, claims.email || dbUser.email);
  const finalUser = (await findUserById(dbUser.id)) ?? dbUser;

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

  authProbeLog(
    "callback.done_redirect",
    {
      resolvePath,
      isNewSignup,
      localUserId: finalUser.id,
      subTail: subTail(claims.sub),
      redirectTo: redirectTarget,
    },
    inbound,
  );

  const response = NextResponse.redirect(
    new URL(redirectTarget, getRequestPublicOrigin(req)),
  );
  response.cookies.set(getSessionCookieConfig(sessionToken));
  clearFlowCookies(req, response);
  return response;
}
