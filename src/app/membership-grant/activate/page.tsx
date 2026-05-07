import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkMembershipGrantToken } from "@/lib/db";
import MembershipGrantActivateClient from "./membership-grant-activate-client";
import { getIdpIssuer, grantsAndTrialsRedirectToIdp } from "@/lib/idp/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activate membership | trefolio",
  description: "Activate complimentary membership granted by the trefolio team.",
};

export default async function MembershipGrantActivatePage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const searchParams = await props.searchParams;
  const token = searchParams.token;
  if (!token) redirect("/");

  if (grantsAndTrialsRedirectToIdp()) {
    const iss = getIdpIssuer();
    if (iss) {
      redirect(`${iss.replace(/\/+$/, "")}/membership-grant/activate?token=${encodeURIComponent(token)}`);
    }
  }

  const tokenStatus = await checkMembershipGrantToken(token);

  return <MembershipGrantActivateClient token={token} tokenStatus={tokenStatus} />;
}
