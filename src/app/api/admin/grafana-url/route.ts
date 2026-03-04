import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { isGrafanaCloudConfigured } from "@/lib/grafana-push";

export const GET = withMetrics("/api/admin/grafana-url", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const cloudUrl = process.env.GRAFANA_CLOUD_DASHBOARD_URL || "";
  const localUrl = process.env.GRAFANA_URL || "";

  return NextResponse.json({
    url: cloudUrl || localUrl,
    source: cloudUrl ? "cloud" : localUrl ? "local" : "none",
    cloudConfigured: isGrafanaCloudConfigured(),
  });
});
