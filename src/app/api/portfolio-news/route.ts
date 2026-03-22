import { NextRequest } from "next/server";
import { createProvider } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { fetchFinnhubPortfolioNews } from "@/lib/api-providers/finnhub-news";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { getGlobalAlphaVantageApiKey } from "@/lib/db";
import { listHoldings } from "@/lib/db";
import { recordAvUsageAsync } from "@/lib/rate-limit";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";

export const dynamic = "force-dynamic";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY ?? "";

function deriveTickers(holdings: { ticker: string; valueInEUR?: number | null }[]): string[] {
  const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
  const VALID_TICKER = /^[A-Za-z0-9:_-]+$/;

  return holdings
    .sort((a, b) => (b.valueInEUR ?? 0) - (a.valueInEUR ?? 0))
    .map((h) => h.ticker.includes(".") ? h.ticker.split(".")[0] : h.ticker)
    .filter((t) => t.length > 0 && t.length <= 10 && !ISIN_RE.test(t) && VALID_TICKER.test(t))
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 10);
}

export const GET = withMetrics("/api/portfolio-news", async (request: NextRequest) => {
  const { session, error } = await requireFeatureAccess(request, "intelligence");
  if (error) return error;

  const rl = await requireRateLimit(request, "alphavantage");
  if (rl.error) return rl.error;

  const userId = rl.session?.userId ?? session!.userId;
  const portfolioId = request.nextUrl.searchParams.get("portfolioId") || undefined;

  const holdings = await listHoldings(userId, portfolioId);
  if (holdings.length === 0) {
    return Response.json([]);
  }

  const tickers = deriveTickers(holdings);
  if (tickers.length === 0) {
    return Response.json([]);
  }

  const avKey = getGlobalAlphaVantageApiKey();

  if (avKey) {
    const provider = createProvider("alphavantage", avKey);
    try {
      if (typeof provider.getPortfolioNewsSentiment === "function") {
        const articles = await provider.getPortfolioNewsSentiment(tickers);
        if (articles.length > 0) {
          const sorted = articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
          return jsonWithCallCount(provider, sorted.slice(0, 30));
        }
      }
    } catch (err) {
      console.warn(
        "Alpha Vantage news failed, trying Finnhub fallback:",
        err instanceof Error ? err.message : err,
      );
    } finally {
      if (userId && provider.callCount) {
        deferTask(() => recordAvUsageAsync(userId, provider.callCount!));
      }
    }
  }

  if (FINNHUB_API_KEY) {
    try {
      const articles = await fetchFinnhubPortfolioNews(tickers, FINNHUB_API_KEY);
      return Response.json(articles);
    } catch (err) {
      console.error(
        "Finnhub news fallback failed:",
        err instanceof Error ? err.message : err,
      );
      return Response.json({ error: "Failed to fetch news" }, { status: 500 });
    }
  }

  if (!avKey) {
    return Response.json(
      { error: "No news provider configured" },
      { status: 400 },
    );
  }

  return Response.json([]);
});
