import { buildAidDigest } from "@/lib/aid/build-digest";
import { buildAidEarningsRecap } from "@/lib/aid/build-earnings-recap";
import { buildFinPulseForUser } from "@/lib/aid/build-finpulse";
import { mergePriorityFeed } from "@/lib/aid/impact-score";
import { providerQuotesToQuoteMap } from "@/lib/aid/quotes-map";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { listHoldings } from "@/lib/db";
import { getQuotesWithCache } from "@/lib/quote-cache";
import type { AidFeedItem } from "@/lib/types";

export async function buildAidFeed(args: {
  userId: string;
  portfolioId?: string;
  language: string;
}): Promise<{ priority: AidFeedItem[]; topImpactScore: number }> {
  const holdings = await listHoldings(args.userId, args.portfolioId);
  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
  const providerQuotes = tickers.length > 0 ? await getQuotesWithCache(tickers) : {};
  const quotes = providerQuotesToQuoteMap(providerQuotes);

  const [digest, earnings, finForYou, finVoices] = await Promise.all([
    buildAidDigest({
      userId: args.userId,
      portfolioId: args.portfolioId,
      language: args.language,
      quotes,
      maxGenerate: 4,
    }),
    buildAidEarningsRecap({
      userId: args.userId,
      portfolioId: args.portfolioId,
      language: args.language,
      quotes,
      maxGenerate: 3,
    }),
    buildFinPulseForUser({
      tab: "foryou",
      portfolioTickers: tickers,
      language: args.language,
      maxGenerate: 2,
    }),
    buildFinPulseForUser({
      tab: "market_voices",
      portfolioTickers: tickers,
      language: args.language,
      maxGenerate: 2,
    }),
  ]);

  const finPulse = [...finForYou.items];
  const seen = new Set(finPulse.map((i) => i.id));
  for (const item of finVoices.items) {
    if (!seen.has(item.id)) finPulse.push(item);
  }

  const priority = mergePriorityFeed({
    digest: digest.items,
    finPulse,
    earnings: earnings.items,
    limit: 5,
  });

  return {
    priority,
    topImpactScore: priority[0]?.impactScore ?? 0,
  };
}
