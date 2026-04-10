import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkMembershipGrantToken } from "@/lib/db";
import MembershipGrantActivateClient from "./membership-grant-activate-client";

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

  const tokenStatus = await checkMembershipGrantToken(token);

  return <MembershipGrantActivateClient token={token} tokenStatus={tokenStatus} />;
}
