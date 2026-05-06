/**
 * Trefolio Identity Provider (IdP) configuration.
 *
 * The IdP at `user.trefolio.com` (codename `trefolio-accounts`) owns
 * authentication, Stripe, and entitlements across trefolio, Clara, and Will.
 *
 * Trefolio integrates as an OIDC client. All IdP behaviour is gated by env
 * vars so the local auth path keeps working until cutover.
 *
 * See knowledge/design-docs/unified-accounts-and-billing.md.
 */

/** Production fallback when `IDP_BASE_URL` is not set on a deployed env. */
const PROD_IDP_BASE_URL = "https://user.trefolio.com";

/**
 * Base URL of the IdP. Resolution order:
 *   1. `IDP_BASE_URL` env var (works in any environment, set in
 *      `.env.local` for dev, in Vercel project settings for prod).
 *   2. In production builds (`NODE_ENV=production`), fall back to
 *      `https://user.trefolio.com` so trefolio is never inadvertently
 *      shipped with IdP disabled because someone forgot the env var.
 *   3. Otherwise return null — IdP code paths must be inert in dev
 *      until the operator opts in.
 */
export function getIdpBaseUrl(): string | null {
  const v = process.env.IDP_BASE_URL?.trim();
  if (v) return v.replace(/\/+$/g, "");
  if (process.env.NODE_ENV === "production") return PROD_IDP_BASE_URL;
  return null;
}

/**
 * OIDC issuer identifier and browser-facing IdP origin (authorize, end_session,
 * billing links). Matches JWT claim `iss` from the IdP.
 *
 * When **`IDP_ISSUER`** is set (recommended for `*.trefolio-dev.com` + loopback
 * `IDP_BASE_URL`), user-visible redirects use HTTPS while {@link getIdpBaseUrl}
 * stays on `http://localhost:3300` for token/JWKS HTTP calls without trusting
 * Caddy's CA.
 */
export function getIdpIssuer(): string | null {
  const api = getIdpBaseUrl();
  const iss = process.env.IDP_ISSUER?.trim().replace(/\/+$/g, "");
  if (iss) return iss;
  return api;
}

/** OAuth client_id assigned to trefolio in the IdP's static client registry. */
export function getIdpClientId(): string {
  return process.env.IDP_CLIENT_ID || "trefolio";
}

/** OAuth client_secret. Never leaks to the browser. */
export function getIdpClientSecret(): string | null {
  return process.env.IDP_CLIENT_SECRET || null;
}

/** Service token used for /v1/* REST calls (entitlements, telegram). */
export function getIdpServiceToken(): string | null {
  return process.env.IDP_SERVICE_TOKEN || null;
}

/**
 * When `true`, the local password / Google / Apple / Passkey routes are still
 * accepted alongside the IdP. Default `true` until the cutover plan completes.
 * After cutover, set to `false` and the legacy routes return 410 Gone.
 */
export function useLegacyAuth(): boolean {
  return process.env.USE_LEGACY_AUTH !== "false";
}

/**
 * When `true`, the in-app upgrade buttons redirect to
 * `user.trefolio.com/upgrade?from=trefolio` instead of opening local Stripe
 * checkout. Default `false` until the IdP is live and accepting traffic.
 */
export function billingRedirectToIdp(): boolean {
  return process.env.BILLING_REDIRECT_TO_IDP === "true";
}

/** Returns true when the IdP is configured well enough to call. */
export function isIdpEnabled(): boolean {
  return Boolean(getIdpBaseUrl() && getIdpClientId() && getIdpClientSecret());
}

/**
 * Cutover safety switch. When `true`, the legacy auth routes (signup with
 * password, Google/Apple OAuth, passkey enrol) refuse to create a new local
 * `users` row and return HTTP 503 with a localized "maintenance" message.
 *
 * The OIDC callback ([src/app/api/auth/oidc/callback/route.ts]) is exempt so
 * the migration script can still create local rows on first IdP login.
 *
 * Used for the Phase 6 cutover window — see
 * `knowledge/exec-plans/active/unified-accounts.md` and
 * `knowledge/runbooks/unified-accounts-cutover.md`.
 */
export function freezeLocalUserWrites(): boolean {
  return process.env.FREEZE_LOCAL_USER_WRITES === "true";
}
