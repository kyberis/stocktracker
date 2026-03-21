import { redirect } from "next/navigation";
import type { Metadata } from "next";
import TrialActivateClient from "./trial-activate-client";

export const metadata: Metadata = {
  title: "Activate Your Free Trial | trefolio",
  description: "Activate your 7-day Trefolio Pro trial — no credit card required.",
};

export default async function TrialActivatePage(props: { searchParams: Promise<{ token?: string }> }) {
  const searchParams = await props.searchParams;
  const token = searchParams.token;
  if (!token) redirect("/");
  return <TrialActivateClient token={token} />;
}
