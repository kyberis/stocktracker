import { cookies, headers } from "next/headers";
import type { Language } from "@/lib/types";
import { isValidLanguage } from "@/lib/languages";
import { TREFOLIO_UI_LOCALE_COOKIE } from "@/lib/idp/ecosystem-ui-locale";

/** Strings for the unified-IdP redirect bridge (server-resolved locale). */
export interface IdpBridgeCopy {
  headingLogin: string;
  headingSignup: string;
  bodyLogin: string;
  bodySignup: string;
  countdown: string;
  continueNow: string;
  retry: string;
  errorTitle: string;
  idpDisabledTitle: string;
  idpDisabledBody: string;
}

async function loadLocaleModule(lang: Language): Promise<typeof import("@/locales/en").default> {
  try {
    const mod = await import(/* webpackMode: "eager" */ `@/locales/${lang}`);
    return mod.default;
  } catch {
    const mod = await import(`@/locales/en`);
    return mod.default;
  }
}

/**
 * Resolves UI strings for `/login` and `/signup` bridge pages from the
 * ecosystem locale cookie, then Accept-Language, then English.
 */
export async function getIdpBridgeCopy(): Promise<IdpBridgeCopy> {
  const jar = await cookies();
  const hdrs = await headers();
  const fromCookie = jar.get(TREFOLIO_UI_LOCALE_COOKIE)?.value?.trim().toLowerCase();
  const accept = hdrs.get("accept-language")?.split(",")[0]?.trim().split("-")[0]?.toLowerCase();
  let lang: Language = "en";
  if (fromCookie && isValidLanguage(fromCookie)) lang = fromCookie as Language;
  else if (accept && isValidLanguage(accept)) lang = accept as Language;

  const s = await loadLocaleModule(lang);
  return {
    headingLogin: s.idpUnifiedBridgeHeadingLogin,
    headingSignup: s.idpUnifiedBridgeHeadingSignup,
    bodyLogin: s.idpUnifiedBridgeBodyLogin,
    bodySignup: s.idpUnifiedBridgeBodySignup,
    countdown: s.idpUnifiedBridgeCountdown,
    continueNow: s.idpUnifiedBridgeContinue,
    retry: s.idpUnifiedBridgeRetry,
    errorTitle: s.idpUnifiedBridgeErrorTitle,
    idpDisabledTitle: s.idpUnifiedBridgeIdpDisabledTitle,
    idpDisabledBody: s.idpUnifiedBridgeIdpDisabledBody,
  };
}
