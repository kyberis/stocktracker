import { listHoldings } from "@/lib/db";
import { listPortfolioNewsForTickers, normalizePortfolioNewsSymbol } from "@/lib/db/portfolio-news";
import { rankPortfolioNewsForTickers } from "@/lib/portfolio-news-rank";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import type { ServiceResult } from "@/lib/services/service-result";
import { serviceErr } from "@/lib/services/service-result";

export interface PortfolioNewsArticle {
  title: string;
  source: string;
  publishedAt: string;
  excerpt: string;
  tickers: string[];
  sentiment?: string;
}

export async function getPortfolioNewsForUser(
  userId: string,
  opts?: { portfolioId?: string; maxArticles?: number },
): Promise<ServiceResult<{ articles: PortfolioNewsArticle[]; coverageTickers: string[] }>> {
  const holdings = await listHoldings(userId, opts?.portfolioId);
  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
  if (tickers.length === 0) {
    return {
      ok: true,
      data: {
        articles: [],
        coverageTickers: [],
      },
    };
  }

  const norm = tickers.map(normalizePortfolioNewsSymbol);
  const fromDb = await listPortfolioNewsForTickers(norm, 500);
  const ranked = rankPortfolioNewsForTickers(fromDb, tickers);
  const limit = Math.min(opts?.maxArticles ?? 15, 25);

  return {
    ok: true,
    data: {
      coverageTickers: tickers,
      articles: ranked.slice(0, limit).map((a) => ({
        title: a.title,
        source: a.source,
        publishedAt: a.publishedAt,
        excerpt: (a.summary || "").slice(0, 400),
        tickers: [...new Set(a.tickerSentiment.map((t) => t.ticker))].slice(0, 10),
        sentiment: a.overallSentiment || undefined,
      })),
    },
  };
}
