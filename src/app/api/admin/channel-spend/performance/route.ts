import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getChannelPerformance } from "@/lib/db";
import { isCommerceEnabled } from "@/lib/commerce-server";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/channel-spend/performance", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const daysParam = Number(req.nextUrl.searchParams.get("days") || "45");
  const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 45;

  const [performance, commerceEnabled] = await Promise.all([
    getChannelPerformance(days),
    isCommerceEnabled(),
  ]);

  return NextResponse.json({ performance, commerceEnabled, days });
});
