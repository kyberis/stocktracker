import { isFeatureEnabledForUser } from "@/lib/db";

/**
 * AID data APIs power Investor Briefing (`aid_beta`) and the default home brief (`home_v2`, on by default).
 */
export async function canAccessAidData(userId: string): Promise<boolean> {
  const [aid, homeV2] = await Promise.all([
    isFeatureEnabledForUser("aid_beta", userId),
    isFeatureEnabledForUser("home_v2", userId),
  ]);
  return aid || homeV2;
}
