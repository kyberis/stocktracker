import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listMarketDigests, getDigestTranslation } from "@/lib/db";
import { getUserSettings, listHoldings } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/market-insights", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const digests = await listMarketDigests({ status: "published", limit, offset });

  const settings = await getUserSettings(session.userId);
  const userLang = settings?.language || "en";

  const holdings = await listHoldings(session.userId);
  const userTickers = new Set(holdings.map((h) => h.ticker.toUpperCase()));

  const items = await Promise.all(
    digests.map(async (d) => {
      let translation = await getDigestTranslation(d.id, userLang);
      if (!translation) {
        translation = await getDigestTranslation(d.id, "en");
      }

      const portfolioTickers = d.mentionedTickers.filter((t) => userTickers.has(t.toUpperCase()));

      return {
        id: d.id,
        title: translation?.title || d.originalSubject,
        summary: translation?.summary || "",
        keyPoints: translation?.keyPoints || [],
        mentionedTickers: d.mentionedTickers,
        portfolioTickers,
        sectors: d.sectors,
        sentiment: d.sentiment,
        publishedAt: d.publishedAt,
        receivedAt: d.receivedAt,
      };
    }),
  );

  return NextResponse.json({ insights: items });
});
