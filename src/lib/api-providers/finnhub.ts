/**
 * Finnhub free-tier helpers beyond company news:
 * insider transactions, institutional ownership, and event calendars.
 */
import type { InsiderTransaction, InstitutionalHolder } from "./types";
import { fetchFinnhubCompanyNews, fetchFinnhubPortfolioNews } from "./finnhub-news";

export { fetchFinnhubCompanyNews, fetchFinnhubPortfolioNews };

const FINNHUB_BASE = "https://finnhub.io/api/v1";

export function getFinnhubApiKey(): string {
  return process.env.FINNHUB_API_KEY?.trim() || "";
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseFloat0(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = parseFloat(String(val));
  return Number.isNaN(n) ? 0 : n;
}

async function finnhubGet<T>(
  path: string,
  apiKey: string,
  params: Record<string, string> = {},
): Promise<T | null> {
  const url = new URL(`${FINNHUB_BASE}${path}`);
  url.searchParams.set("token", apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    console.warn(`Finnhub ${path}: ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

interface FinnhubInsiderRow {
  name?: string;
  share?: number;
  change?: number;
  filingDate?: string;
  transactionDate?: string;
  transactionCode?: string;
  transactionPrice?: number;
}

export async function fetchFinnhubInsiderTransactions(
  symbol: string,
  apiKey: string,
): Promise<InsiderTransaction[]> {
  const to = new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 1);
  const data = await finnhubGet<{ data?: FinnhubInsiderRow[] }>(
    "/stock/insider-transactions",
    apiKey,
    { symbol, from: toISODate(from), to: toISODate(to) },
  );
  const rows = data?.data ?? [];
  return rows.slice(0, 50).map((r) => {
    const shares = Math.abs(parseFloat0(r.change ?? r.share));
    const price = parseFloat0(r.transactionPrice);
    return {
      fullName: String(r.name ?? ""),
      title: "",
      transactionDate: String(r.transactionDate ?? r.filingDate ?? ""),
      transactionType: String(r.transactionCode ?? ""),
      shares,
      sharePrice: price,
      totalValue: shares * price,
      sharesOwned: r.share != null ? parseFloat0(r.share) : null,
    };
  });
}

interface FinnhubOwnershipRow {
  name?: string;
  share?: number;
  change?: number;
  filingDate?: string;
  percent?: number;
}

export async function fetchFinnhubInstitutionalHoldings(
  symbol: string,
  apiKey: string,
): Promise<InstitutionalHolder[]> {
  const data = await finnhubGet<{ ownership?: FinnhubOwnershipRow[] }>(
    "/stock/ownership",
    apiKey,
    { symbol, limit: "30" },
  );
  const rows = data?.ownership ?? [];
  return rows.slice(0, 30).map((r) => ({
    investor: String(r.name ?? ""),
    shares: parseFloat0(r.share),
    value: 0,
    weight: parseFloat0(r.percent),
    quarterEndDate: String(r.filingDate ?? ""),
  }));
}

export interface FinnhubEarningsEvent {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;
  revenue: number | null;
  revenueEstimated: number | null;
  fiscalDateEnding: string;
}

export async function fetchFinnhubEarningsCalendar(
  from: Date,
  to: Date,
  apiKey: string,
): Promise<FinnhubEarningsEvent[]> {
  const data = await finnhubGet<{
    earningsCalendar?: Array<{
      date?: string;
      symbol?: string;
      epsActual?: number | null;
      epsEstimate?: number | null;
      revenueActual?: number | null;
      revenueEstimate?: number | null;
      hour?: string;
      fiscalDateEnding?: string;
    }>;
  }>("/calendar/earnings", apiKey, {
    from: toISODate(from),
    to: toISODate(to),
  });
  return (data?.earningsCalendar ?? [])
    .filter((e) => e.symbol && e.date)
    .map((e) => ({
      date: String(e.date),
      symbol: String(e.symbol),
      eps: e.epsActual ?? null,
      epsEstimated: e.epsEstimate ?? null,
      time: e.hour === "bmo" ? "bmo" : e.hour === "amc" ? "amc" : "--",
      revenue: e.revenueActual ?? null,
      revenueEstimated: e.revenueEstimate ?? null,
      fiscalDateEnding: String(e.fiscalDateEnding ?? ""),
    }));
}

export interface FinnhubIpoEvent {
  date: string;
  company: string;
  symbol: string;
  exchange: string;
  priceRange: string;
}

export async function fetchFinnhubIpoCalendar(
  from: Date,
  to: Date,
  apiKey: string,
): Promise<FinnhubIpoEvent[]> {
  const data = await finnhubGet<{
    ipoCalendar?: Array<{
      date?: string;
      name?: string;
      symbol?: string;
      exchange?: string;
      price?: string;
      status?: string;
    }>;
  }>("/calendar/ipo", apiKey, {
    from: toISODate(from),
    to: toISODate(to),
  });
  return (data?.ipoCalendar ?? [])
    .filter((e) => e.date)
    .map((e) => ({
      date: String(e.date).slice(0, 10),
      company: String(e.name ?? e.symbol ?? "IPO"),
      symbol: String(e.symbol ?? ""),
      exchange: String(e.exchange ?? ""),
      priceRange: String(e.price ?? ""),
    }));
}

export interface FinnhubEconomicEvent {
  event: string;
  date: string;
  country: string;
  actual: number | null;
  previous: number | null;
  estimate: number | null;
  impact: string;
}

export async function fetchFinnhubEconomicCalendar(
  from: Date,
  to: Date,
  apiKey: string,
): Promise<FinnhubEconomicEvent[]> {
  const data = await finnhubGet<{
    economicCalendar?: Array<{
      event?: string;
      time?: string;
      country?: string;
      actual?: number | null;
      prev?: number | null;
      estimate?: number | null;
      impact?: string;
    }>;
  }>("/calendar/economic", apiKey, {
    from: toISODate(from),
    to: toISODate(to),
  });
  return (data?.economicCalendar ?? []).map((e) => ({
    event: String(e.event ?? "Economic indicator"),
    date: String(e.time ?? "").slice(0, 10) || toISODate(from),
    country: String(e.country ?? ""),
    actual: e.actual ?? null,
    previous: e.prev ?? null,
    estimate: e.estimate ?? null,
    impact: String(e.impact ?? ""),
  }));
}
