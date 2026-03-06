export type ApiProviderName = "yahoo" | "alphavantage";
export type SubscriptionPlan = "free" | "pro";
export type BillingInterval = "monthly" | "annual";
export type SubscriptionFeature =
  | "yahoo"
  | "charts"
  | "cash"
  | "benchmarks"
  | "alphavantage"
  | "fundamentals"
  | "intelligence"
  | "economic-indicators"
  | "ai"
  | "alerts-email";

export type AlertCondition = "above" | "below";

export interface PriceAlert {
  id: string;
  ticker: string;
  name: string;
  condition: AlertCondition;
  threshold: number;
  currency: string;
  active: boolean;
  triggered: boolean;
  triggeredAt: string;
  createdAt: string;
}
export type HoldingAssetType = "stock" | "etf";

export interface Holding {
  id: string;
  name: string;
  ticker: string;
  isin: string;
  assetType?: HoldingAssetType;
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  exchange: string;
  valueInEUR: number;
  accountId?: string;
  sector?: string;
  region?: string;
  assetClass?: string;
}

export interface CashEntry {
  id: string;
  name: string;
  amountEUR: number;
}

/* ── Transaction Ledger ──────────────────────────────────── */

export type TransactionType = "buy" | "sell" | "dividend" | "fee";

export interface Transaction {
  id: string;
  holdingId: string;
  ticker: string;
  name?: string;
  exchange?: string;
  isin?: string;
  assetType?: HoldingAssetType;
  accountId?: string;
  type: TransactionType;
  date: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fees: number;
  taxes: number;
  currency: string;
  displayCurrency?: string;
  exchangeRateEur?: number;
  notes: string;
  sourceRef?: string;
  createdAt: string;
}

/* ── Watchlist ────────────────────────────────────────────── */

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  addedAt: string;
}

/* ── Accounts / Portfolios ────────────────────────────────── */

export interface Account {
  id: string;
  name: string;
  broker: string;
  currency: string;
  createdAt: string;
}

/* ── Taxonomy / Classification ────────────────────────────── */

export interface TaxonomyAllocation {
  label: string;
  valueEUR: number;
  percent: number;
  color: string;
}

/* ── Rebalancing ──────────────────────────────────────────── */

export interface RebalanceTarget {
  id: string;
  category: string;
  label: string;
  targetPercent: number;
}

export interface RebalanceDrift {
  label: string;
  targetPercent: number;
  actualPercent: number;
  driftPercent: number;
  valueEUR: number;
  actionEUR: number;
}

export interface QuoteData {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  currency: string;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap?: number;
  trailingAnnualDividendRate?: number;
  trailingAnnualDividendYield?: number;
  providerUsed?: string;
  fetchedAt?: number;
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

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PortfolioSummary {
  totalValueEUR: number;
  totalCostEUR: number;
  totalGainLossEUR: number;
  totalGainLossPercent: number;
  holdingsCount: number;
}

export interface SearchResult {
  symbol: string;
  shortname: string;
  exchange: string;
  quoteType: string;
}

export type ExchangeRates = Record<string, number>;

export type TimePeriod = "1w" | "1m" | "3m" | "6m" | "1y" | "all";

export type Language =
  | "en" | "es" | "fr" | "de" | "it" | "pt" | "nl" | "pl"
  | "cs" | "sk" | "hu" | "ro" | "bg" | "hr" | "sl" | "el"
  | "sv" | "da" | "fi" | "et" | "lv" | "lt" | "ga" | "mt"
  | "nb" | "uk" | "tr" | "sr" | "is" | "sq" | "bs" | "mk"
  | "be" | "ca" | "cy";

export type RefreshInterval = 15 | 30 | 60;

/* ── Alpha Intelligence types ──────────────────────────────── */

export type {
  NewsArticle,
  InsiderTransaction,
  InstitutionalHolder,
  EarningsTranscript,
  EconDataPoint,
  EconIndicatorResult,
} from "./api-providers/types";
