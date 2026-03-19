import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listUnsubscribeEvents } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/unsubscribes", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 200);
  const offset = Math.max(Number(req.nextUrl.searchParams.get("offset") || 0), 0);

  const data = await listUnsubscribeEvents(limit, offset);

  return NextResponse.json(data);
});
