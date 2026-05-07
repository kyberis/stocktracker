/**
 * Cross-subdomain UI language bridge for the trefolio ecosystem (trefolio,
 * user, will, clara, …). Non-secret; readable by JS on product origins so the
 * app language matches the IdP authorize UI.
 */
export const TREFOLIO_UI_LOCALE_COOKIE = "trefolio_ui_locale";

/** IdP authorize only honours a fixed subset (see external/accounts idp-locale). */
const IDP_SUPPORTED = new Set(["en", "de", "es", "fr", "it"]);

/**
 * Map any app language tag (e.g. `pt`, `en-GB`) to a single tag the IdP
 * understands. Unknown → `en` so we never fall back to the browser's random
 * Accept-Language when the user picked a product UI language we do not mirror
 * on the IdP.
 */
export function mapAppLanguageToIdpUiLocalesTag(lang: string | undefined | null): string {
  if (!lang?.trim()) return "en";
  const primary = lang.trim().toLowerCase().split(/[-_]/)[0];
  if (IDP_SUPPORTED.has(primary)) return primary;
  return "en";
}

/** Shared parent domain for `*.trefolio.com` / `*.trefolio-dev.com` (omit on localhost). */
export function ecosystemCookieDomainFromHost(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const h = host.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
  if (!h || h === "localhost" || h.startsWith("127.")) return undefined;
  const parts = h.split(".");
  if (parts.length < 2) return undefined;
  return `.${parts.slice(-2).join(".")}`;
}
