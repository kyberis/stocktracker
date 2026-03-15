import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getRecentSnapTradeLogs } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/snaptrade-logs", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Number(url.searchParams.get("offset")) || 0;
  const userId = url.searchParams.get("userId") || undefined;
  const action = url.searchParams.get("action") || undefined;

  const data = await getRecentSnapTradeLogs({ limit, offset, userId, action });
  return NextResponse.json(data);
});
