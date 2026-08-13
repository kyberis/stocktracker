import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  ALL_PLATFORM_FEATURES,
  isFeatureEnabled,
  setFeatureEnabled,
  getFeatureFlagOverrideCounts,
} from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { featureFlagSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/feature-flags", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const [overrideCounts, ...flagValues] = await Promise.all([
    getFeatureFlagOverrideCounts(),
    ...ALL_PLATFORM_FEATURES.map((f) => isFeatureEnabled(f)),
  ]);

  const flags: Record<string, boolean> = {};
  ALL_PLATFORM_FEATURES.forEach((f, i) => { flags[f] = flagValues[i]; });

  return NextResponse.json({ flags, overrideCounts });
});

export const PUT = withMetrics("/api/admin/feature-flags", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, featureFlagSchema);
  if (!result.success) return result.error;
  const { flag, enabled } = result.data;

  await setFeatureEnabled(flag, enabled);
  return NextResponse.json({ ok: true, flag, enabled });
});
