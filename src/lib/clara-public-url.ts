/**
 * Browser-safe Clara origin. Never expose server-only `CLARA_BASE_URL`.
 * Override with `NEXT_PUBLIC_CLARA_URL` for local sister-app testing.
 */
const DEFAULT_CLARA_PUBLIC_URL = "https://clara.trefolio.com";

export function getClaraPublicUrl(): string {
  const raw = process.env.NEXT_PUBLIC_CLARA_URL?.trim();
  const base = raw && raw.length > 0 ? raw : DEFAULT_CLARA_PUBLIC_URL;
  return base.replace(/\/+$/, "");
}

/** Chat surface after SSO / when already linked. */
export function getClaraAppUrl(): string {
  return `${getClaraPublicUrl()}/app`;
}

/** Login bridge — lazy-creates Clara local user via IdP SSO. */
export function getClaraLoginUrl(): string {
  return `${getClaraPublicUrl()}/login`;
}
