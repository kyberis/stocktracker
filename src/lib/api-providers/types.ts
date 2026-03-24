export interface ProviderQuoteResult {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  currency: string;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  trailingAnnualDividendRate?: number;
  trailingAnnualDividendYield?: number;
  error?: boolean;
}

export interface ProviderSearchResult {
  symbol: string;
  shortname: string;
  exchange: string;
  quoteType: string;
}

export interface ProviderHistoricalPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CompanyOverview {
  symbol: string;
  name: string;
  description: string;
  exchange: string;
  currency: string;
  sector: string;
  industry: string;
  peRatio: number | null;
  pegRatio: number | null;
  eps: number | null;
  dividendPerShare: number | null;
  dividendYield: number | null;
  beta: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
  revenueTTM: number | null;
  analystTargetPrice: number | null;
  analystRatings: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  } | null;
  fiftyDayMA: number | null;
  twoHundredDayMA: number | null;
  sharesOutstanding: number | null;
  forwardPE: number | null;
}

export interface IncomeStatementReport {
  fiscalDateEnding: string;
  reportedCurrency: string;
  totalRevenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  incomeBeforeTax: number | null;
  incomeTaxExpense: number | null;
  netIncome: number | null;
  ebitda: number | null;
  researchAndDevelopment: number | null;
  sellingGeneralAndAdmin: number | null;
  interestExpense: number | null;
}

export interface BalanceSheetReport {
  fiscalDateEnding: string;
  reportedCurrency: string;
  totalAssets: number | null;
  totalCurrentAssets: number | null;
  cashAndEquivalents: number | null;
  totalNonCurrentAssets: number | null;
  totalLiabilities: number | null;
  totalCurrentLiabilities: number | null;
  totalNonCurrentLiabilities: number | null;
  totalShareholderEquity: number | null;
  retainedEarnings: number | null;
  longTermDebt: number | null;
  shortTermDebt: number | null;
  commonStockSharesOutstanding: number | null;
}

export interface CashFlowReport {
  fiscalDateEnding: string;
  reportedCurrency: string;
  operatingCashflow: number | null;
  capitalExpenditures: number | null;
  changeInCash: number | null;
  freeCashFlow: number | null;
  dividendPayout: number | null;
  shareRepurchase: number | null;
  proceedsFromIssuanceOfDebt: number | null;
  paymentsForRepurchaseOfEquity: number | null;
}

export interface EarningsReport {
  fiscalDateEnding: string;
  reportedEPS: number | null;
  estimatedEPS: number | null;
  surprise: number | null;
  surprisePercentage: number | null;
}

export interface FundamentalData<T> {
  annual: T[];
  quarterly: T[];
}

export type TimePeriod = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "all";

/* ── Alpha Intelligence types ──────────────────────────────── */

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  overallSentiment: string;
  overallSentimentScore: number;
  tickerSentiment: { ticker: string; relevance: number; sentimentScore: number; sentimentLabel: string }[];
  topics: string[];
}

export interface InsiderTransaction {
  fullName: string;
  title: string;
  transactionDate: string;
  transactionType: string;
  shares: number;
  sharePrice: number;
  totalValue: number;
  sharesOwned: number | null;
}

export interface InstitutionalHolder {
  investor: string;
  shares: number;
  value: number;
  weight: number;
  quarterEndDate: string;
}

export interface EarningsTranscript {
  symbol: string;
  quarter: string;
  transcript: string;
  sentiment: string;
  sentimentScore: number | null;
}

/* ── ETF Holdings types ──────────────────────────────────── */

export interface ETFHoldingEntry {
  symbol: string;
  name: string;
  weight: number;
}

export interface ETFSectorWeight {
  sector: string;
  weight: number;
}

export interface ETFHoldingsData {
  holdings: ETFHoldingEntry[];
  sectorWeightings: ETFSectorWeight[];
  category: string;
  fundFamily: string;
  legalType: string;
}

/* ── Economic Indicators types ───────────────────────────── */

export interface EconDataPoint {
  date: string;
  value: number | null;
}

export interface EconIndicatorResult {
  name: string;
  interval: string;
  unit: string;
  data: EconDataPoint[];
}

export interface SearchOptions {
  includeCrypto?: boolean;
}

export interface StockDataProvider {
  getQuote(symbol: string): Promise<ProviderQuoteResult>;
  search(query: string, options?: SearchOptions): Promise<ProviderSearchResult[]>;
  getHistorical(symbol: string, period: TimePeriod): Promise<ProviderHistoricalPoint[]>;
  getExchangeRate(from: string, to: string): Promise<number>;
  getOverview?(symbol: string): Promise<CompanyOverview | null>;
  getIncomeStatement?(symbol: string): Promise<FundamentalData<IncomeStatementReport> | null>;
  getBalanceSheet?(symbol: string): Promise<FundamentalData<BalanceSheetReport> | null>;
  getCashFlow?(symbol: string): Promise<FundamentalData<CashFlowReport> | null>;
  getEarnings?(symbol: string): Promise<FundamentalData<EarningsReport> | null>;
  getETFHoldings?(symbol: string): Promise<ETFHoldingsData | null>;
  getNewsSentiment?(symbol: string): Promise<NewsArticle[]>;
  getPortfolioNewsSentiment?(symbols: string[]): Promise<NewsArticle[]>;
  getInsiderTransactions?(symbol: string): Promise<InsiderTransaction[]>;
  getInstitutionalHoldings?(symbol: string): Promise<InstitutionalHolder[]>;
  getEarningsTranscript?(symbol: string, quarter: string): Promise<EarningsTranscript | null>;
  getEconomicIndicator?(func: string, interval?: string, maturity?: string): Promise<EconIndicatorResult | null>;
  readonly name: string;
  readonly callCount?: number;
}
