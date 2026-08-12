import { fetchFinnhubPortfolioNews } from "@/lib/api-providers/finnhub-news";
import {
  ingestNewsArticles,
  listPortfolioNewsForTickers,
  listSymbolsNeedingProviderFetch,
  normalizePortfolioNewsSymbol,
  touchSymbolFetchMeta,
} from "@/lib/db/portfolio-news";
import { resolvePremiumStockDataProvider } from "@/lib/market-data/resolve-provider";
import { rankPortfolioNewsForTickers } from "@/lib/portfolio-news-rank";
import type { NewsArticle } from "@/lib/api-providers/types";

const DEFAULT_STALE_MS = 6 * 3600 * 1000;
const MAX_SYMBOLS = 5;

export interface EnsuredTickerNewsArticle {
  title: string;
  source: string;
  publishedAt: string;
  excerpt: string;
  tickers: string[];
  sentiment?: string;
}

export interface EnsureTickerNewsResult {
  articles: EnsuredTickerNewsArticle[];
  coverageTickers: string[];
  refreshed: boolean;
  note?: string;
}

function finnhubApiKey(): string {
  return process.env.FINNHUB_API_KEY ?? "";
}

/**
 * Read cached portfolio-news articles for tickers; if the cache is empty/stale,
 * refresh from FMP (when flagged) or Finnhub, ingest, then re-read.
 * Used by Warren tools so price-move / "why did X drop?" answers can be grounded.
 */
export async function ensureTickerNews(
  userId: string,
  tickers: string[],
  opts?: { maxArticles?: number; staleMs?: number },
): Promise<EnsureTickerNewsResult> {
  const coverageTickers = [
    ...new Set(
      tickers
        .map((t) => normalizePortfolioNewsSymbol(String(t ?? "").trim()))
        .filter((t) => t.length >= 1 && t.length <= 12),
    ),
  ].slice(0, MAX_SYMBOLS);

  if (coverageTickers.length === 0) {
    return {
      articles: [],
      coverageTickers: [],
      refreshed: false,
      note: "No valid tickers to look up.",
    };
  }

  const staleMs = opts?.staleMs ?? Number(process.env.PORTFOLIO_NEWS_SYMBOL_STALE_MS ?? String(DEFAULT_STALE_MS));
  const needing = await listSymbolsNeedingProviderFetch(coverageTickers, staleMs);
  let refreshed = false;
  const apiKey = finnhubApiKey();

  if (needing.length > 0) {
    let providerArticles: NewsArticle[] = [];

    try {
      const resolved = await resolvePremiumStockDataProvider(userId, "portfolio_news");
      if (resolved && typeof resolved.provider.getPortfolioNewsSentiment === "function") {
        try {
          providerArticles = await resolved.provider.getPortfolioNewsSentiment(needing);
        } catch (err) {
          console.warn(
            "[ensureTickerNews] premium news failed:",
            err instanceof Error ? err.message : err,
          );
        }
      }

      if (providerArticles.length === 0 && apiKey) {
        try {
          providerArticles = await fetchFinnhubPortfolioNews(needing, apiKey);
        } catch (err) {
          console.warn(
            "[ensureTickerNews] Finnhub news failed:",
            err instanceof Error ? err.message : err,
          );
        }
      }

      if (providerArticles.length > 0) {
        await ingestNewsArticles(providerArticles);
        refreshed = true;
      }
      await touchSymbolFetchMeta(needing);
    } catch (err) {
      console.warn(
        "[ensureTickerNews] refresh error:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const fromDb = await listPortfolioNewsForTickers(coverageTickers, 200);
  const ranked = rankPortfolioNewsForTickers(fromDb, coverageTickers);
  const limit = Math.min(opts?.maxArticles ?? 12, 25);
  const slice = ranked.slice(0, limit);

  if (slice.length === 0) {
    return {
      articles: [],
      coverageTickers,
      refreshed,
      note: apiKey
        ? "No recent headlines found for these tickers."
        : "No cached headlines and no news provider configured for a live refresh.",
    };
  }

  return {
    coverageTickers,
    refreshed,
    articles: slice.map((a) => ({
      title: a.title,
      source: a.source,
      publishedAt: a.publishedAt,
      excerpt: (a.summary || "").slice(0, 400),
      tickers: [...new Set(a.tickerSentiment.map((t) => t.ticker))].slice(0, 10),
      sentiment: a.overallSentiment || undefined,
    })),
  };
}
