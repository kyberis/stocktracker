import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listEmailSendsForUser, listEmailSends } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/email-sends", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const userId = req.nextUrl.searchParams.get("userId");
  const sends = userId
    ? await listEmailSendsForUser(userId)
    : await listEmailSends();

  return NextResponse.json(sends);
});
