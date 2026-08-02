import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server-session";
import { isFeatureEnabledForUser } from "@/lib/db";

export default async function MarketInsightsRedirectPage() {
  const session = await getServerSession();
  if (session?.userId && (await isFeatureEnabledForUser("daily_digests_enabled", session.userId))) {
    redirect("/daily-digests");
  }
  redirect("/");
}
