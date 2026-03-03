export type ApiProviderName = "yahoo" | "alphavantage";
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
}

export interface CashEntry {
  id: string;
  name: string;
  amountEUR: number;
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

export type Language = "en" | "es";
