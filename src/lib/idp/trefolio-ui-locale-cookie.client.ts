"use client";

import {
  ecosystemCookieDomainFromHost,
  mapAppLanguageToIdpUiLocalesTag,
  TREFOLIO_UI_LOCALE_COOKIE,
} from "@/lib/idp/ecosystem-ui-locale";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * Persist the in-app language for OIDC flows: same host gets the cookie
 * immediately; on production `*.trefolio.com` / `*.trefolio-dev.com` we set
 * `Domain=.…` so user.trefolio.com sees the same choice.
 */
export function setTrefolioUiLocaleCookieClient(lang: string): void {
  if (typeof document === "undefined") return;
  const value = mapAppLanguageToIdpUiLocalesTag(lang);
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const domain = ecosystemCookieDomainFromHost(typeof window !== "undefined" ? window.location.hostname : "");
  let c = `${TREFOLIO_UI_LOCALE_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  if (secure) c += "; Secure";
  if (domain) c += `; Domain=${domain}`;
  document.cookie = c;
}
