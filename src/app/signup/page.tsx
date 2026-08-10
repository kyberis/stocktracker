import { cookies } from "next/headers";
import { ThemeProvider } from "@/lib/theme-context";
import { IdpRedirectBridge } from "@/components/auth/IdpRedirectBridge";
import { getIdpBridgeCopy } from "@/lib/idp/bridge-copy";
import { isIdpEnabled } from "@/lib/idp/config";
import { REFERRAL_CODE_COOKIE } from "@/lib/attribution";
import {
  mapAppLanguageToIdpUiLocalesTag,
  TREFOLIO_UI_LOCALE_COOKIE,
} from "@/lib/idp/ecosystem-ui-locale";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[]; ref?: string | string[] }>;
}) {
  const copy = await getIdpBridgeCopy();
  const sp = await searchParams;

  if (!isIdpEnabled()) {
    return (
      <ThemeProvider>
        <IdpRedirectBridge
          variant="signup"
          targetHref="/landing"
          copy={copy}
          idpDisabled
        />
      </ThemeProvider>
    );
  }

  const qs = new URLSearchParams();
  qs.set("redirect", "/onboarding");
  const raw = sp.email;
  const email = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (email) qs.set("email", email);
  const jar = await cookies();
  const ui = jar.get(TREFOLIO_UI_LOCALE_COOKIE)?.value;
  if (ui?.trim()) qs.set("ui_locales", mapAppLanguageToIdpUiLocalesTag(ui));

  // Forward a referral code so /api/auth/oidc/signup-start can stash it in a
  // cookie the OIDC callback reads back after the IdP round trip — either
  // straight off ?ref= (direct referral link) or the cookie already set by
  // captureReferralCode() if the user passed through /landing first.
  const rawRef = sp.ref;
  const refFromQuery = typeof rawRef === "string" ? rawRef : Array.isArray(rawRef) ? rawRef[0] : undefined;
  const refCode = (refFromQuery || jar.get(REFERRAL_CODE_COOKIE)?.value || "").trim();
  if (refCode && refCode.length <= 16) qs.set("ref", refCode);

  const targetHref = `/api/auth/oidc/signup-start?${qs.toString()}`;

  return (
    <ThemeProvider>
      <IdpRedirectBridge variant="signup" targetHref={targetHref} copy={copy} />
    </ThemeProvider>
  );
}
