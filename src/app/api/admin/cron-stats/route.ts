import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getCronStats } from "@/lib/cron-logging";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/cron-stats", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const data = await getCronStats();
  return NextResponse.json(data);
});
