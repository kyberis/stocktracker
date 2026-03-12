import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

export interface ScreenerCacheRow {
  symbol: string;
  shortName: string;
  sector: string;
  industry: string;
  country: string;
  exchange: string;
  currency: string;
  marketCap: number | null;
  peRatio: number | null;
  forwardPe: number | null;
  dividendYield: number | null;
  dividendPerShare: number | null;
  eps: number | null;
  beta: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  regularMarketPrice: number | null;
  regularMarketChangePercent: number | null;
  analystStrongBuy: number;
  analystBuy: number;
  analystHold: number;
  analystSell: number;
  analystStrongSell: number;
  updatedAt: string;
}

export interface ScreenerFilters {
  sector?: string;
  divYieldMin?: number;
  divYieldMax?: number;
  peMin?: number;
  peMax?: number;
  marketCap?: "mega" | "large" | "mid" | "small" | "micro";
  exchange?: string;
  country?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ScreenerResponse {
  results: ScreenerCacheRow[];
  total: number;
  page: number;
  limit: number;
}

const MARKET_CAP_RANGES: Record<string, [number, number]> = {
  mega: [200_000_000_000, Infinity],
  large: [10_000_000_000, 200_000_000_000],
  mid: [2_000_000_000, 10_000_000_000],
  small: [300_000_000, 2_000_000_000],
  micro: [0, 300_000_000],
};

const VALID_SORT_COLUMNS: Record<string, string> = {
  symbol: "symbol",
  shortName: "short_name",
  sector: "sector",
  dividendYield: "dividend_yield",
  peRatio: "pe_ratio",
  marketCap: "market_cap",
  regularMarketChangePercent: "regular_market_change_percent",
  regularMarketPrice: "regular_market_price",
  beta: "beta",
  eps: "eps",
};

function mapRow(r: Record<string, unknown>): ScreenerCacheRow {
  return {
    symbol: str(r.symbol),
    shortName: str(r.short_name),
    sector: str(r.sector),
    industry: str(r.industry),
    country: str(r.country),
    exchange: str(r.exchange),
    currency: str(r.currency),
    marketCap: r.market_cap != null ? num(r.market_cap) : null,
    peRatio: r.pe_ratio != null ? num(r.pe_ratio) : null,
    forwardPe: r.forward_pe != null ? num(r.forward_pe) : null,
    dividendYield: r.dividend_yield != null ? num(r.dividend_yield) : null,
    dividendPerShare: r.dividend_per_share != null ? num(r.dividend_per_share) : null,
    eps: r.eps != null ? num(r.eps) : null,
    beta: r.beta != null ? num(r.beta) : null,
    profitMargin: r.profit_margin != null ? num(r.profit_margin) : null,
    returnOnEquity: r.return_on_equity != null ? num(r.return_on_equity) : null,
    fiftyTwoWeekHigh: r.fifty_two_week_high != null ? num(r.fifty_two_week_high) : null,
    fiftyTwoWeekLow: r.fifty_two_week_low != null ? num(r.fifty_two_week_low) : null,
    regularMarketPrice: r.regular_market_price != null ? num(r.regular_market_price) : null,
    regularMarketChangePercent: r.regular_market_change_percent != null ? num(r.regular_market_change_percent) : null,
    analystStrongBuy: num(r.analyst_strong_buy),
    analystBuy: num(r.analyst_buy),
    analystHold: num(r.analyst_hold),
    analystSell: num(r.analyst_sell),
    analystStrongSell: num(r.analyst_strong_sell),
    updatedAt: str(r.updated_at),
  };
}

export async function queryScreener(filters: ScreenerFilters): Promise<ScreenerResponse> {
  const client = await ensureInitialized();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (filters.sector) {
    conditions.push("sector = ?");
    args.push(filters.sector);
  }
  if (filters.divYieldMin != null) {
    conditions.push("dividend_yield >= ?");
    args.push(filters.divYieldMin / 100);
  }
  if (filters.divYieldMax != null) {
    conditions.push("dividend_yield <= ?");
    args.push(filters.divYieldMax / 100);
  }
  if (filters.peMin != null) {
    conditions.push("pe_ratio >= ?");
    args.push(filters.peMin);
  }
  if (filters.peMax != null) {
    conditions.push("pe_ratio <= ?");
    args.push(filters.peMax);
  }
  if (filters.marketCap && MARKET_CAP_RANGES[filters.marketCap]) {
    const [min, max] = MARKET_CAP_RANGES[filters.marketCap];
    conditions.push("market_cap >= ?");
    args.push(min);
    if (max !== Infinity) {
      conditions.push("market_cap < ?");
      args.push(max);
    }
  }
  if (filters.exchange) {
    conditions.push("exchange = ?");
    args.push(filters.exchange);
  }
  if (filters.country) {
    conditions.push("country = ?");
    args.push(filters.country);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortCol = VALID_SORT_COLUMNS[filters.sortBy || ""] || "dividend_yield";
  const sortDir = filters.sortDir === "asc" ? "ASC" : "DESC";
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 50));
  const offset = (page - 1) * limit;

  const countResult = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM screener_cache ${whereClause}`,
    args,
  });
  const total = num(countResult.rows[0]?.cnt);

  const dataResult = await client.execute({
    sql: `SELECT * FROM screener_cache ${whereClause} ORDER BY ${sortCol} ${sortDir} NULLS LAST LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return {
    results: dataResult.rows.map((r) => mapRow(r as unknown as Record<string, unknown>)),
    total,
    page,
    limit,
  };
}

export async function upsertScreenerCache(row: {
  symbol: string;
  shortName: string;
  sector: string;
  industry: string;
  country: string;
  exchange: string;
  currency: string;
  marketCap: number | null;
  peRatio: number | null;
  forwardPe: number | null;
  dividendYield: number | null;
  dividendPerShare: number | null;
  eps: number | null;
  beta: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  regularMarketPrice: number | null;
  regularMarketChangePercent: number | null;
  analystStrongBuy: number;
  analystBuy: number;
  analystHold: number;
  analystSell: number;
  analystStrongSell: number;
}): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT OR REPLACE INTO screener_cache (
      symbol, short_name, sector, industry, country, exchange, currency,
      market_cap, pe_ratio, forward_pe, dividend_yield, dividend_per_share,
      eps, beta, profit_margin, return_on_equity,
      fifty_two_week_high, fifty_two_week_low,
      regular_market_price, regular_market_change_percent,
      analyst_strong_buy, analyst_buy, analyst_hold, analyst_sell, analyst_strong_sell,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [
      row.symbol, row.shortName, row.sector, row.industry, row.country, row.exchange, row.currency,
      row.marketCap, row.peRatio, row.forwardPe, row.dividendYield, row.dividendPerShare,
      row.eps, row.beta, row.profitMargin, row.returnOnEquity,
      row.fiftyTwoWeekHigh, row.fiftyTwoWeekLow,
      row.regularMarketPrice, row.regularMarketChangePercent,
      row.analystStrongBuy, row.analystBuy, row.analystHold, row.analystSell, row.analystStrongSell,
    ],
  });
}

export async function getScreenerCacheCount(): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT COUNT(*) as cnt FROM screener_cache");
  return num(result.rows[0]?.cnt);
}

export async function getScreenerDistinctSectors(): Promise<string[]> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT DISTINCT sector FROM screener_cache WHERE sector != '' ORDER BY sector");
  return result.rows.map((r) => str(r.sector));
}

export async function getScreenerDistinctCountries(): Promise<string[]> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT DISTINCT country FROM screener_cache WHERE country != '' ORDER BY country");
  return result.rows.map((r) => str(r.country));
}

export async function getScreenerDistinctExchanges(): Promise<string[]> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT DISTINCT exchange FROM screener_cache WHERE exchange != '' ORDER BY exchange");
  return result.rows.map((r) => str(r.exchange));
}
