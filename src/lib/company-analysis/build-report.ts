/**
 * Shared fetch + assemble helpers for company-analysis GET
 * (full build and gap-only refill).
 */

import { YahooProvider } from "@/lib/api-providers/yahoo";
import {
  fetchEarningsBySymbol,
  fetchHouseTradesBySymbol,
  fetchSenateTradesBySymbol,
  fetchStockPeers,
  type FmpCongressTrade,
  type FmpEarningsEvent,
} from "@/lib/api-providers/fmp";
import type {
  CompanyOverview,
  FundamentalData,
  IncomeStatementReport,
  EarningsReport,
  InsiderTransaction,
  NewsArticle,
  ProviderHistoricalPoint,
  ProviderQuoteResult,
  StockDataProvider,
} from "@/lib/api-providers/types";
import { assembleReport, peerDistanceTo52wHigh } from "@/lib/company-analysis/assemble";
import { isEtfInstrument } from "@/lib/company-analysis/instrument";
import {
  mergeNextQuarterConsensus,
  pickNextQuarterFromEarningsRows,
  type NextQuarterConsensus,
} from "@/lib/company-analysis/next-quarter";
import {
  fmpEarningsToFundamentalData,
  mergeEarningsData,
} from "@/lib/company-analysis/earnings-merge";
import type { ReportGap } from "@/lib/company-analysis/gaps";
import type { CompanyAnalysisPeer, CompanyAnalysisReport } from "@/lib/company-analysis/types";
import { getGlobalFmpApiKey } from "@/lib/db";
import { disambiguateListing, yahooSymbolAliases } from "@/lib/market-symbol";

export function hasFmpKey(): boolean {
  return Boolean(getGlobalFmpApiKey() || process.env.FMP_API_KEY);
}

export async function settled<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    console.warn("[company-analysis] source failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Try primary ticker then Yahoo cross-listing aliases until quote or overview succeeds. */
async function fetchQuoteAndOverview(
  ticker: string,
  provider: StockDataProvider,
  isin?: string | null,
): Promise<{
  symbolUsed: string;
  quote: ProviderQuoteResult | null;
  overview: CompanyOverview | null;
}> {
  const listing = disambiguateListing({ ticker, isin: isin ?? undefined });
  const ordered = [listing.ticker, ...yahooSymbolAliases(listing.ticker)];
  if (listing.isin) {
    ordered.push(`${listing.isin}.SG`, listing.isin);
  }
  const candidates: string[] = [];
  const seen = new Set<string>();
  for (const sym of ordered) {
    const key = sym.trim().toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    candidates.push(sym.trim());
  }

  let lastQuote: ProviderQuoteResult | null = null;
  let lastOverview: CompanyOverview | null = null;
  for (const sym of candidates) {
    const [quote, overview] = await Promise.all([
      settled(provider.getQuote(sym)),
      settled(provider.getOverview?.(sym) ?? Promise.resolve(null)),
    ]);
    if (quote || overview) {
      return { symbolUsed: sym, quote, overview };
    }
    lastQuote = quote;
    lastOverview = overview;
  }
  return { symbolUsed: listing.ticker, quote: lastQuote, overview: lastOverview };
}

export async function loadCongress(symbol: string): Promise<FmpCongressTrade[] | null> {
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

export async function loadPeers(symbol: string): Promise<CompanyAnalysisPeer[]> {
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

export async function loadFmpEarnings(symbol: string): Promise<FmpEarningsEvent[] | null> {
  if (!hasFmpKey()) return null;
  try {
    return await fetchEarningsBySymbol(symbol);
  } catch (err) {
    console.warn(
      "[company-analysis] FMP earnings failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export interface BuildProviders {
  provider: StockDataProvider;
  intelProvider: StockDataProvider;
  usedYahoo: boolean;
  usedFmp: boolean;
}

export interface BuildReportOpts {
  isin?: string | null;
  instrumentKind?: "equity" | "etf";
}

export async function buildFullReport(
  ticker: string,
  providers: BuildProviders,
  generatedAt: string,
  opts?: BuildReportOpts,
): Promise<CompanyAnalysisReport | null> {
  const { provider, intelProvider, usedYahoo, usedFmp } = providers;
  const listing = disambiguateListing({ ticker, isin: opts?.isin ?? undefined });
  const analysisTicker = listing.ticker;
  const isin = listing.isin || opts?.isin || null;
  const yahooOutlook = new YahooProvider();
  const { symbolUsed, quote: quoteRes, overview: overviewRes } = await fetchQuoteAndOverview(
    analysisTicker,
    provider,
    isin,
  );
  const dataSymbol = symbolUsed;

  if (!quoteRes && !overviewRes) return null;

  const instrumentKind =
    opts?.instrumentKind ??
    (isEtfInstrument({
      quoteType: quoteRes?.quoteType,
      name: overviewRes?.name ?? quoteRes?.shortName,
    })
      ? "etf"
      : "equity");

  if (instrumentKind === "etf") {
    const [historyRes, newsRes, etfHoldings] = await Promise.all([
      settled(provider.getHistorical(dataSymbol, "1y")),
      settled(intelProvider.getNewsSentiment?.(dataSymbol) ?? Promise.resolve([])),
      settled(yahooOutlook.getETFHoldings(dataSymbol)),
    ]);
    return assembleReport({
      ticker: analysisTicker,
      symbolUsed: dataSymbol !== ticker ? dataSymbol : undefined,
      generatedAt,
      updatedAt: generatedAt,
      cached: false,
      quote: quoteRes,
      overview: overviewRes,
      history: historyRes,
      income: null,
      earnings: null,
      nextQuarter: null,
      news: newsRes,
      insiders: null,
      congress: null,
      peers: [],
      usedYahoo: true,
      usedFmp: false,
      instrumentKind: "etf",
      etfHoldings,
      isin,
    });
  }

  const [
    historyRes,
    incomeRes,
    earningsRes,
    newsRes,
    insiderRes,
    congressRes,
    yahooNext,
    fmpEarningsRows,
  ] = await Promise.all([
    settled(provider.getHistorical(dataSymbol, "1y")),
    settled(provider.getIncomeStatement?.(dataSymbol) ?? Promise.resolve(null)),
    settled(provider.getEarnings?.(dataSymbol) ?? Promise.resolve(null)),
    settled(intelProvider.getNewsSentiment?.(dataSymbol) ?? Promise.resolve([])),
    settled(intelProvider.getInsiderTransactions?.(dataSymbol) ?? Promise.resolve([])),
    loadCongress(dataSymbol),
    settled(yahooOutlook.getNextQuarterConsensus(dataSymbol)),
    loadFmpEarnings(dataSymbol),
  ]);

  const fmpEarningsData = fmpEarningsRows
    ? fmpEarningsToFundamentalData(fmpEarningsRows)
    : null;
  const earnings = mergeEarningsData(earningsRes, fmpEarningsData);
  const peers = await loadPeers(dataSymbol);

  const fmpNext = fmpEarningsRows
    ? pickNextQuarterFromEarningsRows(
        fmpEarningsRows.map((r) => ({
          reportDate: r.date || null,
          fiscalPeriodEnd: r.fiscalDateEnding || null,
          epsActual: r.eps,
          epsEstimated: r.epsEstimated,
          revenueActual: r.revenue,
          revenueEstimated: r.revenueEstimated,
        })),
      )
    : null;
  const nextQuarter = mergeNextQuarterConsensus(fmpNext, yahooNext);

  return assembleReport({
    ticker: analysisTicker,
    symbolUsed: dataSymbol !== ticker ? dataSymbol : undefined,
    generatedAt,
    updatedAt: generatedAt,
    cached: false,
    quote: quoteRes,
    overview: overviewRes,
    history: historyRes,
    income: incomeRes,
    earnings,
    nextQuarter,
    news: newsRes,
    insiders: insiderRes,
    congress: congressRes,
    peers,
    usedYahoo,
    usedFmp,
    instrumentKind: "equity",
    isin,
  });
}

/** Fetch only the sections listed in `gaps` and assemble a partial report for merging. */
export async function buildGapFillReport(
  ticker: string,
  gaps: ReportGap[],
  providers: BuildProviders,
  generatedAt: string,
  opts?: BuildReportOpts,
): Promise<CompanyAnalysisReport> {
  const { provider, intelProvider, usedYahoo, usedFmp } = providers;
  const instrumentKind = opts?.instrumentKind ?? "equity";
  const isEtf = instrumentKind === "etf";
  const needCore = gaps.includes("core");
  const needEarnings = !isEtf && (gaps.includes("earnings") || gaps.includes("nextQuarter") || needCore);
  const needNews = gaps.includes("news");
  const needInsiders = !isEtf && gaps.includes("insiders");
  const needCongress = !isEtf && gaps.includes("congress");
  const needAlt = !isEtf && gaps.includes("alternative");
  const needEtf = isEtf && (gaps.includes("etf") || needCore);

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
  let etfHoldings: Awaited<ReturnType<YahooProvider["getETFHoldings"]>> = null;

  const tasks: Promise<void>[] = [];

  if (needCore) {
    tasks.push(
      (async () => {
        const [q, o, h, inc] = await Promise.all([
          settled(provider.getQuote(ticker)),
          settled(provider.getOverview?.(ticker) ?? Promise.resolve(null)),
          settled(provider.getHistorical(ticker, "1y")),
          isEtf
            ? Promise.resolve(null)
            : settled(provider.getIncomeStatement?.(ticker) ?? Promise.resolve(null)),
        ]);
        quote = q;
        overview = o;
        history = h;
        income = inc;
      })(),
    );
  }

  if (needEarnings) {
    tasks.push(
      (async () => {
        const yahooOutlook = new YahooProvider();
        const [earningsRes, yahooNext, fmpEarningsRows] = await Promise.all([
          settled(provider.getEarnings?.(ticker) ?? Promise.resolve(null)),
          settled(yahooOutlook.getNextQuarterConsensus(ticker)),
          loadFmpEarnings(ticker),
        ]);
        const fmpEarningsData = fmpEarningsRows
          ? fmpEarningsToFundamentalData(fmpEarningsRows)
          : null;
        earnings = mergeEarningsData(earningsRes, fmpEarningsData);
        const fmpNext = fmpEarningsRows
          ? pickNextQuarterFromEarningsRows(
              fmpEarningsRows.map((r) => ({
                reportDate: r.date || null,
                fiscalPeriodEnd: r.fiscalDateEnding || null,
                epsActual: r.eps,
                epsEstimated: r.epsEstimated,
                revenueActual: r.revenue,
                revenueEstimated: r.revenueEstimated,
              })),
            )
          : null;
        nextQuarter = mergeNextQuarterConsensus(fmpNext, yahooNext);
      })(),
    );
  }

  if (needNews) {
    tasks.push(
      (async () => {
        news = await settled(intelProvider.getNewsSentiment?.(ticker) ?? Promise.resolve([]));
      })(),
    );
  }

  if (needInsiders) {
    tasks.push(
      (async () => {
        insiders = await settled(
          intelProvider.getInsiderTransactions?.(ticker) ?? Promise.resolve([]),
        );
      })(),
    );
  }

  if (needCongress) {
    tasks.push(
      (async () => {
        congress = await loadCongress(ticker);
      })(),
    );
  }

  if (needAlt) {
    tasks.push(
      (async () => {
        peers = await loadPeers(ticker);
      })(),
    );
  }

  if (needEtf) {
    tasks.push(
      (async () => {
        const yahoo = new YahooProvider();
        etfHoldings = await settled(yahoo.getETFHoldings(ticker));
      })(),
    );
  }

  await Promise.all(tasks);

  return assembleReport({
    ticker,
    generatedAt,
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
    usedYahoo,
    usedFmp: isEtf ? false : usedFmp,
    instrumentKind,
    etfHoldings,
    isin: opts?.isin ?? null,
  });
}
