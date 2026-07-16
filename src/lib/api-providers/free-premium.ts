/**
 * Free premium market-data composite: Yahoo + Finnhub + FRED + CoinGecko.
 * Replaces paid FMP for Pro surfaces while keeping the StockDataProvider shape.
 */
import {
  getCoinGeckoDaily,
  getCoinGeckoExchangeRate,
  getCoinGeckoMonthly,
} from "./coingecko";
import { fetchEdgarInsiderTransactions } from "./edgar";
import {
  fetchFinnhubCompanyNews,
  fetchFinnhubInsiderTransactions,
  fetchFinnhubInstitutionalHoldings,
  fetchFinnhubPortfolioNews,
  getFinnhubApiKey,
} from "./finnhub";
import { getFredApiKey, getFredEconomicIndicator } from "./fred";
import type {
  BalanceSheetReport,
  CashFlowReport,
  CompanyOverview,
  DividendEvent,
  EarningsReport,
  EarningsTranscript,
  EconIndicatorResult,
  FundamentalData,
  IncomeStatementReport,
  InsiderTransaction,
  InstitutionalHolder,
  NewsArticle,
  ProviderHistoricalPoint,
  ProviderQuoteResult,
  ProviderSearchResult,
  SearchOptions,
  StockDataProvider,
  TimePeriod,
} from "./types";
import { YahooProvider } from "./yahoo";

export class FreePremiumProvider implements StockDataProvider {
  readonly name = "free";
  private yahoo = new YahooProvider();
  private finnhubKey: string;
  private _callCount = 0;

  get callCount() {
    return this._callCount;
  }

  constructor(opts?: { finnhubKey?: string }) {
    this.finnhubKey = opts?.finnhubKey ?? getFinnhubApiKey();
  }

  private bump(n = 1) {
    this._callCount += n;
  }

  async getQuote(symbol: string): Promise<ProviderQuoteResult> {
    this.bump();
    return this.yahoo.getQuote(symbol);
  }

  async search(query: string, options?: SearchOptions): Promise<ProviderSearchResult[]> {
    this.bump();
    return this.yahoo.search(query, options);
  }

  async getHistorical(symbol: string, period: TimePeriod): Promise<ProviderHistoricalPoint[]> {
    this.bump();
    return this.yahoo.getHistorical(symbol, period);
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    this.bump();
    return this.yahoo.getExchangeRate(from, to);
  }

  async getOverview(symbol: string): Promise<CompanyOverview | null> {
    this.bump();
    return this.yahoo.getOverview?.(symbol) ?? null;
  }

  async getIncomeStatement(symbol: string): Promise<FundamentalData<IncomeStatementReport> | null> {
    this.bump();
    return this.yahoo.getIncomeStatement?.(symbol) ?? null;
  }

  async getBalanceSheet(symbol: string): Promise<FundamentalData<BalanceSheetReport> | null> {
    this.bump();
    return this.yahoo.getBalanceSheet?.(symbol) ?? null;
  }

  async getCashFlow(symbol: string): Promise<FundamentalData<CashFlowReport> | null> {
    this.bump();
    return this.yahoo.getCashFlow?.(symbol) ?? null;
  }

  async getEarnings(symbol: string): Promise<FundamentalData<EarningsReport> | null> {
    this.bump();
    return this.yahoo.getEarnings?.(symbol) ?? null;
  }

  async getNewsSentiment(symbol: string): Promise<NewsArticle[]> {
    if (!this.finnhubKey) return [];
    this.bump();
    return fetchFinnhubCompanyNews(symbol, this.finnhubKey);
  }

  async getPortfolioNewsSentiment(symbols: string[]): Promise<NewsArticle[]> {
    if (!this.finnhubKey) return [];
    this.bump(Math.min(symbols.length, 10));
    return fetchFinnhubPortfolioNews(symbols, this.finnhubKey);
  }

  async getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
    this.bump();
    if (this.finnhubKey) {
      const rows = await fetchFinnhubInsiderTransactions(symbol, this.finnhubKey);
      if (rows.length > 0) return rows;
    }
    return fetchEdgarInsiderTransactions(symbol);
  }

  async getInstitutionalHoldings(symbol: string): Promise<InstitutionalHolder[]> {
    if (!this.finnhubKey) return [];
    this.bump();
    return fetchFinnhubInstitutionalHoldings(symbol, this.finnhubKey);
  }

  async getEarningsTranscript(
    _symbol: string,
    _quarter: string,
  ): Promise<EarningsTranscript | null> {
    // No reliable free transcript API; callers should show an empty state.
    return null;
  }

  async getEconomicIndicator(
    func: string,
    interval?: string,
    maturity?: string,
  ): Promise<EconIndicatorResult | null> {
    if (!getFredApiKey()) return null;
    this.bump();
    return getFredEconomicIndicator(func, interval, maturity);
  }

  async getDividendSchedule(symbol: string): Promise<DividendEvent[]> {
    // Yahoo calendarEvents path lives in /api/ex-dividend; no schedule on YahooProvider.
    this.bump();
    return [];
  }

  async getCryptoDaily(symbol: string, market = "EUR") {
    this.bump();
    return getCoinGeckoDaily(symbol, market);
  }

  async getCryptoWeekly(symbol: string, market = "EUR") {
    const { timeSeries } = await this.getCryptoDaily(symbol, market);
    return timeSeries;
  }

  async getCryptoMonthly(symbol: string, market = "EUR") {
    this.bump();
    return getCoinGeckoMonthly(symbol, market);
  }

  async getCryptoExchangeRate(fromCurrency: string, toCurrency: string) {
    this.bump();
    return getCoinGeckoExchangeRate(fromCurrency, toCurrency);
  }
}

/** True when the free premium stack can serve Pro surfaces (Yahoo always; Finnhub optional). */
export function isFreePremiumStackAvailable(): boolean {
  return true;
}
