import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getAllSurveysPaginated } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import type { SatisfactionStatus } from "@/lib/db";

export const GET = withMetrics("/api/admin/satisfaction", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error;

  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get("page") || "0", 10) || 0);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") || "25", 10)));
  const statusParam = req.nextUrl.searchParams.get("status");
  const statusFilter = statusParam === "draft" || statusParam === "submitted"
    ? statusParam as SatisfactionStatus
    : undefined;

  const result = await getAllSurveysPaginated(page, pageSize, statusFilter);
  return NextResponse.json(result);
});
