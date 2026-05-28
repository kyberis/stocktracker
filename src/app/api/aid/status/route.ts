import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, isFeatureEnabledForUser, listHoldings } from "@/lib/db";
import { buildAidStatus } from "@/lib/aid/build-status";
import { setLastAidVisitAt } from "@/lib/db/aid-user-state";
import { providerQuotesToQuoteMap } from "@/lib/aid/quotes-map";
import { getQuotesWithCache } from "@/lib/quote-cache";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

async function aidEnabled(userId: string) {
  return isFeatureEnabledForUser("aid_beta", userId);
}

export const GET = withMetrics("/api/aid/status", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/status", reason: "no_session" });

  const enabled = await aidEnabled(session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  const settings = await getUserSettings(session.userId);
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const holdings = await listHoldings(session.userId, portfolioId);
  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
  const providerQuotes = tickers.length > 0 ? await getQuotesWithCache(tickers) : {};
  const quotes = providerQuotesToQuoteMap(providerQuotes);

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

  const enabled = await aidEnabled(session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  await setLastAidVisitAt(session.userId, new Date().toISOString());
  return NextResponse.json({ ok: true });
});
