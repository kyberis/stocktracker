import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getFeatureFlagOverrides,
  setFeatureFlagOverride,
  removeFeatureFlagOverride,
  type PlatformFeature,
} from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { featureFlagOverrideSchema, featureFlagOverrideDeleteSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/feature-flags/overrides", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const flag = req.nextUrl.searchParams.get("flag");
  if (!flag) {
    return NextResponse.json({ error: "Missing flag parameter" }, { status: 400 });
  }

  const overrides = await getFeatureFlagOverrides(flag as PlatformFeature);
  return NextResponse.json({ overrides });
});

export const POST = withMetrics("/api/admin/feature-flags/overrides", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, featureFlagOverrideSchema);
  if (!result.success) return result.error;
  const { flag, userId, enabled } = result.data;

  await setFeatureFlagOverride(flag as PlatformFeature, userId, enabled);
  return NextResponse.json({ ok: true, flag, userId, enabled });
});

export const DELETE = withMetrics("/api/admin/feature-flags/overrides", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, featureFlagOverrideDeleteSchema);
  if (!result.success) return result.error;
  const { flag, userId } = result.data;

  await removeFeatureFlagOverride(flag as PlatformFeature, userId);
  return NextResponse.json({ ok: true, flag, userId });
});
