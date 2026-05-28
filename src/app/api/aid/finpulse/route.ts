import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, isFeatureEnabledForUser, listHoldings } from "@/lib/db";
import { buildFinPulseForUser } from "@/lib/aid/build-finpulse";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/aid/finpulse", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/finpulse", reason: "no_session" });

  const enabled = await isFeatureEnabledForUser("aid_beta", session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  const tabParam = req.nextUrl.searchParams.get("tab");
  const tab = tabParam === "foryou" ? "foryou" : "market_voices";
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const settings = await getUserSettings(session.userId);
  const holdings = await listHoldings(session.userId, portfolioId);
  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);

  const { items } = await buildFinPulseForUser({
    tab,
    portfolioTickers: tickers,
    language: settings.language || "en",
    maxGenerate: tab === "foryou" ? 3 : 0,
  });

  return NextResponse.json({ items, tab });
});
