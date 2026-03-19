import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { runPortfolioSnapshotsJob } from "@/lib/cron-portfolio-snapshots";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/materialize-portfolio-snapshots
 * One-off or on-demand: same work as GET /api/cron/portfolio-snapshots — writes “dashboard-open”
 * snapshot rows (aggregate + per-portfolio) for all users with holdings, using live quotes.
 * Requires admin session (use from browser while logged in as admin).
 */
export const POST = withMetrics("/api/admin/materialize-portfolio-snapshots", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await runPortfolioSnapshotsJob();
  return NextResponse.json({ ok: true, ...result });
});
