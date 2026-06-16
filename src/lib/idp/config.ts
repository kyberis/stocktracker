/**
 * Trefolio Identity Provider (IdP) configuration.
 *
 * The IdP at `user.trefolio.com` (codename `trefolio-accounts`) owns
 * authentication, Stripe, and entitlements across trefolio, Clara, and Will.
 *
 * Trefolio integrates as an OIDC client. All IdP behaviour is gated by env
 * vars so local development can run without an IdP until you opt in.
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

/** Stripe Billing Portal on the IdP (requires IdP session cookie on that origin). */
export function getIdpBillingPortalUrl(): string | null {
  const issuer = getIdpIssuer();
  if (!issuer) return null;
  return `${issuer.replace(/\/+$/, "")}/api/billing/portal`;
}

/**
 * Hosted Pro upgrade page on the IdP (`/upgrade` → Stripe Checkout there).
 */
export function resolveIdpUpgradeHref(opts?: {
  interval?: "monthly" | "annual";
  feature?: string;
}): string {
  const issuer = getIdpIssuer();
  if (!issuer) {
    const local = new URL("/upgrade", "http://local");
    if (opts?.feature) local.searchParams.set("feature", opts.feature);
    return `${local.pathname}${local.search}`;
  }
  const u = new URL(`${issuer.replace(/\/+$/, "")}/upgrade`);
  u.searchParams.set("from", "trefolio");
  if (opts?.interval) u.searchParams.set("interval", opts.interval);
  if (opts?.feature) u.searchParams.set("feature", opts.feature);
  return u.toString();
}

/**
 * Customer portal URL on the IdP. Falls back to legacy local handler only when
 * no issuer is configured (dev without IdP).
 */
export function resolveBillingPortalHref(): string {
  const idp = getIdpBillingPortalUrl();
  if (idp) return `${idp}?from=trefolio`;
  return "/api/billing/portal";
}

/**
 * When `true`, trial invitation and admin membership-grant emails use
 * `user.trefolio.com` for claim/activate links, and trefolio re-exports those
 * URLs from cron/admin instead of hosting `/trial/activate` locally.
 *
 * Requires IdP session on claim pages. Cron syncs `trial_token` to the IdP via
 * service token (`syncTrialTokenToIdp`).
 */
export function grantsAndTrialsRedirectToIdp(): boolean {
  return process.env.GRANTS_AND_TRIALS_REDIRECT_TO_IDP === "true";
}

/** Absolute activate URL on the IdP issuer, or null to keep product-hosted pages. */
export function resolveIdpTrialActivateUrl(token: string): string | null {
  if (!grantsAndTrialsRedirectToIdp()) return null;
  const issuer = getIdpIssuer();
  if (!issuer) return null;
  const base = issuer.replace(/\/+$/, "");
  return `${base}/trial/activate?token=${encodeURIComponent(token)}&utm_source=email&utm_medium=transactional&utm_campaign=trial_invitation`;
}

export function resolveIdpMembershipGrantActivateUrl(token: string): string | null {
  if (!grantsAndTrialsRedirectToIdp()) return null;
  const issuer = getIdpIssuer();
  if (!issuer) return null;
  const base = issuer.replace(/\/+$/, "");
  return `${base}/membership-grant/activate?token=${encodeURIComponent(token)}&utm_source=email&utm_medium=transactional&utm_campaign=membership_grant_invitation`;
}

/** Returns true when the IdP is configured well enough to call. */
export function isIdpEnabled(): boolean {
  return Boolean(getIdpBaseUrl() && getIdpClientId() && getIdpClientSecret());
}

/**
 * When `true`, treat local product-hosted signup/password/passkey flows as the
 * primary identity surface (no unified `/account` hub). Defaults to the inverse
 * of {@link isIdpEnabled}: once the OIDC client is configured, legacy flows are
 * off unless an operator sets `LEGACY_AUTH_FORCE=true` for rollback drills.
 */
export function legacyAuthEnabled(): boolean {
  if (process.env.LEGACY_AUTH_FORCE === "true") return true;
  return !isIdpEnabled();
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

/**
 * Unified account hub on the IdP (`/account`). Requires IdP session cookie on
 * `user.*` to edit profile; opens in same browser after OIDC sign-in elsewhere.
 */
export function resolveIdpAccountHref(opts?: { from?: "trefolio" | "clara" | "will" }): string | null {
  const issuer = getIdpIssuer();
  if (!issuer) return null;
  const u = new URL(`${issuer.replace(/\/+$/, "")}/account`);
  u.searchParams.set("from", opts?.from ?? "trefolio");
  return u.toString();
}

/**
 * PAT mint/revoke UI on the IdP (`/account/developer`). Same browser session as
 * OIDC sign-in can create `tfp_pat_…` tokens for MCP across the ecosystem.
 */
export function resolveIdpDeveloperHref(opts?: { from?: "trefolio" | "clara" | "will" }): string | null {
  const issuer = getIdpIssuer();
  if (!issuer) return null;
  const u = new URL(`${issuer.replace(/\/+$/, "")}/account/developer`);
  u.searchParams.set("from", opts?.from ?? "trefolio");
  return u.toString();
}
