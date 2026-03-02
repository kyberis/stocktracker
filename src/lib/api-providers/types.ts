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

export type TimePeriod = "1w" | "1m" | "3m" | "6m" | "1y" | "all";

export interface StockDataProvider {
  getQuote(symbol: string): Promise<ProviderQuoteResult>;
  search(query: string): Promise<ProviderSearchResult[]>;
  getHistorical(symbol: string, period: TimePeriod): Promise<ProviderHistoricalPoint[]>;
  getExchangeRate(from: string, to: string): Promise<number>;
  getOverview?(symbol: string): Promise<CompanyOverview | null>;
  readonly name: string;
  readonly callCount?: number;
}
