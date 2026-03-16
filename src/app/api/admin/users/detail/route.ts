import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listUsersWithStats, listUsersWithStatsPaginated, getUserDetailData } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/users/detail", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const userId = req.nextUrl.searchParams.get("userId");

  if (userId) {
    const detail = await getUserDetailData(userId);
    return NextResponse.json(detail);
  }

  const pageParam = req.nextUrl.searchParams.get("page");
  if (pageParam !== null) {
    const page = Math.max(0, parseInt(pageParam, 10) || 0);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") || "25", 10)));
    const result = await listUsersWithStatsPaginated({
      page,
      pageSize,
      search: req.nextUrl.searchParams.get("search") || undefined,
      sortKey: (req.nextUrl.searchParams.get("sortKey") as any) || undefined,
      sortDir: (req.nextUrl.searchParams.get("sortDir") as "asc" | "desc") || undefined,
      filterPlan: req.nextUrl.searchParams.get("filterPlan") || undefined,
      filterAuth: req.nextUrl.searchParams.get("filterAuth") || undefined,
      filterImport: req.nextUrl.searchParams.get("filterImport") || undefined,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ users: await listUsersWithStats() });
});
