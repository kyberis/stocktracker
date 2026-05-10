import { FMP_STABLE_BASE } from "./fmp";
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
  SearchOptions,
  DividendEvent,
} from "./types";
import { providerRequestsTotal, providerRequestDuration } from "@/lib/metrics";

function parseFloat0(val: unknown): number {
  if (val === undefined || val === null || val === "None" || val === "-") return 0;
  const n = parseFloat(String(val));
  return Number.isNaN(n) ? 0 : n;
}

function parseFloatOrNull(val: unknown): number | null {
  if (val === undefined || val === null || val === "None" || val === "-" || val === "") return null;
  const n = parseFloat(String(val));
  return Number.isNaN(n) ? null : n;
}

/** Map Alpha Vantage economic `function` names to FMP `economic-indicators` names where applicable. */
const AV_ECON_TO_FMP_NAME: Record<string, string> = {
  REAL_GDP: "GDP",
  REAL_GDP_PER_CAPITA: "Real GDP Per Capita",
  TREASURY_YIELD: "10-Year Treasury Rate",
  FEDERAL_FUNDS_RATE: "Federal Funds Rate",
  CPI: "CPI",
  INFLATION: "Inflation Rate YoY",
  RETAIL_SALES: "Retail Sales",
  DURABLES: "Durable Goods",
  UNEMPLOYMENT: "Unemployment Rate",
  NONFARM_PAYROLL: "Non Farm Payrolls",
};

export class FmpMarketDataProvider implements StockDataProvider {
  readonly name = "fmp";
  private apiKey: string;
  private _callCount = 0;

  get callCount() {
    return this._callCount;
  }

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("FMP API key is required");
    this.apiKey = apiKey;
  }

  private async fmpFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    this._callCount++;
    const url = new URL(`${FMP_STABLE_BASE}/${endpoint}`);
    url.searchParams.set("apikey", this.apiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const operation = endpoint.split("/")[0] || endpoint;
    const end = providerRequestDuration.startTimer({ provider: "fmp", operation });
    try {
      const res = await fetch(url.toString());
      const text = await res.text();
      if (!res.ok || text.includes("Restricted Endpoint")) {
        providerRequestsTotal.inc({ provider: "fmp", operation, status: "error" });
        throw new Error(`FMP ${endpoint}: ${res.status} ${text.slice(0, 200)}`);
      }
      const data = JSON.parse(text) as T;
      providerRequestsTotal.inc({ provider: "fmp", operation, status: "success" });
      return data;
    } catch (err) {
      providerRequestsTotal.inc({ provider: "fmp", operation, status: "error" });
      throw err;
    } finally {
      end();
    }
  }

  async getQuote(symbol: string): Promise<ProviderQuoteResult> {
    const rows = await this.fmpFetch<Array<Record<string, unknown>>>("quote", { symbol });
    const q = rows[0];
    if (!q) {
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
    const price = parseFloat0(q.price ?? q["regularMarketPrice"]);
    const prev = parseFloat0(q.previousClose ?? q["previousClose"]);
    const change = parseFloat0(q.change ?? q["changes"]);
    const pct = parseFloat0(q.changePercentage ?? q["changesPercentage"]);
    return {
      symbol: String(q.symbol ?? symbol),
      shortName: String(q.name ?? symbol),
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: pct,
      currency: String(q.currency ?? "USD"),
      regularMarketPreviousClose: prev,
      fiftyTwoWeekHigh: parseFloat0(q.yearHigh),
      fiftyTwoWeekLow: parseFloat0(q.yearLow),
      marketCap: parseFloat0(q.marketCap),
    };
  }

  async search(query: string, options?: SearchOptions): Promise<ProviderSearchResult[]> {
    const raw = await this.fmpFetch<Array<Record<string, unknown>>>("search-symbol", { query });
    const allowed = new Set(["stock", "etf", "trust"]);
    const out: ProviderSearchResult[] = [];
    for (const r of raw) {
      const type = String(r.type ?? "").toLowerCase();
      if (type === "cryptocurrency" && !options?.includeCrypto) continue;
      if (type && !allowed.has(type) && type !== "cryptocurrency") continue;
      out.push({
        symbol: String(r.symbol ?? ""),
        shortname: String(r.name ?? r.symbol ?? ""),
        exchange: String(r.stockExchange ?? r.exchangeShortName ?? ""),
        quoteType: type === "etf" ? "ETF" : type === "cryptocurrency" ? "CRYPTOCURRENCY" : "EQUITY",
      });
      if (out.length >= 8) break;
    }
    return out;
  }

  async getHistorical(symbol: string, period: TimePeriod): Promise<ProviderHistoricalPoint[]> {
    const data = await this.fmpFetch<unknown>("historical-price-eod/full", { symbol });
    const raw = Array.isArray(data)
      ? data
      : (data as { historical?: Array<Record<string, unknown>> })?.historical ?? [];
    if (!Array.isArray(raw) || raw.length === 0) return [];

    const now = new Date();
    let cutoff: Date;
    switch (period) {
      case "1w":
        cutoff = new Date(now.getTime() - 7 * 86400000);
        break;
      case "1m":
        cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "3m":
        cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "6m":
        cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case "1y":
        cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "all":
        cutoff = new Date(2000, 0, 1);
        break;
      default:
        cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
    const cutStr = cutoff.toISOString().slice(0, 10);

    const points: ProviderHistoricalPoint[] = [];
    for (const row of raw) {
      const d = String(row.date ?? "");
      if (d < cutStr) continue;
      points.push({
        date: d,
        open: parseFloat0(row.open),
        high: parseFloat0(row.high),
        low: parseFloat0(row.low),
        close: parseFloat0(row.close),
        volume: parseFloat0(row.volume),
      });
    }
    points.sort((a, b) => a.date.localeCompare(b.date));
    return points;
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    const sym = `${from}${to}`.toUpperCase();
    const rows = await this.fmpFetch<Array<Record<string, unknown>>>("quote-short", { symbol: sym });
    const q = rows[0];
    if (!q) return 0;
    return parseFloat0(q.price);
  }

  async getOverview(symbol: string): Promise<CompanyOverview | null> {
    const rows = await this.fmpFetch<Array<Record<string, unknown>>>("profile", { symbol });
    const p = rows[0];
    if (!p) return null;

    return {
      symbol: String(p.symbol ?? symbol),
      name: String(p.companyName ?? p.name ?? symbol),
      description: String(p.description ?? ""),
      exchange: String(p.exchangeShortName ?? p.exchange ?? ""),
      currency: String(p.currency ?? "USD"),
      sector: String(p.sector ?? ""),
      industry: String(p.industry ?? ""),
      peRatio: parseFloatOrNull(p.pe),
      pegRatio: parseFloatOrNull(p.peg),
      eps: parseFloatOrNull(p.eps),
      dividendPerShare: parseFloatOrNull(p.lastDiv),
      dividendYield: parseFloatOrNull(p.dividendYield),
      beta: parseFloatOrNull(p.beta),
      profitMargin: parseFloatOrNull(p.grossProfitMargin ?? p.profitMargin),
      returnOnEquity: parseFloatOrNull(p.roe),
      revenueTTM: parseFloatOrNull(p.revenue),
      analystTargetPrice: parseFloatOrNull(p.priceTarget),
      analystRatings: null,
      fiftyDayMA: parseFloatOrNull(p.price ?? p.movingAverage50),
      twoHundredDayMA: parseFloatOrNull(p.movingAverage200),
      sharesOutstanding: parseFloatOrNull(p.sharesOutstanding),
      forwardPE: parseFloatOrNull(p.forwardPE),
    };
  }

  private mapIncomeRow(r: Record<string, unknown>): IncomeStatementReport {
    return {
      fiscalDateEnding: String(r.date ?? r.calendarYear ?? ""),
      reportedCurrency: String(r.reportedCurrency ?? "USD"),
      totalRevenue: parseFloatOrNull(r.revenue),
      costOfRevenue: parseFloatOrNull(r.costOfRevenue),
      grossProfit: parseFloatOrNull(r.grossProfit),
      operatingExpenses: parseFloatOrNull(r.operatingExpenses),
      operatingIncome: parseFloatOrNull(r.operatingIncome),
      incomeBeforeTax: parseFloatOrNull(r.incomeBeforeTax),
      incomeTaxExpense: parseFloatOrNull(r.incomeTaxExpense),
      netIncome: parseFloatOrNull(r.netIncome),
      ebitda: parseFloatOrNull(r.ebitda),
      researchAndDevelopment: parseFloatOrNull(r.researchAndDevelopmentExpenses),
      sellingGeneralAndAdmin: parseFloatOrNull(r.sellingGeneralAndAdministrativeExpenses),
      interestExpense: parseFloatOrNull(r.interestExpense),
    };
  }

  async getIncomeStatement(symbol: string): Promise<FundamentalData<IncomeStatementReport> | null> {
    const [annual, quarterly] = await Promise.all([
      this.fmpFetch<Array<Record<string, unknown>>>("income-statement", { symbol, period: "annual" }),
      this.fmpFetch<Array<Record<string, unknown>>>("income-statement", { symbol, period: "quarter", limit: "12" }),
    ]);
    if ((!annual || annual.length === 0) && (!quarterly || quarterly.length === 0)) return null;
    return {
      annual: (annual || []).map((r) => this.mapIncomeRow(r)),
      quarterly: (quarterly || []).slice(0, 12).map((r) => this.mapIncomeRow(r)),
    };
  }

  private mapBalanceRow(r: Record<string, unknown>): BalanceSheetReport {
    return {
      fiscalDateEnding: String(r.date ?? ""),
      reportedCurrency: String(r.reportedCurrency ?? "USD"),
      totalAssets: parseFloatOrNull(r.totalAssets),
      totalCurrentAssets: parseFloatOrNull(r.totalCurrentAssets),
      cashAndEquivalents: parseFloatOrNull(r.cashAndCashEquivalents),
      totalNonCurrentAssets: parseFloatOrNull(r.totalNonCurrentAssets),
      totalLiabilities: parseFloatOrNull(r.totalLiabilities),
      totalCurrentLiabilities: parseFloatOrNull(r.totalCurrentLiabilities),
      totalNonCurrentLiabilities: parseFloatOrNull(r.totalNonCurrentLiabilities),
      totalShareholderEquity: parseFloatOrNull(r.totalStockholdersEquity ?? r.totalShareholderEquity),
      retainedEarnings: parseFloatOrNull(r.retainedEarnings),
      longTermDebt: parseFloatOrNull(r.longTermDebt),
      shortTermDebt: parseFloatOrNull(r.shortTermDebt ?? r.shortTermDebtNet),
      commonStockSharesOutstanding: parseFloatOrNull(r.commonStockSharesOutstanding),
    };
  }

  async getBalanceSheet(symbol: string): Promise<FundamentalData<BalanceSheetReport> | null> {
    const [annual, quarterly] = await Promise.all([
      this.fmpFetch<Array<Record<string, unknown>>>("balance-sheet-statement", { symbol, period: "annual" }),
      this.fmpFetch<Array<Record<string, unknown>>>("balance-sheet-statement", { symbol, period: "quarter", limit: "12" }),
    ]);
    if ((!annual || annual.length === 0) && (!quarterly || quarterly.length === 0)) return null;
    return {
      annual: (annual || []).map((r) => this.mapBalanceRow(r)),
      quarterly: (quarterly || []).slice(0, 12).map((r) => this.mapBalanceRow(r)),
    };
  }

  private mapCashFlowRow(r: Record<string, unknown>): CashFlowReport {
    const op = parseFloatOrNull(r.netCashProvidedByOperatingActivities ?? r.operatingCashFlow);
    const capEx = parseFloatOrNull(r.capitalExpenditure ?? r.capitalExpenditures);
    const fcf = op != null && capEx != null ? op - Math.abs(capEx) : null;
    return {
      fiscalDateEnding: String(r.date ?? ""),
      reportedCurrency: String(r.reportedCurrency ?? "USD"),
      operatingCashflow: op,
      capitalExpenditures: capEx,
      changeInCash: parseFloatOrNull(r.changeInCashAndCashEquivalents ?? r.changeInCash),
      freeCashFlow: fcf,
      dividendPayout: parseFloatOrNull(r.dividendsPaid),
      shareRepurchase: parseFloatOrNull(r.commonStockRepurchased),
      proceedsFromIssuanceOfDebt: parseFloatOrNull(r.debtRepayment),
      paymentsForRepurchaseOfEquity: parseFloatOrNull(r.commonStockRepurchased),
    };
  }

  async getCashFlow(symbol: string): Promise<FundamentalData<CashFlowReport> | null> {
    const [annual, quarterly] = await Promise.all([
      this.fmpFetch<Array<Record<string, unknown>>>("cash-flow-statement", { symbol, period: "annual" }),
      this.fmpFetch<Array<Record<string, unknown>>>("cash-flow-statement", { symbol, period: "quarter", limit: "12" }),
    ]);
    if ((!annual || annual.length === 0) && (!quarterly || quarterly.length === 0)) return null;
    return {
      annual: (annual || []).map((r) => this.mapCashFlowRow(r)),
      quarterly: (quarterly || []).slice(0, 12).map((r) => this.mapCashFlowRow(r)),
    };
  }

  async getEarnings(symbol: string): Promise<FundamentalData<EarningsReport> | null> {
    const rows = await this.fmpFetch<Array<Record<string, unknown>>>("earnings", { symbol });
    if (!rows || rows.length === 0) return null;

    const quarterly: EarningsReport[] = rows.slice(0, 20).map((r) => ({
      fiscalDateEnding: String(r.date ?? ""),
      reportedEPS: parseFloatOrNull(r.epsActual ?? r.eps),
      estimatedEPS: parseFloatOrNull(r.epsEstimated),
      surprise: parseFloatOrNull(r.epsDifference ?? r.surprise),
      surprisePercentage: parseFloatOrNull(r.surprisePercentage),
    }));
    const annual: EarningsReport[] = quarterly.filter((_, i) => i % 4 === 0).slice(0, 10);
    return {
      annual: annual.length > 0 ? annual : quarterly.slice(0, 10),
      quarterly: quarterly.slice(0, 16),
    };
  }

  async getNewsSentiment(symbol: string): Promise<NewsArticle[]> {
    return this.mapStockNews(await this.fmpFetch<Array<Record<string, unknown>>>("news/stock", { symbols: symbol }));
  }

  async getPortfolioNewsSentiment(symbols: string[]): Promise<NewsArticle[]> {
    const tickers = symbols.slice(0, 10).join(",");
    return this.mapStockNews(await this.fmpFetch<Array<Record<string, unknown>>>("news/stock", { symbols: tickers }));
  }

  private mapStockNews(raw: Array<Record<string, unknown>>): NewsArticle[] {
    if (!raw || !Array.isArray(raw)) return [];
    return raw.slice(0, 50).map((item) => {
      const sym = String(item.symbol ?? item.tickers ?? "").trim();
      const base = sym.includes(",") ? sym.split(",")[0]?.trim() ?? "" : sym;
      const ticker = base.includes(".") ? base.split(".")[0] ?? base : base;
      const tickerSentiment =
        ticker.length > 0 && ticker.length <= 10
          ? [
              {
                ticker: ticker.toUpperCase(),
                relevance: 1,
                sentimentScore: 0,
                sentimentLabel: "",
              },
            ]
          : [];
      return {
        title: String(item.title ?? ""),
        url: String(item.url ?? ""),
        source: String(item.site ?? item.source ?? ""),
        publishedAt: String(item.publishedDate ?? item.date ?? ""),
        summary: String(item.text ?? item.description ?? ""),
        overallSentiment: "",
        overallSentimentScore: 0,
        tickerSentiment,
        topics: [],
      };
    });
  }

  async getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
    const raw = await this.fmpFetch<Array<Record<string, unknown>>>("insider-trading/search", {
      symbol,
      page: "0",
      limit: "50",
    });
    if (!raw || !Array.isArray(raw)) return [];
    return raw.slice(0, 50).map((r) => ({
      fullName: String(r.reportingName ?? r.name ?? ""),
      title: String(r.typeOfOwner ?? ""),
      transactionDate: String(r.transactionDate ?? r.date ?? ""),
      transactionType: String(r.transactionType ?? r.securitiesTransacted ?? ""),
      shares: parseFloat0(r.securitiesOwned ?? r.securitiesTransacted),
      sharePrice: parseFloat0(r.price),
      totalValue: parseFloat0(r.value),
      sharesOwned: parseFloatOrNull(r.securitiesOwned),
    }));
  }

  async getInstitutionalHoldings(symbol: string): Promise<InstitutionalHolder[]> {
    const raw = await this.fmpFetch<Array<Record<string, unknown>>>("funds/disclosure-holders-latest", {
      symbol,
    });
    if (!raw || !Array.isArray(raw)) return [];
    return raw.slice(0, 30).map((r) => ({
      investor: String(r.investorName ?? r.name ?? ""),
      shares: parseFloat0(r.shares),
      value: parseFloat0(r.value),
      weight: parseFloat0(r.weightPercent ?? r.weight),
      quarterEndDate: String(r.dateOfFiling ?? r.date ?? ""),
    }));
  }

  async getEarningsTranscript(symbol: string, quarter: string): Promise<EarningsTranscript | null> {
    const m = quarter.match(/^(\d{4})Q([1-4])$/i);
    if (!m) return null;
    const year = m[1];
    const q = m[2];
    const data = await this.fmpFetch<unknown>("earning-call-transcript", {
      symbol,
      year,
      quarter: q,
    });
    const row = Array.isArray(data) ? data[0] : (data as Record<string, unknown>);
    if (!row || typeof row !== "object") return null;
    const transcript = String((row as Record<string, unknown>).content ?? (row as Record<string, unknown>).transcript ?? "");
    if (!transcript) return null;
    return {
      symbol,
      quarter,
      transcript,
      sentiment: "",
      sentimentScore: null,
    };
  }

  async getEconomicIndicator(
    func: string,
    interval?: string,
    maturity?: string
  ): Promise<EconIndicatorResult | null> {
    if (func === "TREASURY_YIELD") {
      const raw = await this.fmpFetch<Array<Record<string, unknown>>>("treasury-rates");
      const mat = maturity || "10year";
      const keyMap: Record<string, string> = {
        "3month": "month3",
        "2year": "year2",
        "5year": "year5",
        "7year": "year7",
        "10year": "year10",
        "30year": "year30",
      };
      const k = keyMap[maturity || "10year"] || "year10";
      const name = `Treasury ${maturity || "10year"}`;
      const data: EconDataPoint[] = (raw || []).map((r) => ({
        date: String(r.date ?? ""),
        value: parseFloatOrNull(r[k]),
      }));
      return { name, interval: interval || "", unit: "percent", data };
    }

    const fmpName = AV_ECON_TO_FMP_NAME[func];
    if (!fmpName) return null;

    const rows = await this.fmpFetch<Array<Record<string, unknown>>>("economic-indicators", { name: fmpName });
    if (!rows || !Array.isArray(rows)) return null;
    return {
      name: fmpName,
      interval: interval || "",
      unit: "",
      data: rows.map((r) => ({
        date: String(r.date ?? ""),
        value: r.value === "." || r.value === null ? null : parseFloat0(r.value),
      })),
    };
  }

  async getDividendSchedule(symbol: string): Promise<DividendEvent[]> {
    const raw = await this.fmpFetch<Array<Record<string, unknown>>>("dividends", { symbol });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 90);

    const out: DividendEvent[] = [];
    for (const d of raw || []) {
      const ex = String(d.date ?? d.exDividendDate ?? "");
      if (!ex) continue;
      const exDate = new Date(ex);
      if (exDate < today || exDate > cutoff) continue;
      out.push({
        symbol,
        exDividendDate: ex,
        declarationDate: String(d.declarationDate ?? ""),
        recordDate: String(d.recordDate ?? ""),
        paymentDate: String(d.paymentDate ?? ""),
        amount: parseFloat0(d.adjDividend ?? d.dividend ?? d.amount),
        currency: String(d.currency ?? "USD"),
      });
    }
    return out;
  }

  async getCryptoDaily(
    symbol: string,
    market = "EUR"
  ): Promise<{ meta: Record<string, string>; timeSeries: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number; marketCap: number }> }> {
    const pair = `${symbol}${market.toUpperCase() === "USD" ? "USD" : market.toUpperCase()}`;
    const data = await this.fmpFetch<unknown>("historical-price-eod/full", { symbol: pair });
    const raw = Array.isArray(data)
      ? data
      : (data as { historical?: Array<Record<string, unknown>> })?.historical ?? [];
    const meta: Record<string, string> = {};
    const timeSeries = (raw || []).map((row) => ({
      date: String(row.date ?? ""),
      open: parseFloat0(row.open),
      high: parseFloat0(row.high),
      low: parseFloat0(row.low),
      close: parseFloat0(row.close),
      volume: parseFloat0(row.volume),
      marketCap: parseFloat0(row.marketCap),
    }));
    return { meta, timeSeries };
  }

  async getCryptoWeekly(
    symbol: string,
    market = "EUR"
  ): Promise<Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>> {
    const { timeSeries } = await this.getCryptoDaily(symbol, market);
    return timeSeries;
  }

  async getCryptoMonthly(
    symbol: string,
    market = "EUR"
  ): Promise<Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>> {
    const { timeSeries } = await this.getCryptoDaily(symbol, market);
    const byMonth = new Map<string, { date: string; open: number; high: number; low: number; close: number; volume: number }>();
    for (const row of timeSeries) {
      const key = row.date.slice(0, 7);
      byMonth.set(key, row);
    }
    return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCryptoExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ rate: number; bid: number; ask: number; lastRefreshed: string }> {
    const sym = `${fromCurrency}${toCurrency}`.toUpperCase();
    const rows = await this.fmpFetch<Array<Record<string, unknown>>>("quote", { symbol: sym });
    const q = rows[0];
    if (!q) return { rate: 0, bid: 0, ask: 0, lastRefreshed: "" };
    const price = parseFloat0(q.price);
    return { rate: price, bid: price, ask: price, lastRefreshed: String(q.timestamp ?? "") };
  }
}
