import { NextRequest, NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/feature-flags", async (_req: NextRequest) => {
  const [alertsEnabled, csvExportEnabled] = await Promise.all([
    isFeatureEnabled("alerts_enabled"),
    isFeatureEnabled("csv_export_enabled"),
  ]);

  return NextResponse.json({
    alerts_enabled: alertsEnabled,
    csv_export_enabled: csvExportEnabled,
  });
});
