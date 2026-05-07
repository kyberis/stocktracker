import type { NextRequest } from "next/server";

import {
  mapAppLanguageToIdpUiLocalesTag,
  TREFOLIO_UI_LOCALE_COOKIE,
} from "@/lib/idp/ecosystem-ui-locale";
import { uiLocalesFromRequestAcceptLanguage } from "@/lib/idp/oidc";

/**
 * Single tag for OIDC `ui_locales` on the IdP. Order: explicit query (rare) →
 * ecosystem cookie (product UI / prior IdP choice) → Accept-Language.
 */
export function resolveUiLocalesForIdpRequest(req: NextRequest): string | undefined {
  const fromQuery = req.nextUrl.searchParams.get("ui_locales");
  if (fromQuery?.trim()) {
    return mapAppLanguageToIdpUiLocalesTag(fromQuery);
  }
  const fromCookie = req.cookies.get(TREFOLIO_UI_LOCALE_COOKIE)?.value;
  if (fromCookie?.trim()) {
    return mapAppLanguageToIdpUiLocalesTag(fromCookie);
  }
  return uiLocalesFromRequestAcceptLanguage(req.headers.get("accept-language"));
}
