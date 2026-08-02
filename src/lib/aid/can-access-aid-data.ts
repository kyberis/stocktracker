import { isFeatureEnabledForUser } from "@/lib/db";

/** AID data APIs are available to Investor Briefing beta or Home v2 preview users. */
export async function canAccessAidData(userId: string): Promise<boolean> {
  const [aid, homeV2] = await Promise.all([
    isFeatureEnabledForUser("aid_beta", userId),
    isFeatureEnabledForUser("home_v2", userId),
  ]);
  return aid || homeV2;
}
