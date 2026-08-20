/**
 * Curated FMP stable endpoints for agent discovery.
 * `fmpRequest` accepts any valid stable path — this list is not an allowlist.
 */

export type FmpEndpointCategory =
  | "quote_search"
  | "statements"
  | "calendar"
  | "news_insider"
  | "crypto_fx"
  | "macro"
  | "lists"
  | "company"
  | "other";

export interface FmpCatalogEntry {
  path: string;
  category: FmpEndpointCategory;
  description: string;
  typicalParams: string[];
}

export const FMP_ENDPOINT_CATALOG: FmpCatalogEntry[] = [
  // Quote / search
  {
    path: "quote",
    category: "quote_search",
    description: "Real-time or delayed quote for one or more symbols",
    typicalParams: ["symbol"],
  },
  {
    path: "quote-short",
    category: "quote_search",
    description: "Short quote / FX pair price (e.g. EURUSD)",
    typicalParams: ["symbol"],
  },
  {
    path: "search-symbol",
    category: "quote_search",
    description: "Symbol search by query string",
    typicalParams: ["query"],
  },
  {
    path: "historical-price-eod/full",
    category: "quote_search",
    description: "Full end-of-day historical OHLCV",
    typicalParams: ["symbol"],
  },

  // Company
  {
    path: "profile",
    category: "company",
    description: "Company profile and key metrics",
    typicalParams: ["symbol"],
  },
  {
    path: "stock-peers",
    category: "company",
    description: "Peer tickers for a symbol",
    typicalParams: ["symbol"],
  },

  // Statements
  {
    path: "income-statement",
    category: "statements",
    description: "Income statement (annual or quarter)",
    typicalParams: ["symbol", "period", "limit"],
  },
  {
    path: "balance-sheet-statement",
    category: "statements",
    description: "Balance sheet",
    typicalParams: ["symbol", "period", "limit"],
  },
  {
    path: "cash-flow-statement",
    category: "statements",
    description: "Cash flow statement",
    typicalParams: ["symbol", "period", "limit"],
  },
  {
    path: "earnings",
    category: "statements",
    description:
      "Historical EPS actual vs consensus estimate (surprise, not company guidance)",
    typicalParams: ["symbol", "limit"],
  },
  {
    path: "earning-call-transcript",
    category: "statements",
    description:
      "Earnings call transcript (source for F5: company guidance vs delivered)",
    typicalParams: ["symbol", "year", "quarter"],
  },

  // Calendar
  {
    path: "earnings-calendar",
    category: "calendar",
    description: "Earnings calendar for a date range",
    typicalParams: ["from", "to"],
  },
  {
    path: "economic-calendar",
    category: "calendar",
    description: "Macro economic calendar",
    typicalParams: ["from", "to"],
  },
  {
    path: "ipos-calendar",
    category: "calendar",
    description: "IPO calendar",
    typicalParams: ["from", "to"],
  },
  {
    path: "splits-calendar",
    category: "calendar",
    description: "Stock splits calendar",
    typicalParams: ["from", "to"],
  },
  {
    path: "dividends",
    category: "calendar",
    description: "Dividend history / schedule for a symbol",
    typicalParams: ["symbol"],
  },

  // News / insider / Congress
  {
    path: "news/stock",
    category: "news_insider",
    description: "Stock news by symbol(s)",
    typicalParams: ["symbols"],
  },
  {
    path: "insider-trading/search",
    category: "news_insider",
    description: "Insider trading search",
    typicalParams: ["symbol", "page", "limit"],
  },
  {
    path: "funds/disclosure-holders-latest",
    category: "news_insider",
    description: "Latest institutional / fund holders disclosure",
    typicalParams: ["symbol"],
  },
  {
    path: "senate-trades",
    category: "news_insider",
    description: "US Senate trading disclosures by symbol",
    typicalParams: ["symbol"],
  },
  {
    path: "house-trades",
    category: "news_insider",
    description: "US House trading disclosures by symbol",
    typicalParams: ["symbol"],
  },

  // Crypto / FX (same quote/history endpoints; documented for discovery)
  {
    path: "quote",
    category: "crypto_fx",
    description: "Crypto or FX quote (pair as symbol, e.g. BTCUSD)",
    typicalParams: ["symbol"],
  },
  {
    path: "historical-price-eod/full",
    category: "crypto_fx",
    description: "Crypto/FX EOD history",
    typicalParams: ["symbol"],
  },

  // Macro
  {
    path: "economic-indicators",
    category: "macro",
    description: "Macro time series by indicator name",
    typicalParams: ["name"],
  },
  {
    path: "treasury-rates",
    category: "macro",
    description: "US Treasury rates",
    typicalParams: [],
  },

  // Lists
  {
    path: "stock-list",
    category: "lists",
    description: "Company symbols list (large payload — prefer filters elsewhere)",
    typicalParams: [],
  },
  {
    path: "financial-statement-symbol-list",
    category: "lists",
    description: "Symbols with financial statements available",
    typicalParams: [],
  },
  {
    path: "etf-list",
    category: "lists",
    description: "ETF symbol list",
    typicalParams: [],
  },
  {
    path: "available-exchanges",
    category: "lists",
    description: "Supported exchanges",
    typicalParams: [],
  },

  // Thesis / fundamentals extras (plan-dependent; fmpRequest still accepts them)
  {
    path: "key-metrics",
    category: "statements",
    description: "Key metrics (ROIC, FCF yield, etc.) by period",
    typicalParams: ["symbol", "period", "limit"],
  },
  {
    path: "key-metrics-ttm",
    category: "statements",
    description: "Trailing-twelve-month key metrics",
    typicalParams: ["symbol"],
  },
  {
    path: "ratios",
    category: "statements",
    description: "Financial ratios by period",
    typicalParams: ["symbol", "period", "limit"],
  },
  {
    path: "ratios-ttm",
    category: "statements",
    description: "Trailing-twelve-month financial ratios",
    typicalParams: ["symbol"],
  },
  {
    path: "analyst-estimates",
    category: "statements",
    description: "Analyst revenue/EPS estimates (consensus, not company guidance)",
    typicalParams: ["symbol", "period", "limit"],
  },
  {
    path: "etf/holdings",
    category: "lists",
    description: "ETF constituent holdings",
    typicalParams: ["symbol"],
  },
  {
    path: "revenue-product-segmentation",
    category: "company",
    description: "Revenue by product line",
    typicalParams: ["symbol", "period"],
  },
  {
    path: "revenue-geographic-segmentation",
    category: "company",
    description: "Revenue by geography",
    typicalParams: ["symbol", "period"],
  },
  {
    path: "financial-growth",
    category: "statements",
    description: "Growth rates from statements",
    typicalParams: ["symbol", "period", "limit"],
  },
];

/**
 * Endpoints the thesis spec / screening enrichment may need. Not all are on
 * every FMP plan. Probe with `npx tsx scripts/probe-fmp-thesis-endpoints.ts`.
 */
export const FMP_CAPABILITY_PROBE: Array<{
  path: string;
  params: Record<string, string>;
  why: string;
}> = [
  { path: "profile", params: { symbol: "AAPL" }, why: "company identity" },
  { path: "income-statement", params: { symbol: "AAPL", period: "annual", limit: "5" }, why: "NOPAT / series" },
  { path: "balance-sheet-statement", params: { symbol: "AAPL", period: "annual", limit: "5" }, why: "invested capital" },
  { path: "cash-flow-statement", params: { symbol: "AAPL", period: "annual", limit: "5" }, why: "FCF, buybacks" },
  { path: "key-metrics", params: { symbol: "AAPL", period: "annual", limit: "5" }, why: "ROIC series" },
  { path: "key-metrics-ttm", params: { symbol: "AAPL" }, why: "ROIC TTM" },
  { path: "ratios", params: { symbol: "AAPL", period: "annual", limit: "5" }, why: "leverage, coverage" },
  { path: "ratios-ttm", params: { symbol: "AAPL" }, why: "TTM ratios already used in screening" },
  { path: "earnings", params: { symbol: "AAPL", limit: "12" }, why: "EPS actual vs estimate (consensus, not F5)" },
  { path: "earning-call-transcript", params: { symbol: "AAPL", year: "2025", quarter: "4" }, why: "F5 guidance extraction" },
  { path: "analyst-estimates", params: { symbol: "AAPL", period: "annual", limit: "8" }, why: "I1–I3 consensus (not company guidance)" },
  { path: "revenue-product-segmentation", params: { symbol: "AAPL" }, why: "mix / A3" },
  { path: "revenue-geographic-segmentation", params: { symbol: "AAPL" }, why: "geo mix" },
  { path: "financial-growth", params: { symbol: "AAPL", period: "annual", limit: "5" }, why: "CAGR helpers" },
  { path: "etf/holdings", params: { symbol: "SPY" }, why: "ETF look-through (later asset class)" },
  { path: "insider-trading/search", params: { symbol: "AAPL", limit: "5" }, why: "F7" },
];

export const FMP_CATALOG_CATEGORIES: FmpEndpointCategory[] = [
  "quote_search",
  "company",
  "statements",
  "calendar",
  "news_insider",
  "crypto_fx",
  "macro",
  "lists",
  "other",
];

export function listFmpCatalog(category?: string): {
  baseUrl: string;
  note: string;
  categories: FmpEndpointCategory[];
  endpoints: FmpCatalogEntry[];
} {
  const filtered =
    category && category.trim()
      ? FMP_ENDPOINT_CATALOG.filter((e) => e.category === category.trim())
      : FMP_ENDPOINT_CATALOG;

  return {
    baseUrl: "https://financialmodelingprep.com/stable",
    note:
      "Curated discovery list only. fmpRequest accepts any valid FMP stable path (sanitized), even if not listed here. GET only; API key is injected server-side.",
    categories: FMP_CATALOG_CATEGORIES,
    endpoints: filtered,
  };
}
