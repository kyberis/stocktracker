import YahooFinance from "yahoo-finance2";
import type {
  StockDataProvider,
  ProviderQuoteResult,
  ProviderSearchResult,
  ProviderHistoricalPoint,
  SearchOptions,
  TimePeriod,
  CompanyOverview,
  FundamentalData,
  IncomeStatementReport,
  BalanceSheetReport,
  CashFlowReport,
  EarningsReport,
  ETFHoldingsData,
} from "./types";
import { providerRequestsTotal, providerRequestDuration } from "@/lib/metrics";
import { getCachedHistorical, cacheHistoricalPoints } from "@/lib/db/historical-cache";

const yahooFinance = new YahooFinance();

/**
 * In-memory TTL cache for Yahoo API results. Avoids redundant calls when
 * multiple users hold the same ticker and the cron / materialize runs
 * overlap, or when a user refreshes shortly after data was fetched.
 *
 * Key format: `quote:${symbol}`, `rate:${from}${to}`, `hist:${symbol}:${period}`.
 * Default TTL: 5 minutes (aligned with the snapshot bucket cadence).
 */
const QUOTE_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const quoteCache = new Map<string, CacheEntry<unknown>>();

/** Clears in-memory quote/rate/history cache (used by unit tests). */
export function clearYahooApiMemoryCache(): void {
  quoteCache.clear();
}

function getCached<T>(key: string): T | undefined {
  const entry = quoteCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    quoteCache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number = QUOTE_CACHE_TTL_MS): void {
  quoteCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** Evict expired entries periodically to prevent unbounded growth. */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of quoteCache) {
      if (now > entry.expiresAt) quoteCache.delete(key);
    }
  }, 60_000);
}

export class YahooProvider implements StockDataProvider {
  readonly name = "yahoo";

  async getQuote(symbol: string): Promise<ProviderQuoteResult> {
    const cacheKey = `quote:${symbol}`;
    const cached = getCached<ProviderQuoteResult>(cacheKey);
    if (cached) return cached;

    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "quote" });
    let ok = false;
    try {
      const quote = await yahooFinance.quote(symbol);
      ok = true;
      const qt =
        quote && typeof quote === "object" && "quoteType" in quote
          ? String((quote as { quoteType?: string }).quoteType || "")
          : "";
      const result: ProviderQuoteResult = {
        symbol: quote.symbol ?? symbol,
        shortName: quote.shortName || quote.longName || symbol,
        regularMarketPrice: quote.regularMarketPrice ?? 0,
        regularMarketChange: quote.regularMarketChange ?? 0,
        regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
        currency: quote.currency || "USD",
        regularMarketPreviousClose: quote.regularMarketPreviousClose ?? 0,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
        marketCap: quote.marketCap ?? 0,
        trailingAnnualDividendRate: quote.trailingAnnualDividendRate ?? undefined,
        trailingAnnualDividendYield: quote.trailingAnnualDividendYield ?? undefined,
        ...(qt ? { quoteType: qt } : {}),
      };
      setCache(cacheKey, result);
      return result;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "quote", status: ok ? "success" : "error" });
    }
  }

  async search(query: string, options?: SearchOptions): Promise<ProviderSearchResult[]> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "search" });
    let ok = false;
    try {
      const result = await yahooFinance.search(query, { quotesCount: 8 }, { validateResult: false }) as { quotes?: Array<Record<string, unknown>> };
      ok = true;
      const allowedTypes = new Set(["EQUITY", "ETF"]);
      if (options?.includeCrypto) allowedTypes.add("CRYPTOCURRENCY");
      return (result.quotes || [])
        .filter(
          (q): q is typeof q & { symbol: string; quoteType: string } =>
            "symbol" in q &&
            "quoteType" in q &&
            allowedTypes.has(String(q.quoteType))
        )
        .map((q) => ({
          symbol: q.symbol,
          shortname: String(
            ("shortname" in q ? q.shortname : "") ||
            ("longname" in q ? q.longname : "") ||
            q.symbol
          ),
          exchange: String(("exchange" in q ? q.exchange : "") || ""),
          quoteType: String(q.quoteType || ""),
        }));
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "search", status: ok ? "success" : "error" });
    }
  }

  async getHistorical(
    symbol: string,
    period: TimePeriod
  ): Promise<ProviderHistoricalPoint[]> {
    const cacheKey = `hist:${symbol}:${period}`;
    const memCached = getCached<ProviderHistoricalPoint[]>(cacheKey);
    if (memCached) return memCached;

    const now = new Date();
    let period1: Date;
    let interval: "1d" | "1wk" | "1mo" | "5m" = "1d";
    let intraday = false;

    switch (period) {
      case "1d":
        period1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        interval = "5m";
        intraday = true;
        break;
      case "1w":
        period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        interval = "1d";
        break;
      case "1m":
        period1 = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        interval = "1d";
        break;
      case "3m":
        period1 = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        interval = "1d";
        break;
      case "6m":
        period1 = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        interval = "1wk";
        break;
      case "1y":
        period1 = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        interval = "1wk";
        break;
      case "all":
        period1 = new Date(2000, 0, 1);
        interval = "1mo";
        break;
      default:
        period1 = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        interval = "1d";
    }

    // Intraday data is real-time — always fetch fresh, never persist
    if (intraday) {
      return this._fetchHistoricalFromYahoo(symbol, period1, now, interval, true, cacheKey);
    }

    // Non-intraday: check SQLite permanent cache first
    const startDate = period1.toISOString().slice(0, 10);
    try {
      const dbPoints = await getCachedHistorical(symbol);
      if (dbPoints.length > 0) {
        const inRange = dbPoints.filter((p) => p.date >= startDate);
        const latest = dbPoints[dbPoints.length - 1].date;
        const today = now.toISOString().slice(0, 10);
        const latestTs = new Date(latest).getTime();
        const todayTs = new Date(today).getTime();
        const gapDays = (todayTs - latestTs) / 86400000;

        // Cache is sufficient if it covers the range and is recent (within 3 days, to account for weekends)
        if (inRange.length > 0 && gapDays <= 3) {
          setCache(cacheKey, inRange);
          return inRange;
        }
      }
    } catch {
      // SQLite unavailable — fall through to Yahoo
    }

    // Fetch from Yahoo and persist daily points to SQLite
    return this._fetchHistoricalFromYahoo(symbol, period1, now, interval, false, cacheKey);
  }

  private async _fetchHistoricalFromYahoo(
    symbol: string,
    period1: Date,
    period2: Date,
    interval: "1d" | "1wk" | "1mo" | "5m",
    intraday: boolean,
    memCacheKey: string,
  ): Promise<ProviderHistoricalPoint[]> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "historical" });
    let ok = false;
    try {
      const result = await yahooFinance.chart(symbol, { period1, period2, interval });
      ok = true;
      const quotes = result.quotes ?? [];
      const points = quotes
        .filter((item) => item.close != null)
        .map((item) => ({
          date: intraday
            ? item.date.toISOString().replace("T", " ").slice(0, 16) + ":00"
            : item.date.toISOString().split("T")[0],
          open: item.open ?? 0,
          high: item.high ?? 0,
          low: item.low ?? 0,
          close: item.close ?? 0,
          volume: item.volume ?? 0,
        }));

      if (points.length > 0) {
        setCache(memCacheKey, points);
        // Persist non-intraday points to SQLite (fire-and-forget)
        if (!intraday) {
          cacheHistoricalPoints(symbol, points).catch(() => {});
        }
      }
      return points;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "historical", status: ok ? "success" : "error" });
    }
  }

  async getClassification(symbol: string): Promise<{ sector: string; region: string; assetClass: string } | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "classification" });
    let ok = false;
    try {
      // Tier 1: full equity profile (sector + region + quoteType)
      try {
        const result = await yahooFinance.quoteSummary(symbol, { modules: ["assetProfile", "quoteType"] });
        ok = true;
        const profile = result.assetProfile;
        const assetClass = yahooQuoteTypeToAssetClass(result.quoteType?.quoteType);
        return {
          sector: profile?.sector || assetClassAsSector(assetClass),
          region: profile?.country ?? "",
          assetClass,
        };
      } catch { /* assetProfile unavailable — try fund modules */ }

      // Tier 2: fund profile (category as sector proxy, works for ETFs/funds)
      try {
        const result = await yahooFinance.quoteSummary(symbol, { modules: ["fundProfile", "quoteType"] });
        ok = true;
        const assetClass = yahooQuoteTypeToAssetClass(result.quoteType?.quoteType);
        return {
          sector: result.fundProfile?.categoryName || assetClassAsSector(assetClass),
          region: "",
          assetClass,
        };
      } catch { /* fundProfile also unavailable — use plain quote */ }

      // Tier 3: quote() with relaxed validation (most reliable, works for
      // exotic symbols where quoteSummary validation rejects the response)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote: any = await yahooFinance.quote(symbol, {}, { validateResult: false });
      if (!quote) return null;
      ok = true;
      const assetClass = yahooQuoteTypeToAssetClass(quote.quoteType);
      return {
        sector: assetClassAsSector(assetClass),
        region: "",
        assetClass,
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "classification", status: ok ? "success" : "error" });
    }
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    const cacheKey = `rate:${from}${to}`;
    const cached = getCached<number>(cacheKey);
    if (cached !== undefined) return cached;

    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "exchange_rate" });
    let ok = false;
    try {
      const symbol = `${from}${to}=X`;
      const quote = await yahooFinance.quote(symbol);
      ok = true;
      const rate = quote.regularMarketPrice ?? 0;
      if (rate > 0) setCache(cacheKey, rate);
      return rate;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "exchange_rate", status: ok ? "success" : "error" });
    }
  }

  async getOverview(symbol: string): Promise<CompanyOverview | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "overview" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["summaryProfile", "summaryDetail", "financialData", "defaultKeyStatistics", "recommendationTrend"],
      });
      ok = true;

      const profile = result.summaryProfile;
      const detail = result.summaryDetail;
      const fin = result.financialData;
      const stats = result.defaultKeyStatistics;
      const rec = result.recommendationTrend;

      const trend = rec?.trend?.find((t) => t.period === "0m");

      return {
        symbol,
        name: profile?.longBusinessSummary ? symbol : symbol,
        description: profile?.longBusinessSummary ?? "",
        exchange: "",
        currency: fin?.financialCurrency ?? detail?.currency ?? "USD",
        sector: profile?.sector ?? "",
        industry: profile?.industry ?? "",
        peRatio: detail?.trailingPE ?? null,
        pegRatio: stats?.pegRatio ?? null,
        eps: fin?.revenuePerShare ?? null,
        dividendPerShare: detail?.dividendRate ?? null,
        dividendYield: detail?.dividendYield ?? null,
        beta: detail?.beta ?? null,
        profitMargin: fin?.profitMargins ?? null,
        returnOnEquity: fin?.returnOnEquity ?? null,
        revenueTTM: fin?.totalRevenue ?? null,
        analystTargetPrice: fin?.targetMeanPrice ?? null,
        analystRatings: trend
          ? { strongBuy: trend.strongBuy ?? 0, buy: trend.buy ?? 0, hold: trend.hold ?? 0, sell: trend.sell ?? 0, strongSell: trend.strongSell ?? 0 }
          : null,
        fiftyDayMA: detail?.fiftyDayAverage ?? null,
        twoHundredDayMA: detail?.twoHundredDayAverage ?? null,
        sharesOutstanding: stats?.sharesOutstanding ?? null,
        forwardPE: stats?.forwardPE ?? null,
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "overview", status: ok ? "success" : "error" });
    }
  }

  async getIncomeStatement(symbol: string): Promise<FundamentalData<IncomeStatementReport> | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "income_statement" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["incomeStatementHistory", "incomeStatementHistoryQuarterly"],
      });
      ok = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapRow = (row: any): IncomeStatementReport => ({
        fiscalDateEnding: row.endDate ? new Date(row.endDate).toISOString().slice(0, 10) : "",
        reportedCurrency: String(row.currency ?? row.reportedCurrency ?? "USD"),
        totalRevenue: numOrNull(row.totalRevenue),
        costOfRevenue: numOrNull(row.costOfRevenue),
        grossProfit: numOrNull(row.grossProfit),
        operatingExpenses: numOrNull(row.totalOperatingExpenses),
        operatingIncome: numOrNull(row.operatingIncome),
        incomeBeforeTax: numOrNull(row.incomeBeforeTax),
        incomeTaxExpense: numOrNull(row.incomeTaxExpense),
        netIncome: numOrNull(row.netIncome),
        ebitda: numOrNull(row.ebitda),
        researchAndDevelopment: numOrNull(row.researchDevelopment),
        sellingGeneralAndAdmin: numOrNull(row.sellingGeneralAdministrative),
        interestExpense: numOrNull(row.interestExpense),
      });

      return {
        annual: (result.incomeStatementHistory?.incomeStatementHistory ?? []).map(mapRow),
        quarterly: (result.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? []).map(mapRow),
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "income_statement", status: ok ? "success" : "error" });
    }
  }

  async getBalanceSheet(symbol: string): Promise<FundamentalData<BalanceSheetReport> | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "balance_sheet" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["balanceSheetHistory", "balanceSheetHistoryQuarterly"],
      });
      ok = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapRow = (row: any): BalanceSheetReport => {
        const totalAssets = numOrNull(row.totalAssets);
        const totalCurrentAssets = numOrNull(row.totalCurrentAssets);
        const totalLiabilities = numOrNull(row.totalLiab);
        const totalCurrentLiabilities = numOrNull(row.totalCurrentLiabilities);
        const nonCurrentAssets =
          numOrNull(row.totalNonCurrentAssets) ??
          (totalAssets != null && totalCurrentAssets != null
            ? totalAssets - totalCurrentAssets
            : null);
        const nonCurrentLiabilities =
          numOrNull(row.totalNonCurrentLiabilities) ??
          (totalLiabilities != null && totalCurrentLiabilities != null
            ? totalLiabilities - totalCurrentLiabilities
            : null);
        return {
        fiscalDateEnding: row.endDate ? new Date(row.endDate).toISOString().slice(0, 10) : "",
        reportedCurrency: String(row.currency ?? row.reportedCurrency ?? "USD"),
        totalAssets,
        totalCurrentAssets,
        cashAndEquivalents: numOrNull(row.cash),
        totalNonCurrentAssets: nonCurrentAssets,
        totalLiabilities,
        totalCurrentLiabilities,
        totalNonCurrentLiabilities: nonCurrentLiabilities,
        totalShareholderEquity: numOrNull(row.totalStockholderEquity),
        retainedEarnings: numOrNull(row.retainedEarnings),
        longTermDebt: numOrNull(row.longTermDebt),
        shortTermDebt: numOrNull(row.shortTermBorrowings),
        commonStockSharesOutstanding: numOrNull(row.commonStock),
      };
      };

      return {
        annual: (result.balanceSheetHistory?.balanceSheetStatements ?? []).map(mapRow),
        quarterly: (result.balanceSheetHistoryQuarterly?.balanceSheetStatements ?? []).map(mapRow),
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "balance_sheet", status: ok ? "success" : "error" });
    }
  }

  async getCashFlow(symbol: string): Promise<FundamentalData<CashFlowReport> | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "cash_flow" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["cashflowStatementHistory", "cashflowStatementHistoryQuarterly"],
      });
      ok = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapRow = (row: any): CashFlowReport => ({
        fiscalDateEnding: row.endDate ? new Date(row.endDate).toISOString().slice(0, 10) : "",
        reportedCurrency: String(row.currency ?? row.reportedCurrency ?? "USD"),
        operatingCashflow: numOrNull(row.totalCashFromOperatingActivities),
        capitalExpenditures: numOrNull(row.capitalExpenditures),
        changeInCash: numOrNull(row.changeInCash),
        freeCashFlow: numOrNull(row.freeCashFlow),
        dividendPayout: numOrNull(row.dividendsPaid),
        shareRepurchase: numOrNull(row.repurchaseOfStock),
        proceedsFromIssuanceOfDebt: numOrNull(row.netBorrowings),
        paymentsForRepurchaseOfEquity: numOrNull(row.repurchaseOfStock),
      });

      return {
        annual: (result.cashflowStatementHistory?.cashflowStatements ?? []).map(mapRow),
        quarterly: (result.cashflowStatementHistoryQuarterly?.cashflowStatements ?? []).map(mapRow),
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "cash_flow", status: ok ? "success" : "error" });
    }
  }

  async getEarnings(symbol: string): Promise<FundamentalData<EarningsReport> | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "earnings" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["earningsHistory"],
      });
      ok = true;

      const history = result.earningsHistory?.history ?? [];
      const quarterly: EarningsReport[] = history.map((row) => ({
        fiscalDateEnding: row.quarter ? new Date(row.quarter).toISOString().slice(0, 10) : "",
        reportedEPS: numOrNull(row.epsActual),
        estimatedEPS: numOrNull(row.epsEstimate),
        surprise: numOrNull(row.epsDifference),
        surprisePercentage: numOrNull(row.surprisePercent),
      }));

      const annualByYear = new Map<string, EarningsReport>();
      for (const q of quarterly) {
        const year = q.fiscalDateEnding.slice(0, 4);
        if (!year) continue;
        if (!annualByYear.has(year)) annualByYear.set(year, q);
      }
      const annual = Array.from(annualByYear.values()).sort((a, b) =>
        b.fiscalDateEnding.localeCompare(a.fiscalDateEnding)
      );

      return { annual, quarterly };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "earnings", status: ok ? "success" : "error" });
    }
  }

  async getETFHoldings(symbol: string): Promise<ETFHoldingsData | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "etf_holdings" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["topHoldings", "fundProfile"],
      });
      ok = true;

      const th = result.topHoldings;
      const fp = result.fundProfile;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const holdings = (th?.holdings ?? []).map((h: any) => ({
        symbol: String(h.symbol ?? ""),
        name: String(h.holdingName ?? h.symbol ?? ""),
        weight: typeof h.holdingPercent === "number" ? h.holdingPercent * 100 : 0,
      }));

      const sectorWeightings: ETFHoldingsData["sectorWeightings"] = [];
      if (th?.sectorWeightings) {
        for (const entry of th.sectorWeightings) {
          // Each entry is an object with a single key-value pair { sectorName: weight }
          for (const [sector, weight] of Object.entries(entry)) {
            if (typeof weight === "number" && weight > 0) {
              sectorWeightings.push({ sector, weight: weight * 100 });
            }
          }
        }
      }

      return {
        holdings,
        sectorWeightings: sectorWeightings.sort((a, b) => b.weight - a.weight),
        category: String(fp?.categoryName ?? ""),
        fundFamily: String(fp?.family ?? ""),
        legalType: String(fp?.legalType ?? ""),
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "etf_holdings", status: ok ? "success" : "error" });
    }
  }
}

function yahooQuoteTypeToAssetClass(quoteType?: string): string {
  switch (quoteType) {
    case "ETF": return "ETF";
    case "MUTUALFUND": return "Fund";
    case "CRYPTOCURRENCY": return "Cryptocurrency";
    default: return "Equity";
  }
}

/** Provides a meaningful sector label for non-equity instruments so they don't
 *  land in "Unclassified" in the Sector taxonomy view. */
function assetClassAsSector(assetClass: string): string {
  switch (assetClass) {
    case "ETF": return "ETF";
    case "Fund": return "Fund";
    case "Cryptocurrency": return "Cryptocurrency";
    default: return "";
  }
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
