import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SignupPageClient from "./signup-page-client";
import { isIdpEnabled, legacyAuthEnabled } from "@/lib/idp/config";
import {
  mapAppLanguageToIdpUiLocalesTag,
  TREFOLIO_UI_LOCALE_COOKIE,
} from "@/lib/idp/ecosystem-ui-locale";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const sp = await searchParams;
  if (isIdpEnabled() && !legacyAuthEnabled()) {
    const qs = new URLSearchParams();
    qs.set("redirect", "/onboarding");
    const raw = sp.email;
    const email = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (email) qs.set("email", email);
    const jar = await cookies();
    const ui = jar.get(TREFOLIO_UI_LOCALE_COOKIE)?.value;
    if (ui?.trim()) qs.set("ui_locales", mapAppLanguageToIdpUiLocalesTag(ui));
    redirect(`/api/auth/oidc/signup-start?${qs.toString()}`);
  }

  return <SignupPageClient />;
}
