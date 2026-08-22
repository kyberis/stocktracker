import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/guards";
import { getFullTrafficGraph } from "@/lib/traffic/track";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/traffic-graph", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const hoursParam = Number(url.searchParams.get("hours")) || 24;
  const hours = Math.min(Math.max(hoursParam, 1), 168);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 10), 200);

  const data = await getFullTrafficGraph(hours, limit);
  return NextResponse.json(data);
});
