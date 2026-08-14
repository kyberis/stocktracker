import { NextRequest } from "next/server";
import { fetchFinnhubPortfolioNews } from "@/lib/api-providers/finnhub-news";
import { requireFeatureQuota, requireRateLimit, requireSession } from "@/lib/auth/guards";
import { hasPremiumMarketDataConfigured, listHoldings } from "@/lib/db";
import {
  ingestNewsArticles,
  listPortfolioNewsForTickers,
  listSymbolsNeedingProviderFetch,
  touchSymbolFetchMeta,
  normalizePortfolioNewsSymbol,
} from "@/lib/db/portfolio-news";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { getPremiumMarketDataFromRequest } from "@/lib/market-data/resolve-provider";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import { diversifyPortfolioNews } from "@/lib/portfolio-news-rank";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";
import type { NewsArticle } from "@/lib/types";

export const dynamic = "force-dynamic";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY ?? "";
const DEFAULT_STALE_MS = 6 * 3600 * 1000;

export const GET = withMetrics("/api/portfolio-news", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const userId = session.userId;
  const portfolioId = request.nextUrl.searchParams.get("portfolioId") || undefined;

  const holdings = await listHoldings(userId, portfolioId);
  if (holdings.length === 0) {
    return Response.json([]);
  }

  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
  if (tickers.length === 0) {
    return Response.json([]);
  }

  const norm = tickers.map(normalizePortfolioNewsSymbol);
  const staleMs = Number(process.env.PORTFOLIO_NEWS_SYMBOL_STALE_MS ?? String(DEFAULT_STALE_MS));
  const symbolsNeedingFetch = await listSymbolsNeedingProviderFetch(norm, staleMs);

  if (symbolsNeedingFetch.length > 0) {
    const { session: quotaSession, error: quotaError } = await requireFeatureQuota(
      request,
      "intelligence",
    );
    if (quotaError || !quotaSession) {
      return quotaError!;
    }

    let providerArticles: NewsArticle[] = [];

    try {
      const resolved = await getPremiumMarketDataFromRequest(request, "portfolio_news");
      if (resolved) {
        const { provider, backend } = resolved;
        const rl = await requireRateLimit(request, "fmp");
        if (rl.error) {
          await refundFeatureQuota(userId, "intelligence");
          return rl.error;
        }

        if (typeof provider.getPortfolioNewsSentiment === "function") {
          try {
            providerArticles = await provider.getPortfolioNewsSentiment(symbolsNeedingFetch);
          } catch (err) {
            console.warn(
              "Premium portfolio news failed, trying Finnhub fallback:",
              err instanceof Error ? err.message : err,
            );
          }
        }

        if (providerArticles.length > 0) {
          await ingestNewsArticles(providerArticles);
          await touchSymbolFetchMeta(symbolsNeedingFetch);
          if (userId && provider.callCount) {
            deferTask(() => recordMarketDataUsageAsync(userId, backend, provider.callCount!));
          }
        }
      }

      if (providerArticles.length === 0 && FINNHUB_API_KEY) {
        try {
          providerArticles = await fetchFinnhubPortfolioNews(symbolsNeedingFetch, FINNHUB_API_KEY);
          await ingestNewsArticles(providerArticles);
          await touchSymbolFetchMeta(symbolsNeedingFetch);
        } catch (err) {
          console.error(
            "Finnhub news fallback failed:",
            err instanceof Error ? err.message : err,
          );
          await refundFeatureQuota(userId, "intelligence");
          return Response.json({ error: "Failed to fetch news" }, { status: 500 });
        }
      }

      if (
        providerArticles.length === 0 &&
        !(await hasPremiumMarketDataConfigured()) &&
        !FINNHUB_API_KEY
      ) {
        await refundFeatureQuota(userId, "intelligence");
        return Response.json(
          { error: "No news provider configured" },
          { status: 400 },
        );
      }

      if (providerArticles.length === 0) {
        await touchSymbolFetchMeta(symbolsNeedingFetch);
      }
    } catch (err) {
      console.error("Portfolio news ingest error:", err instanceof Error ? err.message : err);
      await refundFeatureQuota(userId, "intelligence");
      return Response.json({ error: "Failed to refresh news" }, { status: 500 });
    }
  }

  const fromDb = await listPortfolioNewsForTickers(norm, 500);
  const ranked = diversifyPortfolioNews(fromDb, tickers, { limit: 30, maxPerTicker: 2 });
  return Response.json(ranked);
});
