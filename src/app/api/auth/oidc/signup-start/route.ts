import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthorizationUrl, deriveCodeChallenge, generateCodeVerifier } from "@/lib/idp/oidc";
import { resolveUiLocalesForIdpRequest } from "@/lib/idp/resolve-ui-locales-for-idp";
import { isIdpEnabled } from "@/lib/idp/config";
import {
  getRequestPublicOrigin,
  isRequestPublicHttps,
} from "@/lib/http/request-public-origin";

/**
 * GET /api/auth/oidc/signup-start?redirect=/onboarding
 *
 * Same as `/api/auth/oidc/start` but adds `screen_hint=signup` so the IdP
 * authorize page opens in "create account" mode.
 */
export const dynamic = "force-dynamic";

const STATE_COOKIE = "trefolio_oidc_state";
const VERIFIER_COOKIE = "trefolio_oidc_verifier";
const NONCE_COOKIE = "trefolio_oidc_nonce";
const REDIRECT_COOKIE = "trefolio_oidc_redirect";
const FLOW_COOKIE_TTL = 60 * 10;

function getCallbackUrl(req: NextRequest): string {
  const base = getRequestPublicOrigin(req);
  return `${base}/api/auth/oidc/callback`;
}

function safeRedirect(input: string | null): string {
  if (!input) return "/onboarding";
  if (!input.startsWith("/") || input.startsWith("//")) return "/onboarding";
  return input;
}

export async function GET(req: NextRequest) {
  if (!isIdpEnabled()) {
    return NextResponse.json(
      { error: "idp_not_configured", message: "OIDC is not enabled in this environment." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const redirectTarget = safeRedirect(url.searchParams.get("redirect"));
  const loginHint = url.searchParams.get("email") || undefined;

  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");
  const verifier = generateCodeVerifier();
  const challenge = deriveCodeChallenge(verifier);

  const authorizationUrl = buildAuthorizationUrl({
    redirectUri: getCallbackUrl(req),
    state,
    nonce,
    codeChallenge: challenge,
    appHint: "trefolio",
    loginHint,
    screenHint: "signup",
    uiLocales: resolveUiLocalesForIdpRequest(req),
  });

  const response = NextResponse.redirect(authorizationUrl);
  const cookieBase = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" || isRequestPublicHttps(req),
    path: "/",
    maxAge: FLOW_COOKIE_TTL,
  };
  response.cookies.set({ ...cookieBase, name: STATE_COOKIE, value: state });
  response.cookies.set({ ...cookieBase, name: VERIFIER_COOKIE, value: verifier });
  response.cookies.set({ ...cookieBase, name: NONCE_COOKIE, value: nonce });
  response.cookies.set({ ...cookieBase, name: REDIRECT_COOKIE, value: redirectTarget });
  return response;
}
