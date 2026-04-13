import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { getLatestDigest, isFeatureEnabledForUser } from "@/lib/db";

export const GET = withMetrics("/api/weekly-digest", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  if (!(await isFeatureEnabledForUser("weekly_digest_enabled", session.userId))) {
    return NextResponse.json({ digest: null });
  }

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const digest = await getLatestDigest(session.userId, portfolioId);

  return NextResponse.json({ digest });
});
