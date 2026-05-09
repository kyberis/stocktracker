import { cookies } from "next/headers";
import { ThemeProvider } from "@/lib/theme-context";
import { IdpRedirectBridge } from "@/components/auth/IdpRedirectBridge";
import { getIdpBridgeCopy } from "@/lib/idp/bridge-copy";
import { isIdpEnabled } from "@/lib/idp/config";
import {
  mapAppLanguageToIdpUiLocalesTag,
  TREFOLIO_UI_LOCALE_COOKIE,
} from "@/lib/idp/ecosystem-ui-locale";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
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
  const targetHref = `/api/auth/oidc/signup-start?${qs.toString()}`;

  return (
    <ThemeProvider>
      <IdpRedirectBridge variant="signup" targetHref={targetHref} copy={copy} />
    </ThemeProvider>
  );
}
