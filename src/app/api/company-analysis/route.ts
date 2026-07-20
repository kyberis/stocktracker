export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import {
  fetchEarningsBySymbol,
  fetchHouseTradesBySymbol,
  fetchSenateTradesBySymbol,
  fetchStockPeers,
  type FmpCongressTrade,
} from "@/lib/api-providers/fmp";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import type {
  CompanyOverview,
  FundamentalData,
  IncomeStatementReport,
  EarningsReport,
  InsiderTransaction,
  NewsArticle,
  ProviderHistoricalPoint,
  ProviderQuoteResult,
} from "@/lib/api-providers/types";
import { requireFeatureQuota, requireRateLimit, requireSession } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { assembleReport, peerDistanceTo52wHigh } from "@/lib/company-analysis/assemble";
import { getCompanyAnalysisCache, setCompanyAnalysisCache } from "@/lib/company-analysis/cache";
import {
  mergeNextQuarterConsensus,
  pickNextQuarterFromEarningsRows,
  type NextQuarterConsensus,
} from "@/lib/company-analysis/next-quarter";
import { parseTicker } from "@/lib/company-analysis/ticker";
import type { CompanyAnalysisPeer, CompanyAnalysisReport } from "@/lib/company-analysis/types";
import { json401 } from "@/lib/log-unauthorized";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import {
  resolveFundamentalsProvider,
  resolvePremiumStockDataProvider,
} from "@/lib/market-data/resolve-provider";
import { deferTask } from "@/lib/task-runner";
import { withMetrics } from "@/lib/with-metrics";
import { getGlobalFmpApiKey } from "@/lib/db";

const CACHE_TTL_MS = 30 * 60 * 1000;

function hasFmpKey(): boolean {
  return Boolean(getGlobalFmpApiKey() || process.env.FMP_API_KEY);
}

async function settled<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    console.warn("[company-analysis] source failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function loadCongress(symbol: string): Promise<FmpCongressTrade[] | null> {
  if (!hasFmpKey()) return null;
  try {
    const [senate, house] = await Promise.all([
      fetchSenateTradesBySymbol(symbol),
      fetchHouseTradesBySymbol(symbol),
    ]);
    return [...senate, ...house];
  } catch (err) {
    console.warn("[company-analysis] congress failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function loadPeers(symbol: string): Promise<CompanyAnalysisPeer[]> {
  if (!hasFmpKey()) return [];
  try {
    const peerTickers = (await fetchStockPeers(symbol)).filter((t) => t !== symbol).slice(0, 6);
    if (!peerTickers.length) return [];
    const yahoo = new YahooProvider();
    const quotes = await Promise.all(
      peerTickers.map(async (t) => {
        const q = await settled(yahoo.getQuote(t));
        return { ticker: t, q };
      }),
    );
    return quotes.map(({ ticker, q }) => ({
      ticker,
      name: q?.shortName ?? null,
      price: q?.regularMarketPrice ?? null,
      distanceTo52wHighPct: peerDistanceTo52wHigh(
        q?.regularMarketPrice ?? null,
        q?.fiftyTwoWeekHigh ?? null,
      ),
      ma50: null,
      ma200: null,
    }));
  } catch (err) {
    console.warn("[company-analysis] peers failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

async function loadFmpNextQuarter(symbol: string): Promise<NextQuarterConsensus | null> {
  if (!hasFmpKey()) return null;
  try {
    const rows = await fetchEarningsBySymbol(symbol);
    return pickNextQuarterFromEarningsRows(
      rows.map((r) => ({
        reportDate: r.date || null,
        fiscalPeriodEnd: r.fiscalDateEnding || null,
        epsActual: r.eps,
        epsEstimated: r.epsEstimated,
        revenueActual: r.revenue,
        revenueEstimated: r.revenueEstimated,
      })),
    );
  } catch (err) {
    console.warn(
      "[company-analysis] FMP earnings outlook failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export const GET = withMetrics("/api/company-analysis", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const ticker = parseTicker(searchParams.get("symbol") ?? searchParams.get("ticker"));
  if (!ticker) {
    return Response.json(
      { error: "Valid ticker required (pattern ^[A-Z0-9.\\-]{1,10}$)" },
      { status: 400 },
    );
  }

  const cacheKey = `company-analysis:${ticker}`;
  const fresh = searchParams.get("fresh") === "1";
  if (!fresh) {
    const cached = getCompanyAnalysisCache<CompanyAnalysisReport>(cacheKey);
    if (cached) {
      const { error: sessionErr } = await requireSession(request);
      if (sessionErr) return sessionErr;
      return Response.json({ ...cached, cached: true }, {
        headers: { "Cache-Control": "private, max-age=1800" },
      });
    }
  }

  const { session, error } = await requireFeatureQuota(request, "company_analysis");
  if (error) return error;
  if (!session) return json401(request, { source: "api/company-analysis", reason: "no_session" });

  const rl = await requireRateLimit(request, "fmp");
  if (rl.error) {
    await refundFeatureQuota(session.userId, "company_analysis");
    return rl.error;
  }

  const fundamentalsResolved = await resolveFundamentalsProvider(session.userId);
  const premiumResolved = await resolvePremiumStockDataProvider(session.userId, "intelligence");
  const provider = fundamentalsResolved.provider;
  const intelProvider = premiumResolved?.provider ?? provider;

  let quote: ProviderQuoteResult | null = null;
  let overview: CompanyOverview | null = null;
  let history: ProviderHistoricalPoint[] | null = null;
  let income: FundamentalData<IncomeStatementReport> | null = null;
  let earnings: FundamentalData<EarningsReport> | null = null;
  let news: NewsArticle[] | null = null;
  let insiders: InsiderTransaction[] | null = null;
  let congress: FmpCongressTrade[] | null = null;
  let peers: CompanyAnalysisPeer[] = [];
  let nextQuarter: NextQuarterConsensus | null = null;

  try {
    const yahooOutlook = new YahooProvider();
    const [
      quoteRes,
      overviewRes,
      historyRes,
      incomeRes,
      earningsRes,
      newsRes,
      insiderRes,
      congressRes,
      yahooNext,
      fmpNext,
    ] = await Promise.all([
      settled(provider.getQuote(ticker)),
      settled(provider.getOverview?.(ticker) ?? Promise.resolve(null)),
      settled(provider.getHistorical(ticker, "1y")),
      settled(provider.getIncomeStatement?.(ticker) ?? Promise.resolve(null)),
      settled(provider.getEarnings?.(ticker) ?? Promise.resolve(null)),
      settled(intelProvider.getNewsSentiment?.(ticker) ?? Promise.resolve([])),
      settled(intelProvider.getInsiderTransactions?.(ticker) ?? Promise.resolve([])),
      loadCongress(ticker),
      settled(yahooOutlook.getNextQuarterConsensus(ticker)),
      loadFmpNextQuarter(ticker),
    ]);

    quote = quoteRes;
    overview = overviewRes;
    history = historyRes;
    income = incomeRes;
    earnings = earningsRes;
    news = newsRes;
    insiders = insiderRes;
    congress = congressRes;
    peers = await loadPeers(ticker);
    // Prefer FMP unreported row (exact revenue/EPS) when present; fill gaps from Yahoo 0q.
    nextQuarter = mergeNextQuarterConsensus(fmpNext, yahooNext);

    if (!quote && !overview) {
      await refundFeatureQuota(session.userId, "company_analysis");
      return Response.json(
        { error: `No market data available for ${ticker}` },
        { status: 404 },
      );
    }

    const report = assembleReport({
      ticker,
      updatedAt: new Date().toISOString(),
      cached: false,
      quote,
      overview,
      history,
      income,
      earnings,
      nextQuarter,
      news,
      insiders,
      congress,
      peers,
      usedYahoo: fundamentalsResolved.backend === "yahoo" || !premiumResolved,
      usedFmp: Boolean(premiumResolved) || hasFmpKey(),
    });

    setCompanyAnalysisCache(cacheKey, report, CACHE_TTL_MS);

    return jsonWithCallCount(provider, report, {
      headers: { "Cache-Control": "private, max-age=1800" },
    });
  } catch (err) {
    console.error("[company-analysis] Error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(session.userId, "company_analysis");
    return Response.json({ error: "Failed to build company analysis" }, { status: 500 });
  } finally {
    const count = (provider.callCount ?? 0) + (intelProvider.callCount ?? 0);
    if (session.userId && count > 0) {
      const backend = premiumResolved?.backend ?? fundamentalsResolved.backend;
      if (backend === "fmp") {
        deferTask(() => recordMarketDataUsageAsync(session.userId, "fmp", count));
      }
    }
  }
});
