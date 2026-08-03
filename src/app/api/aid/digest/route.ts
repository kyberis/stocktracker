import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, listHoldings } from "@/lib/db";
import { buildAidDigest } from "@/lib/aid/build-digest";
import { canAccessAidData } from "@/lib/aid/can-access-aid-data";
import { getLastAidVisitAt } from "@/lib/db/aid-user-state";
import { fetchQuoteMapForHoldings } from "@/lib/holding-quotes";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/aid/digest", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/digest", reason: "no_session" });

  const enabled = await canAccessAidData(session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  const settings = await getUserSettings(session.userId);
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const language = settings.language || "en";

  const holdings = await listHoldings(session.userId, portfolioId);
  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
  const quotes = await fetchQuoteMapForHoldings(holdings);

  const { items, earningsTodayCount, newSinceVisitCount } = await buildAidDigest({
    userId: session.userId,
    portfolioId,
    language,
    quotes,
    maxGenerate: 10,
    sinceVisit: (await getLastAidVisitAt(session.userId)) ?? undefined,
  });

  return NextResponse.json({ items, earningsTodayCount, newsTickers: tickers, newSinceVisitCount });
});
