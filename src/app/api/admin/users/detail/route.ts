import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listUsersWithStats, getUserDetailData } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/users/detail", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const userId = req.nextUrl.searchParams.get("userId");

  if (userId) {
    const detail = await getUserDetailData(userId);
    return NextResponse.json(detail);
  }

  return NextResponse.json({ users: await listUsersWithStats() });
});
