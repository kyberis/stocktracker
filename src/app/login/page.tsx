import { ThemeProvider } from "@/lib/theme-context";
import { IdpRedirectBridge } from "@/components/auth/IdpRedirectBridge";
import { PreviewLoginHint } from "@/components/auth/PreviewLoginHint";
import { getIdpBridgeCopy } from "@/lib/idp/bridge-copy";
import { isIdpEnabled } from "@/lib/idp/config";
import { isPreviewLoginAllowed, previewLoginSecretsConfigured } from "@/lib/auth/preview-login";

interface LoginPageProps {
  searchParams?: {
    redirect?: string | string[];
    error?: string | string[];
    email?: string | string[];
    ui_locales?: string | string[];
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
  const previewReady =
    isPreviewLoginAllowed() && previewLoginSecretsConfigured();

  // Preview without IdP: show preview login as the primary UI (not the IdP error).
  if (!isIdpEnabled() && previewReady) {
    return (
      <ThemeProvider>
        <PreviewLoginHint asPrimary />
      </ThemeProvider>
    );
  }

  if (!isIdpEnabled()) {
    return (
      <ThemeProvider>
        <IdpRedirectBridge variant="login" targetHref="/landing" copy={copy} idpDisabled />
        {isPreviewLoginAllowed() ? (
          <p className="fixed bottom-4 left-1/2 z-50 w-[min(420px,92vw)] -translate-x-1/2 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-center text-xs text-amber-900 shadow-lg dark:bg-amber-950 dark:text-amber-100">
            Preview login env vars missing. Set PREVIEW_LOGIN_SECRET and PREVIEW_USER_EMAIL
            on this Vercel Preview, then redeploy.
          </p>
        ) : null}
      </ThemeProvider>
    );
  }

  const targetHref = oidcStartWithQuery(searchParams);

  return (
    <ThemeProvider>
      <IdpRedirectBridge
        variant="login"
        targetHref={targetHref}
        copy={copy}
        errorMessage={oauthError ?? undefined}
      />
      {previewReady ? <PreviewLoginHint /> : null}
    </ThemeProvider>
  );
}
