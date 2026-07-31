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
    description: "Historical earnings and estimates for a symbol",
    typicalParams: ["symbol", "limit"],
  },
  {
    path: "earning-call-transcript",
    category: "statements",
    description: "Earnings call transcript",
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
