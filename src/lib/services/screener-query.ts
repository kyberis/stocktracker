import { requireFeatureQuotaByUserId } from "@/lib/auth/guards";
import { queryScreener, type ScreenerFilters, type ScreenerResponse } from "@/lib/db";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import type { ServiceResult } from "@/lib/services/service-result";
import { serviceErr } from "@/lib/services/service-result";

export async function screenStocksForUser(
  userId: string,
  filters: ScreenerFilters,
): Promise<ServiceResult<ScreenerResponse>> {
  const quota = await requireFeatureQuotaByUserId(userId, "screener");
  if (!quota.allowed) {
    if (quota.reason === "user_not_found") {
      return serviceErr("User not found", "user_not_found");
    }
    return serviceErr("Monthly screener quota exceeded.", "quota_exceeded");
  }

  try {
    const data = await queryScreener({
      ...filters,
      page: filters.page ?? 1,
      limit: Math.min(filters.limit ?? 20, 50),
    });
    return { ok: true, data };
  } catch (err) {
    await refundFeatureQuota(userId, "screener");
    const message = err instanceof Error ? err.message : "Screener query failed";
    return serviceErr(message, "not_configured");
  }
}
