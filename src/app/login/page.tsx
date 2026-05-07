import { redirect } from "next/navigation";
import { isIdpEnabled, useLegacyAuth } from "@/lib/idp/config";
import LoginPageClient from "./login-page-client";

interface LoginPageProps {
  searchParams?: { redirect?: string | string[]; error?: string | string[] };
}

function oidcStartPath(redirectTarget: string | undefined): string {
  const safe =
    redirectTarget && redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")
      ? redirectTarget
      : "";
  return safe
    ? `/api/auth/oidc/start?redirect=${encodeURIComponent(safe)}`
    : "/api/auth/oidc/start";
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const rawRedirect = searchParams?.redirect;
  const redirectTarget = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;
  const errRaw = searchParams?.error;
  const oauthError = Array.isArray(errRaw) ? errRaw[0] : errRaw;

  if (isIdpEnabled() && !useLegacyAuth()) {
    // After a failed OIDC callback we redirect here with ?error=… — do not bounce
    // straight back to /api/auth/oidc/start or the browser hits ERR_TOO_MANY_REDIRECTS.
    if (!oauthError) {
      redirect(oidcStartPath(redirectTarget));
    }
    return <LoginPageClient oidcRetryHref={oidcStartPath(redirectTarget)} />;
  }
  return <LoginPageClient />;
}
