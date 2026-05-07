import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkTrialToken } from "@/lib/db";
import TrialActivateClient from "./trial-activate-client";
import { getIdpIssuer, grantsAndTrialsRedirectToIdp } from "@/lib/idp/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activate Your Free Trial | trefolio",
  description: "Activate your 7-day Trefolio Pro trial — no credit card required.",
};

export default async function TrialActivatePage(props: { searchParams: Promise<{ token?: string }> }) {
  const searchParams = await props.searchParams;
  const token = searchParams.token;
  if (!token) redirect("/");

  if (grantsAndTrialsRedirectToIdp()) {
    const iss = getIdpIssuer();
    if (iss) {
      redirect(`${iss.replace(/\/+$/, "")}/trial/activate?token=${encodeURIComponent(token)}`);
    }
  }

  const tokenStatus = await checkTrialToken(token);

  return <TrialActivateClient token={token} tokenStatus={tokenStatus} />;
}
