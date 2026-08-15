import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getAlertDispatchSummary, listAlertDispatchLogs } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/alert-dispatch", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Number(url.searchParams.get("offset")) || 0;
  const userId = url.searchParams.get("userId") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const channel = url.searchParams.get("channel") || undefined;

  const [summary, logs] = await Promise.all([
    getAlertDispatchSummary(),
    listAlertDispatchLogs({ limit, offset, userId, status, channel }),
  ]);

  return NextResponse.json({ summary, ...logs });
});
