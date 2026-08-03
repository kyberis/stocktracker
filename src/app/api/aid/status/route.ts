import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, listHoldings } from "@/lib/db";
import { buildAidStatus } from "@/lib/aid/build-status";
import { canAccessAidData } from "@/lib/aid/can-access-aid-data";
import { setLastAidVisitAt } from "@/lib/db/aid-user-state";
import { fetchQuoteMapForHoldings } from "@/lib/holding-quotes";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/aid/status", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/status", reason: "no_session" });

  const enabled = await canAccessAidData(session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  const settings = await getUserSettings(session.userId);
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const holdings = await listHoldings(session.userId, portfolioId);
  const quotes = await fetchQuoteMapForHoldings(holdings);

  const status = await buildAidStatus({
    userId: session.userId,
    portfolioId,
    language: settings.language || "en",
    quotes,
  });

  return NextResponse.json(status);
});

export const POST = withMetrics("/api/aid/status", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/status", reason: "no_session" });

  const enabled = await canAccessAidData(session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  await setLastAidVisitAt(session.userId, new Date().toISOString());
  return NextResponse.json({ ok: true });
});
