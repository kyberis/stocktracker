import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getRateLimitStats } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/admin/rate-limits", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const stats = await getRateLimitStats();
  return NextResponse.json(stats);
});
