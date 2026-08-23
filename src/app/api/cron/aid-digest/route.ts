import { NextRequest } from "next/server";
import {
  getUserSettings,
  listAidNewsCacheForUser,
  listHoldings,
  listPortfolios,
} from "@/lib/db";
import { buildAidDigest } from "@/lib/aid/build-digest";
import { buildAidEarningsRecap } from "@/lib/aid/build-earnings-recap";
import { listAidWarmUserIds } from "@/lib/aid/warm-users";
import { providerQuotesToQuoteMap } from "@/lib/aid/quotes-map";
import { getQuotesWithCache } from "@/lib/quote-cache";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

/** Skip Tavily/LLM warm when the 24h digest cache is still fresh. */
const FRESH_WITHIN_MS = 20 * 3600 * 1000;

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const runAidDigest = withCronLogging("aid-digest", async () => {
  const userIds = await listAidWarmUserIds(20);
  if (userIds.length === 0) {
    return { warmed: 0, message: "no aid_beta users to warm" };
  }

  let warmed = 0;
  let skippedFresh = 0;
  for (const userId of userIds) {
    try {
      const existing = await listAidNewsCacheForUser(userId, 1);
      const fetchedAt = existing[0]?.fetchedAt;
      const fetchedMs = fetchedAt ? Date.parse(fetchedAt) : NaN;
      if (Number.isFinite(fetchedMs) && Date.now() - fetchedMs < FRESH_WITHIN_MS) {
        skippedFresh += 1;
        continue;
      }

      const settings = await getUserSettings(userId);
      const portfolios = await listPortfolios(userId);
      const portfolioId = portfolios[0]?.id;
      const holdings = await listHoldings(userId, portfolioId);
      if (holdings.length === 0) continue;

      const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
      const providerQuotes = await getQuotesWithCache(tickers);
      const quotes = providerQuotesToQuoteMap(providerQuotes);

      const language = settings.language || "en";
      await Promise.all([
        buildAidDigest({
          userId,
          portfolioId,
          language,
          quotes,
          maxGenerate: 8,
        }),
        buildAidEarningsRecap({
          userId,
          portfolioId,
          language,
          quotes,
          maxGenerate: 4,
        }),
      ]);
      warmed += 1;
    } catch (err) {
      console.warn("[aid-digest cron] user", userId, err instanceof Error ? err.message : err);
    }
  }

  return { warmed, skippedFresh, candidates: userIds.length };
});

function authorize(req: NextRequest) {
  return verifyCronAuth("aid-digest", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runAidDigest();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runAidDigest();
}
