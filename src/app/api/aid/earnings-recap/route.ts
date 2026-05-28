import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser, getUserSettings, listHoldings } from "@/lib/db";
import { buildAidEarningsRecap } from "@/lib/aid/build-earnings-recap";
import { EARNINGS_REPORT_LOOKBACK_DAYS } from "@/lib/aid/earnings-keys";
import { providerQuotesToQuoteMap } from "@/lib/aid/quotes-map";
import { getQuotesWithCache } from "@/lib/quote-cache";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/aid/earnings-recap", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/earnings-recap", reason: "no_session" });

  const enabled = await isFeatureEnabledForUser("aid_beta", session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  const settings = await getUserSettings(session.userId);
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const holdings = await listHoldings(session.userId, portfolioId);
  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
  const providerQuotes = tickers.length > 0 ? await getQuotesWithCache(tickers) : {};
  const quotes = providerQuotesToQuoteMap(providerQuotes);

  const { items } = await buildAidEarningsRecap({
    userId: session.userId,
    portfolioId,
    language: settings.language || "en",
    quotes,
    maxGenerate: 6,
  });

  return NextResponse.json({
    items,
    lookbackDays: EARNINGS_REPORT_LOOKBACK_DAYS,
  });
});
