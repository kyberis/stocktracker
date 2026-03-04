import type {
  StockDataProvider,
  ProviderQuoteResult,
  ProviderSearchResult,
  ProviderHistoricalPoint,
  CompanyOverview,
  TimePeriod,
  IncomeStatementReport,
  BalanceSheetReport,
  CashFlowReport,
  EarningsReport,
  FundamentalData,
  NewsArticle,
  InsiderTransaction,
  InstitutionalHolder,
  EarningsTranscript,
  EconIndicatorResult,
  EconDataPoint,
} from "./types";
import { providerRequestsTotal, providerRequestDuration } from "@/lib/metrics";

const AV_BASE = "https://www.alphavantage.co/query";
// 75 requests/minute ~= 800ms between calls. Keep slight safety buffer.
const AV_MIN_DELAY = 850;

let pendingChain: Promise<void> = Promise.resolve();
let lastCallTime = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    pendingChain = pendingChain
      .then(async () => {
        const now = Date.now();
        const elapsed = now - lastCallTime;
        if (lastCallTime > 0 && elapsed < AV_MIN_DELAY) {
          await sleep(AV_MIN_DELAY - elapsed);
        }
        lastCallTime = Date.now();
      })
      .then(() => fn().then(resolve, reject));
  });
}

async function avFetchRaw(params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(AV_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Alpha Vantage request failed: ${res.status}`);
  const data = await res.json();
  if (data["Information"]) throw new Error("Alpha Vantage rate limit reached");
  if (data["Error Message"]) throw new Error(data["Error Message"]);
  return data;
}

function parseFloat0(val: unknown): number {
  if (val === undefined || val === null || val === "None" || val === "-") return 0;
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

function parseFloatOrNull(val: unknown): number | null {
  if (val === undefined || val === null || val === "None" || val === "-" || val === "0") return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

export class AlphaVantageProvider implements StockDataProvider {
  readonly name = "alphavantage";
  private apiKey: string;
  private _callCount = 0;

  get callCount() {
    return this._callCount;
  }

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("Alpha Vantage API key is required");
    this.apiKey = apiKey;
  }

  private avFetch(params: Record<string, string>): Promise<Record<string, unknown>> {
    this._callCount++;
    const operation = (params.function || "unknown").toLowerCase();
    return throttled(async () => {
      const end = providerRequestDuration.startTimer({ provider: "alphavantage", operation });
      try {
        const result = await avFetchRaw({ ...params, apikey: this.apiKey });
        providerRequestsTotal.inc({ provider: "alphavantage", operation, status: "success" });
        return result;
      } catch (err) {
        providerRequestsTotal.inc({ provider: "alphavantage", operation, status: "error" });
        throw err;
      } finally {
        end();
      }
    });
  }

  async getQuote(symbol: string): Promise<ProviderQuoteResult> {
    const data = await this.avFetch({
      function: "GLOBAL_QUOTE",
      symbol,
    });

    const gq = data["Global Quote"] as Record<string, string> | undefined;
    if (!gq || !gq["05. price"]) {
      return {
        symbol,
        shortName: symbol,
        regularMarketPrice: 0,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        currency: "USD",
        regularMarketPreviousClose: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
        marketCap: 0,
        error: true,
      };
    }

    const price = parseFloat0(gq["05. price"]);
    const prevClose = parseFloat0(gq["08. previous close"]);
    const change = parseFloat0(gq["09. change"]);
    const changePercent = parseFloat0(gq["10. change percent"]?.replace("%", ""));
    const currency = this.inferCurrency(symbol);

    return {
      symbol: gq["01. symbol"] || symbol,
      shortName: symbol,
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
      currency,
      regularMarketPreviousClose: prevClose,
      fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0,
      marketCap: 0,
    };
  }

  private inferCurrency(symbol: string): string {
    const s = symbol.toUpperCase();
    if (s.endsWith(".MC") || s.endsWith(".BME")) return "EUR";
    if (s.endsWith(".DE") || s.endsWith(".F") || s.endsWith(".XETRA")) return "EUR";
    if (s.endsWith(".PA")) return "EUR";
    if (s.endsWith(".AS") || s.endsWith(".BR")) return "EUR";
    if (s.endsWith(".MI")) return "EUR";
    if (s.endsWith(".HE") || s.endsWith(".VI")) return "EUR";
    if (s.endsWith(".L")) return "GBP";
    if (s.endsWith(".CO")) return "DKK";
    if (s.endsWith(".TO") || s.endsWith(".V")) return "CAD";
    if (s.endsWith(".T")) return "JPY";
    if (s.endsWith(".SW")) return "CHF";
    return "USD";
  }

  async search(query: string): Promise<ProviderSearchResult[]> {
    const data = await this.avFetch({
      function: "SYMBOL_SEARCH",
      keywords: query,
    });

    const matches = (data["bestMatches"] || []) as Array<Record<string, string>>;
    return matches
      .filter((m) => m["3. type"] === "Equity" || m["3. type"] === "ETF")
      .slice(0, 8)
      .map((m) => ({
        symbol: m["1. symbol"],
        shortname: m["2. name"] || m["1. symbol"],
        exchange: m["4. region"] || "",
        quoteType: m["3. type"] || "Equity",
      }));
  }

  async getHistorical(
    symbol: string,
    period: TimePeriod
  ): Promise<ProviderHistoricalPoint[]> {
    let fn: string;
    let tsKey: string;
    const params: Record<string, string> = { symbol };

    if (period === "all") {
      fn = "TIME_SERIES_MONTHLY";
      tsKey = "Monthly Time Series";
    } else if (period === "1y") {
      fn = "TIME_SERIES_WEEKLY";
      tsKey = "Weekly Time Series";
    } else {
      fn = "TIME_SERIES_DAILY";
      tsKey = "Time Series (Daily)";
      params.outputsize = period === "6m" ? "full" : "compact";
    }

    params.function = fn;
    const data = await this.avFetch(params);
    const timeSeries = data[tsKey] as Record<string, Record<string, string>> | undefined;
    if (!timeSeries) return [];

    const now = new Date();
    let cutoffDate: Date;
    switch (period) {
      case "1w":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1m":
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "3m":
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "6m":
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case "1y":
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        cutoffDate = new Date(2000, 0, 1);
    }

    const entries = Object.entries(timeSeries)
      .filter(([dateStr]) => new Date(dateStr) >= cutoffDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, vals]) => ({
        date: dateStr,
        open: parseFloat0(vals["1. open"]),
        high: parseFloat0(vals["2. high"]),
        low: parseFloat0(vals["3. low"]),
        close: parseFloat0(vals["4. close"]),
        volume: parseFloat0(vals["5. volume"]),
      }));

    return entries;
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    const data = await this.avFetch({
      function: "CURRENCY_EXCHANGE_RATE",
      from_currency: from,
      to_currency: to,
    });

    const rate = data["Realtime Currency Exchange Rate"] as Record<string, string> | undefined;
    if (!rate) return 0;
    return parseFloat0(rate["5. Exchange Rate"]);
  }

  async getOverview(symbol: string): Promise<CompanyOverview | null> {
    const data = await this.avFetch({
      function: "OVERVIEW",
      symbol,
    });

    if (!data["Symbol"]) return null;

    const d = data as Record<string, string>;

    let analystRatings = null;
    if (d["AnalystRatingStrongBuy"]) {
      analystRatings = {
        strongBuy: parseInt(d["AnalystRatingStrongBuy"]) || 0,
        buy: parseInt(d["AnalystRatingBuy"]) || 0,
        hold: parseInt(d["AnalystRatingHold"]) || 0,
        sell: parseInt(d["AnalystRatingSell"]) || 0,
        strongSell: parseInt(d["AnalystRatingStrongSell"]) || 0,
      };
    }

    return {
      symbol: d["Symbol"],
      name: d["Name"],
      description: d["Description"],
      exchange: d["Exchange"],
      currency: d["Currency"],
      sector: d["Sector"],
      industry: d["Industry"],
      peRatio: parseFloatOrNull(d["PERatio"]),
      pegRatio: parseFloatOrNull(d["PEGRatio"]),
      eps: parseFloatOrNull(d["EPS"]),
      dividendPerShare: parseFloatOrNull(d["DividendPerShare"]),
      dividendYield: parseFloatOrNull(d["DividendYield"]),
      beta: parseFloatOrNull(d["Beta"]),
      profitMargin: parseFloatOrNull(d["ProfitMargin"]),
      returnOnEquity: parseFloatOrNull(d["ReturnOnEquityTTM"]),
      revenueTTM: parseFloatOrNull(d["RevenueTTM"]),
      analystTargetPrice: parseFloatOrNull(d["AnalystTargetPrice"]),
      analystRatings,
      fiftyDayMA: parseFloatOrNull(d["50DayMovingAverage"]),
      twoHundredDayMA: parseFloatOrNull(d["200DayMovingAverage"]),
      sharesOutstanding: parseFloatOrNull(d["SharesOutstanding"]),
      forwardPE: parseFloatOrNull(d["ForwardPE"]),
    };
  }

  async getIncomeStatement(symbol: string): Promise<FundamentalData<IncomeStatementReport> | null> {
    const data = await this.avFetch({ function: "INCOME_STATEMENT", symbol });
    const annual = data["annualReports"] as Array<Record<string, string>> | undefined;
    const quarterly = data["quarterlyReports"] as Array<Record<string, string>> | undefined;
    if (!annual && !quarterly) return null;

    const parse = (r: Record<string, string>): IncomeStatementReport => ({
      fiscalDateEnding: r["fiscalDateEnding"] || "",
      reportedCurrency: r["reportedCurrency"] || "USD",
      totalRevenue: parseFloatOrNull(r["totalRevenue"]),
      costOfRevenue: parseFloatOrNull(r["costOfRevenue"]),
      grossProfit: parseFloatOrNull(r["grossProfit"]),
      operatingExpenses: parseFloatOrNull(r["operatingExpenses"]),
      operatingIncome: parseFloatOrNull(r["operatingIncome"]),
      incomeBeforeTax: parseFloatOrNull(r["incomeBeforeTax"]),
      incomeTaxExpense: parseFloatOrNull(r["incomeTaxExpense"]),
      netIncome: parseFloatOrNull(r["netIncome"]),
      ebitda: parseFloatOrNull(r["ebitda"]),
      researchAndDevelopment: parseFloatOrNull(r["researchAndDevelopment"]),
      sellingGeneralAndAdmin: parseFloatOrNull(r["sellingGeneralAndAdministrative"]),
      interestExpense: parseFloatOrNull(r["interestExpense"]),
    });

    return {
      annual: (annual || []).map(parse),
      quarterly: (quarterly || []).slice(0, 12).map(parse),
    };
  }

  async getBalanceSheet(symbol: string): Promise<FundamentalData<BalanceSheetReport> | null> {
    const data = await this.avFetch({ function: "BALANCE_SHEET", symbol });
    const annual = data["annualReports"] as Array<Record<string, string>> | undefined;
    const quarterly = data["quarterlyReports"] as Array<Record<string, string>> | undefined;
    if (!annual && !quarterly) return null;

    const parse = (r: Record<string, string>): BalanceSheetReport => ({
      fiscalDateEnding: r["fiscalDateEnding"] || "",
      reportedCurrency: r["reportedCurrency"] || "USD",
      totalAssets: parseFloatOrNull(r["totalAssets"]),
      totalCurrentAssets: parseFloatOrNull(r["totalCurrentAssets"]),
      cashAndEquivalents: parseFloatOrNull(r["cashAndCashEquivalentsAtCarryingValue"]),
      totalNonCurrentAssets: parseFloatOrNull(r["totalNonCurrentAssets"]),
      totalLiabilities: parseFloatOrNull(r["totalLiabilities"]),
      totalCurrentLiabilities: parseFloatOrNull(r["totalCurrentLiabilities"]),
      totalNonCurrentLiabilities: parseFloatOrNull(r["totalNonCurrentLiabilities"]),
      totalShareholderEquity: parseFloatOrNull(r["totalShareholderEquity"]),
      retainedEarnings: parseFloatOrNull(r["retainedEarnings"]),
      longTermDebt: parseFloatOrNull(r["longTermDebt"]),
      shortTermDebt: parseFloatOrNull(r["shortTermDebt"]),
      commonStockSharesOutstanding: parseFloatOrNull(r["commonStockSharesOutstanding"]),
    });

    return {
      annual: (annual || []).map(parse),
      quarterly: (quarterly || []).slice(0, 12).map(parse),
    };
  }

  async getCashFlow(symbol: string): Promise<FundamentalData<CashFlowReport> | null> {
    const data = await this.avFetch({ function: "CASH_FLOW", symbol });
    const annual = data["annualReports"] as Array<Record<string, string>> | undefined;
    const quarterly = data["quarterlyReports"] as Array<Record<string, string>> | undefined;
    if (!annual && !quarterly) return null;

    const parse = (r: Record<string, string>): CashFlowReport => {
      const opCash = parseFloatOrNull(r["operatingCashflow"]);
      const capEx = parseFloatOrNull(r["capitalExpenditures"]);
      const fcf = opCash != null && capEx != null ? opCash - Math.abs(capEx) : null;
      return {
        fiscalDateEnding: r["fiscalDateEnding"] || "",
        reportedCurrency: r["reportedCurrency"] || "USD",
        operatingCashflow: opCash,
        capitalExpenditures: capEx,
        changeInCash: parseFloatOrNull(r["changeInCashAndCashEquivalents"]),
        freeCashFlow: fcf,
        dividendPayout: parseFloatOrNull(r["dividendPayout"]),
        shareRepurchase: parseFloatOrNull(r["paymentsForRepurchaseOfCommonStock"]),
        proceedsFromIssuanceOfDebt: parseFloatOrNull(r["proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet"]),
        paymentsForRepurchaseOfEquity: parseFloatOrNull(r["paymentsForRepurchaseOfEquity"]),
      };
    };

    return {
      annual: (annual || []).map(parse),
      quarterly: (quarterly || []).slice(0, 12).map(parse),
    };
  }

  async getEarnings(symbol: string): Promise<FundamentalData<EarningsReport> | null> {
    const data = await this.avFetch({ function: "EARNINGS", symbol });
    const annual = data["annualEarnings"] as Array<Record<string, string>> | undefined;
    const quarterly = data["quarterlyEarnings"] as Array<Record<string, string>> | undefined;
    if (!annual && !quarterly) return null;

    return {
      annual: (annual || []).slice(0, 10).map((r) => ({
        fiscalDateEnding: r["fiscalDateEnding"] || "",
        reportedEPS: parseFloatOrNull(r["reportedEPS"]),
        estimatedEPS: null,
        surprise: null,
        surprisePercentage: null,
      })),
      quarterly: (quarterly || []).slice(0, 16).map((r) => ({
        fiscalDateEnding: r["fiscalDateEnding"] || "",
        reportedEPS: parseFloatOrNull(r["reportedEPS"]),
        estimatedEPS: parseFloatOrNull(r["estimatedEPS"]),
        surprise: parseFloatOrNull(r["surprise"]),
        surprisePercentage: parseFloatOrNull(r["surprisePercentage"]),
      })),
    };
  }

  /* ── Alpha Intelligence ─────────────────────────────────────── */

  async getNewsSentiment(symbol: string): Promise<NewsArticle[]> {
    const data = await this.avFetch({
      function: "NEWS_SENTIMENT",
      tickers: symbol,
      limit: "50",
      sort: "LATEST",
    });

    const feed = data["feed"] as Array<Record<string, unknown>> | undefined;
    if (!feed) return [];

    return feed.map((item) => {
      const tickerSentiment = (
        (item["ticker_sentiment"] as Array<Record<string, string>>) || []
      ).map((ts) => ({
        ticker: ts["ticker"] || "",
        relevance: parseFloat0(ts["relevance_score"]),
        sentimentScore: parseFloat0(ts["ticker_sentiment_score"]),
        sentimentLabel: ts["ticker_sentiment_label"] || "",
      }));

      const topics = (
        (item["topics"] as Array<Record<string, string>>) || []
      ).map((t) => t["topic"] || "");

      return {
        title: String(item["title"] || ""),
        url: String(item["url"] || ""),
        source: String(item["source"] || ""),
        publishedAt: String(item["time_published"] || ""),
        summary: String(item["summary"] || ""),
        overallSentiment: String(item["overall_sentiment_label"] || ""),
        overallSentimentScore: parseFloat0(item["overall_sentiment_score"]),
        tickerSentiment,
        topics,
      };
    });
  }

  async getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
    const data = await this.avFetch({
      function: "INSIDER_TRANSACTIONS",
      symbol,
    });

    const txns = data["data"] as Array<Record<string, string>> | undefined;
    if (!txns) return [];

    return txns.slice(0, 50).map((r) => ({
      fullName: r["full_name"] || "",
      title: r["executive_title"] || "",
      transactionDate: r["transaction_date"] || "",
      transactionType: r["acquisition_or_disposition"] === "D" ? "Disposition" : "Acquisition",
      shares: parseFloat0(r["shares"]),
      sharePrice: parseFloat0(r["share_price"]),
      totalValue: parseFloat0(r["shares"]) * parseFloat0(r["share_price"]),
      sharesOwned: parseFloatOrNull(r["shares_total"]),
    }));
  }

  async getInstitutionalHoldings(symbol: string): Promise<InstitutionalHolder[]> {
    const data = await this.avFetch({
      function: "INSTITUTIONAL_OWNERSHIP",
      symbol,
    });

    const holders = data["data"] as Array<Record<string, string>> | undefined;
    if (!holders) return [];

    const latestQuarter = holders[0]?.["quarterEndDate"];
    if (!latestQuarter) return [];

    return holders
      .filter((h) => h["quarterEndDate"] === latestQuarter)
      .slice(0, 30)
      .map((r) => ({
        investor: r["investor"] || "",
        shares: parseFloat0(r["shares"]),
        value: parseFloat0(r["value"]),
        weight: parseFloat0(r["weight"]),
        quarterEndDate: r["quarterEndDate"] || "",
      }));
  }

  async getEarningsTranscript(symbol: string, quarter: string): Promise<EarningsTranscript | null> {
    const [y, q] = quarter.split("Q");
    const data = await this.avFetch({
      function: "EARNINGS_CALL_TRANSCRIPT",
      symbol,
      year: y,
      quarter: q,
    });

    const transcript = data["transcript"] as string | undefined;
    if (!transcript) return null;

    return {
      symbol,
      quarter,
      transcript,
      sentiment: String(data["sentiment"] || ""),
      sentimentScore: parseFloatOrNull(data["sentiment_score"]),
    };
  }

  /* ── Economic Indicators ─────────────────────────────────── */

  async getEconomicIndicator(
    func: string,
    interval?: string,
    maturity?: string
  ): Promise<EconIndicatorResult | null> {
    const VALID = new Set([
      "REAL_GDP", "REAL_GDP_PER_CAPITA", "TREASURY_YIELD",
      "FEDERAL_FUNDS_RATE", "CPI", "INFLATION",
      "RETAIL_SALES", "DURABLES", "UNEMPLOYMENT", "NONFARM_PAYROLL",
    ]);
    if (!VALID.has(func)) return null;

    const params = new URLSearchParams({ function: func, apikey: this.apiKey });
    if (interval) params.set("interval", interval);
    if (maturity) params.set("maturity", maturity);

    const operation = func.toLowerCase();
    const data = await throttled(async () => {
      this._callCount++;
      const end = providerRequestDuration.startTimer({ provider: "alphavantage", operation });
      try {
        const res = await fetch(`${AV_BASE}?${params}`);
        if (!res.ok) throw new Error(`AV ${func}: ${res.status}`);
        const json = await res.json();
        providerRequestsTotal.inc({ provider: "alphavantage", operation, status: "success" });
        return json;
      } catch (err) {
        providerRequestsTotal.inc({ provider: "alphavantage", operation, status: "error" });
        throw err;
      } finally {
        end();
      }
    });

    if (data["Error Message"] || data["Note"]) return null;

    const rawName = String(data["name"] || func);
    const rawInterval = String(data["interval"] || interval || "");
    const rawUnit = String(data["unit"] || "");
    const rawData = (data["data"] || []) as { date: string; value: string }[];

    return {
      name: rawName,
      interval: rawInterval,
      unit: rawUnit,
      data: rawData.map((d) => ({
        date: d.date,
        value: d.value === "." || d.value === "" ? null : parseFloat(d.value),
      })),
    };
  }

}
