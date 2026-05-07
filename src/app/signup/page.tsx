import { redirect } from "next/navigation";
import SignupPageClient from "./signup-page-client";
import { isIdpEnabled, useLegacyAuth } from "@/lib/idp/config";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const sp = await searchParams;
  if (isIdpEnabled() && !useLegacyAuth()) {
    const qs = new URLSearchParams();
    qs.set("redirect", "/onboarding");
    const raw = sp.email;
    const email = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (email) qs.set("email", email);
    redirect(`/api/auth/oidc/signup-start?${qs.toString()}`);
  }

  return <SignupPageClient />;
}
