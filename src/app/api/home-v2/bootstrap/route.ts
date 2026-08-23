import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";
import { buildHomeBootstrap } from "@/lib/homepage/build-home-bootstrap";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/home-v2/bootstrap", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/home-v2/bootstrap", reason: "no_session" });

  const enabled = await isFeatureEnabledForUser("home_v2", session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "Home v2 is not enabled" }, { status: 403 });
  }

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const started = Date.now();
  const payload = await buildHomeBootstrap({
    userId: session.userId,
    portfolioId,
  });
  const dur = Date.now() - started;

  const timing = [
    `home-bootstrap;dur=${dur};desc="home-v2 bootstrap"`,
    `quoteHits;desc="redis quote hits";dur=${payload.quoteStats.hitCount}`,
    `quoteMisses;desc="redis quote misses";dur=${payload.quoteStats.missCount}`,
    `holdings;desc="holdings count";dur=${payload.holdingsCount}`,
  ].join(", ");

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, no-store",
      "Server-Timing": timing,
      "Access-Control-Expose-Headers": "Server-Timing",
    },
  });
});
