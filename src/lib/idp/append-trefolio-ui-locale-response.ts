import type { NextRequest, NextResponse } from "next/server";

import {
  ecosystemCookieDomainFromHost,
  mapAppLanguageToIdpUiLocalesTag,
  TREFOLIO_UI_LOCALE_COOKIE,
} from "@/lib/idp/ecosystem-ui-locale";

const TTL = 60 * 60 * 24 * 400;

export function setTrefolioUiLocaleCookieOnNextResponse(
  req: NextRequest,
  res: NextResponse,
  appLanguage: string,
): void {
  const value = mapAppLanguageToIdpUiLocalesTag(appLanguage);
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || req.headers.get("host") || "";
  const domain = ecosystemCookieDomainFromHost(host);
  res.cookies.set(TREFOLIO_UI_LOCALE_COOKIE, value, {
    path: "/",
    maxAge: TTL,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    ...(domain ? { domain } : {}),
  });
}
