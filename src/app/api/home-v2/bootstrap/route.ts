import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";
import {
  buildHomeBootstrap,
  buildHomeBootstrapCore,
  buildHomeBootstrapSections,
} from "@/lib/homepage/build-home-bootstrap";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

function serverTimingHeaders(
  dur: number,
  quoteStats: { hitCount: number; missCount: number },
  holdingsCount: number,
  phase: string,
): Record<string, string> {
  const timing = [
    `home-bootstrap-${phase};dur=${dur};desc="home-v2 bootstrap ${phase}"`,
    `quoteHits;desc="redis quote hits";dur=${quoteStats.hitCount}`,
    `quoteMisses;desc="redis quote misses";dur=${quoteStats.missCount}`,
    `holdings;desc="holdings count";dur=${holdingsCount}`,
  ].join(", ");

  return {
    "Cache-Control": "private, no-store",
    "Server-Timing": timing,
    "Access-Control-Expose-Headers": "Server-Timing",
  };
}

export const GET = withMetrics("/api/home-v2/bootstrap", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/home-v2/bootstrap", reason: "no_session" });

  const enabled = await isFeatureEnabledForUser("home_v2", session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "Home v2 is not enabled" }, { status: 403 });
  }

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const phase = req.nextUrl.searchParams.get("phase") || "full";
  const started = Date.now();

  if (phase === "core") {
    const payload = await buildHomeBootstrapCore({
      userId: session.userId,
      portfolioId,
    });
    const dur = Date.now() - started;
    return NextResponse.json(payload, {
      headers: serverTimingHeaders(dur, payload.quoteStats, payload.holdingsCount, "core"),
    });
  }

  if (phase === "sections") {
    const payload = await buildHomeBootstrapSections({
      userId: session.userId,
      portfolioId,
    });
    const dur = Date.now() - started;
    return NextResponse.json(payload, {
      headers: serverTimingHeaders(dur, { hitCount: 0, missCount: 0 }, 0, "sections"),
    });
  }

  const payload = await buildHomeBootstrap({
    userId: session.userId,
    portfolioId,
  });
  const dur = Date.now() - started;
  return NextResponse.json(payload, {
    headers: serverTimingHeaders(dur, payload.quoteStats, payload.holdingsCount, "full"),
  });
});
