import { NextRequest, NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/feature-flags", async (_req: NextRequest) => {
  const [alertsEnabled, csvExportEnabled, appleSigninEnabled, deviceEnabled] = await Promise.all([
    isFeatureEnabled("alerts_enabled"),
    isFeatureEnabled("csv_export_enabled"),
    isFeatureEnabled("apple_signin_enabled"),
    isFeatureEnabled("device_enabled"),
  ]);

  return NextResponse.json({
    alerts_enabled: alertsEnabled,
    csv_export_enabled: csvExportEnabled,
    apple_signin_enabled: appleSigninEnabled,
    device_enabled: deviceEnabled,
  });
});
