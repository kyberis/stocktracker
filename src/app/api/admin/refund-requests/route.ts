import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listRefundRequestsForAdmin } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/refund-requests", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") || "0"));
  const pageSize = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || "25")));
  const data = await listRefundRequestsForAdmin(page, pageSize);
  return NextResponse.json(data);
});
