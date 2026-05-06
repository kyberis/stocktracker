import { createHash, randomBytes } from "crypto";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { getIdpBaseUrl, getIdpClientId, getIdpClientSecret, getIdpIssuer } from "./config";

/**
 * OIDC client helpers for talking to the trefolio-accounts IdP.
 *
 * Authorization Code Flow + PKCE. ID tokens are RS256-signed by the IdP and
 * verified locally against the IdP's JWKS endpoint.
 */

/** Per-IdP-base JWKS resolver, cached at module scope. */
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let _jwksBase: string | null = null;
function getJwks() {
  const base = getIdpBaseUrl();
  if (!base) throw new Error("IDP_BASE_URL is not configured");
  if (!_jwks || _jwksBase !== base) {
    _jwks = createRemoteJWKSet(new URL(`${base}/oauth2/jwks`));
    _jwksBase = base;
  }
  return _jwks;
}

/* ── PKCE ────────────────────────────────────────────────────────────── */

export function generateCodeVerifier(): string {
  return base64url(randomBytes(32));
}

export function deriveCodeChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/* ── Authorization URL ───────────────────────────────────────────────── */

export interface AuthorizationParams {
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  scope?: string;
  /** OIDC optional space-separated end-user languages (BCP47). */
  uiLocales?: string;
  /** Hint to the IdP for analytics ("trefolio", "clara", "will"). */
  appHint?: string;
  /** Pre-fills the IdP login form. */
  loginHint?: string;
  /**
   * IdP authorize UI hint (non-standard). When `signup`, shows create-account first.
   * Also accepted as `signup=1` on the authorize URL.
   */
  screenHint?: "signup";
}

function primaryTagFromAcceptLanguage(header: string | null): string | undefined {
  if (!header) return undefined;
  const supported = new Set(["en", "de", "es", "fr", "it"]);
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    if (!tag) continue;
    const primary = tag.split(/[-_]/)[0];
    if (supported.has(primary)) return primary;
  }
  return undefined;
}

export function uiLocalesFromRequestAcceptLanguage(
  acceptLanguage: string | null,
): string | undefined {
  return primaryTagFromAcceptLanguage(acceptLanguage);
}

export function buildAuthorizationUrl(params: AuthorizationParams): string {
  const base = getIdpIssuer();
  if (!base) throw new Error("IDP_BASE_URL is not configured");

  const url = new URL(`${base}/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", getIdpClientId());
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", params.scope ?? "openid email profile entitlements");
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (params.appHint) url.searchParams.set("app_hint", params.appHint);
  if (params.loginHint) url.searchParams.set("login_hint", params.loginHint);
  if (params.screenHint === "signup") {
    url.searchParams.set("screen_hint", "signup");
  }
  if (params.uiLocales) {
    url.searchParams.set("ui_locales", params.uiLocales);
  }
  return url.toString();
}

/* ── Token exchange ──────────────────────────────────────────────────── */

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  id_token: string;
  refresh_token?: string;
  scope?: string;
}

export async function exchangeAuthorizationCode(args: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const base = getIdpBaseUrl();
  const clientId = getIdpClientId();
  const clientSecret = getIdpClientSecret();
  if (!base || !clientSecret) {
    throw new Error("IDP not configured (need IDP_BASE_URL and IDP_CLIENT_SECRET)");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: args.codeVerifier,
  });

  const res = await fetch(`${base}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`IdP token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

/* ── ID token verification ───────────────────────────────────────────── */

export interface VerifiedIdToken {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  locale?: string;
  pro_until?: string;
  entitlements: {
    trefolio_pro: boolean;
    clara_daily_limit: number;
    will_daily_limit: number;
  };
  nonce?: string;
}

export async function verifyIdToken(token: string, expectedNonce?: string): Promise<VerifiedIdToken> {
  const issuer = getIdpIssuer();
  if (!issuer) throw new Error("IDP_BASE_URL is not configured");

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer,
    audience: getIdpClientId(),
    algorithms: ["RS256"],
  });

  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new Error("nonce mismatch");
  }

  const ents = (payload as Record<string, unknown>).entitlements as VerifiedIdToken["entitlements"] | undefined;
  if (!ents || typeof ents !== "object") {
    throw new Error("ID token missing entitlements claim");
  }

  return {
    sub: String(payload.sub),
    email: String((payload as Record<string, unknown>).email ?? ""),
    email_verified: Boolean((payload as Record<string, unknown>).email_verified),
    name: (payload as Record<string, unknown>).name as string | undefined,
    locale: (payload as Record<string, unknown>).locale as string | undefined,
    pro_until: (payload as Record<string, unknown>).pro_until as string | undefined,
    entitlements: {
      trefolio_pro: Boolean(ents.trefolio_pro),
      clara_daily_limit: Number(ents.clara_daily_limit) || 30,
      will_daily_limit: Number(ents.will_daily_limit) || 30,
    },
    nonce: payload.nonce as string | undefined,
  };
}
