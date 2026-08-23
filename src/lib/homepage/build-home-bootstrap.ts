import { listHoldings, getUserSettings } from "@/lib/db";
import { fetchProviderQuotesForHoldings } from "@/lib/holding-quotes";
import { buildAidStatus } from "@/lib/aid/build-status";
import {
  buildDayHighlightsPayload,
  type DayHighlightsPayload,
} from "@/lib/homepage/build-day-highlights";
import {
  resolveRecommendationQueue,
  type RecommendationQueueResult,
} from "@/lib/homepage/resolve-recommendation-queue";
import { providerQuotesToQuoteMap } from "@/lib/aid/quotes-map";
import type { AidStatusPayload } from "@/lib/types";
import type { PortfolioRecommendation } from "@/lib/homepage/build-portfolio-recommendations";

export type HomeBootstrapPayload = {
  dayHighlights: DayHighlightsPayload;
  aidStatus: AidStatusPayload;
  recommendation: {
    current: PortfolioRecommendation | null;
    remaining: number;
    total: number;
    rawTotal: number;
    source: RecommendationQueueResult["source"];
  } | null;
  asOf: string;
};

/**
 * Single holdings + quotes pass for Home above-the-fold sections.
 * AID briefing LLM is intentionally omitted (client fetches lazily).
 * Recommendations prefer weekly cache only — no live quote recompute.
 */
export async function buildHomeBootstrap(args: {
  userId: string;
  portfolioId?: string;
}): Promise<HomeBootstrapPayload> {
  const [holdings, settings] = await Promise.all([
    listHoldings(args.userId, args.portfolioId),
    getUserSettings(args.userId),
  ]);

  const providerQuotes = await fetchProviderQuotesForHoldings(holdings);
  const quotes = providerQuotesToQuoteMap(providerQuotes);

  const [dayHighlights, aidStatus, recommendation] = await Promise.all([
    buildDayHighlightsPayload({
      userId: args.userId,
      portfolioId: args.portfolioId,
      holdings,
      providerQuotes,
    }),
    buildAidStatus({
      userId: args.userId,
      portfolioId: args.portfolioId,
      language: settings.language || "en",
      quotes,
      holdings,
      includeBriefing: false,
    }),
    resolveRecommendationQueue({
      userId: args.userId,
      portfolioId: args.portfolioId,
      cacheOnly: true,
    }).then((r) => ({
      current: r.current,
      remaining: r.remaining,
      total: r.total,
      rawTotal: r.rawTotal,
      source: r.source,
    })).catch(() => null),
  ]);

  return {
    dayHighlights,
    aidStatus,
    recommendation,
    asOf: new Date().toISOString(),
  };
}
