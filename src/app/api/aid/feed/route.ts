import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings } from "@/lib/db";
import { buildAidFeed } from "@/lib/aid/build-feed";
import { canAccessAidData } from "@/lib/aid/can-access-aid-data";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/aid/feed", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/feed", reason: "no_session" });

  const enabled = await canAccessAidData(session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  const settings = await getUserSettings(session.userId);
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const feed = await buildAidFeed({
    userId: session.userId,
    portfolioId,
    language: settings.language || "en",
  });

  return NextResponse.json(feed);
});
