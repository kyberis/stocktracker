import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser, getUserSettings, listHoldings } from "@/lib/db";
import { buildAidDigest } from "@/lib/aid/build-digest";
import { buildAidEarningsRecap } from "@/lib/aid/build-earnings-recap";
import { fetchQuoteMapForHoldings } from "@/lib/holding-quotes";
import { parseBody } from "@/lib/api-response";
import { z } from "zod";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

const refreshSchema = z.object({
  ticker: z.string().min(1).max(16),
  portfolioId: z.string().optional(),
});

export const dynamic = "force-dynamic";

export const POST = withMetrics("/api/aid/refresh", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/aid/refresh", reason: "no_session" });

  const enabled = await isFeatureEnabledForUser("aid_beta", session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "AID beta is not enabled" }, { status: 403 });
  }

  const parsed = await parseBody(req, refreshSchema);
  if (!parsed.success) return parsed.error;

  const settings = await getUserSettings(session.userId);
  const portfolioId = parsed.data.portfolioId;
  const holdings = await listHoldings(session.userId, portfolioId);
  const quotes = await fetchQuoteMapForHoldings(holdings);

  const ticker = parsed.data.ticker.toUpperCase();
  const language = settings.language || "en";

  const [{ items, earningsTodayCount }, { items: earningsRecap }] = await Promise.all([
    buildAidDigest({
      userId: session.userId,
      portfolioId,
      language,
      quotes,
      forceRefreshTicker: ticker,
      maxGenerate: 2,
    }),
    buildAidEarningsRecap({
      userId: session.userId,
      portfolioId,
      language,
      quotes,
      forceRefreshTicker: ticker,
      maxGenerate: 1,
    }),
  ]);

  return NextResponse.json({ items, earningsTodayCount, earningsRecap });
});
