import { ThemeProvider } from "@/lib/theme-context";
import { IdpRedirectBridge } from "@/components/auth/IdpRedirectBridge";
import AccountDeletedBeacon from "@/components/auth/AccountDeletedBeacon";
import { getIdpBridgeCopy } from "@/lib/idp/bridge-copy";
import { isIdpEnabled } from "@/lib/idp/config";

interface LoginPageProps {
  searchParams?: {
    redirect?: string | string[];
    error?: string | string[];
    email?: string | string[];
    ui_locales?: string | string[];
    account_deleted?: string | string[];
  };
}

function oidcStartWithQuery(searchParams: LoginPageProps["searchParams"]): string {
  const qs = new URLSearchParams();
  const rawRedirect = searchParams?.redirect;
  const redirectTarget = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;
  if (redirectTarget && redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")) {
    qs.set("redirect", redirectTarget);
  }
  const rawEmail = searchParams?.email;
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
  if (email) qs.set("email", email);
  const rawUi = searchParams?.ui_locales;
  const uiLocales = Array.isArray(rawUi) ? rawUi[0] : rawUi;
  if (uiLocales?.trim()) qs.set("ui_locales", uiLocales.trim());
  const q = qs.toString();
  return q ? `/api/auth/oidc/start?${q}` : "/api/auth/oidc/start";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const copy = await getIdpBridgeCopy();
  const errRaw = searchParams?.error;
  const oauthError = Array.isArray(errRaw) ? errRaw[0] : errRaw;
  const deletedRaw = searchParams?.account_deleted;
  const accountDeleted = (Array.isArray(deletedRaw) ? deletedRaw[0] : deletedRaw) === "1";

  if (!isIdpEnabled()) {
    return (
      <ThemeProvider>
        <AccountDeletedBeacon active={accountDeleted} />
        <IdpRedirectBridge variant="login" targetHref="/landing" copy={copy} idpDisabled />
      </ThemeProvider>
    );
  }

  const targetHref = oidcStartWithQuery(searchParams);

  return (
    <ThemeProvider>
      <AccountDeletedBeacon active={accountDeleted} />
      <IdpRedirectBridge
        variant="login"
        targetHref={targetHref}
        copy={copy}
        errorMessage={oauthError ?? undefined}
      />
    </ThemeProvider>
  );
}
