import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getSessionFromRequest } from "@/lib/auth/session";
import { countProSubscribers } from "@/lib/db";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/billing/capacity", async (req: NextRequest) => {
  const { error } = await requireSession(req);
  if (error) return error;

  const currentCount = await countProSubscribers();
  const maxCount = PLATFORM_LIMITS.MAX_PRO_SUBSCRIBERS;
  const available = currentCount < maxCount;

  const session = await getSessionFromRequest(req);
  if (session?.role === "admin") {
    return NextResponse.json({
      available,
      currentCount,
      maxCount,
      remaining: Math.max(0, maxCount - currentCount),
    });
  }

  return NextResponse.json({ available });
});
