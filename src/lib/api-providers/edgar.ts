/**
 * Lightweight SEC EDGAR helpers as a US-centric fallback for institutional/insider
 * when Finnhub returns empty. Uses public data.sec.gov (no API key).
 */
import type { InsiderTransaction, InstitutionalHolder } from "./types";

const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_DATA_BASE = "https://data.sec.gov";
const USER_AGENT = process.env.SEC_EDGAR_USER_AGENT?.trim() || "trefolio/1.0 (contact@trefolio.com)";

type TickerMap = Record<string, { cik_str: number; ticker: string; title: string }>;

let tickerCache: Map<string, string> | null = null;
let tickerCacheAt = 0;
const TICKER_TTL_MS = 24 * 60 * 60 * 1000;

async function loadCikMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (tickerCache && now - tickerCacheAt < TICKER_TTL_MS) return tickerCache;

  const res = await fetch(SEC_TICKERS_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`SEC tickers: ${res.status}`);
  const data = (await res.json()) as TickerMap;
  const map = new Map<string, string>();
  for (const row of Object.values(data)) {
    map.set(row.ticker.toUpperCase(), String(row.cik_str).padStart(10, "0"));
  }
  tickerCache = map;
  tickerCacheAt = now;
  return map;
}

export async function resolveSecCik(symbol: string): Promise<string | null> {
  const base = symbol.split(".")[0]?.toUpperCase() ?? symbol.toUpperCase();
  const map = await loadCikMap();
  return map.get(base) ?? null;
}

interface SecSubmissionRecent {
  form?: string[];
  filingDate?: string[];
  accessionNumber?: string[];
  primaryDocument?: string[];
}

/**
 * Best-effort Form 4 listing from submissions metadata (no full XML parse).
 * Returns sparse InsiderTransaction rows from recent Form 4 filing dates.
 */
export async function fetchEdgarInsiderTransactions(
  symbol: string,
): Promise<InsiderTransaction[]> {
  try {
    const cik = await resolveSecCik(symbol);
    if (!cik) return [];
    const res = await fetch(`${SEC_DATA_BASE}/submissions/CIK${cik}.json`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      name?: string;
      filings?: { recent?: SecSubmissionRecent };
    };
    const recent = json.filings?.recent;
    if (!recent?.form || !recent.filingDate) return [];

    const out: InsiderTransaction[] = [];
    for (let i = 0; i < recent.form.length && out.length < 30; i++) {
      if (recent.form[i] !== "4") continue;
      out.push({
        fullName: String(json.name ?? ""),
        title: "Form 4 filing",
        transactionDate: String(recent.filingDate[i] ?? ""),
        transactionType: "Form 4",
        shares: 0,
        sharePrice: 0,
        totalValue: 0,
        sharesOwned: null,
      });
    }
    return out;
  } catch (err) {
    console.warn("EDGAR insider fallback failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** EDGAR does not expose easy 13F-by-issuer without bulk files; return empty. */
export async function fetchEdgarInstitutionalHoldings(
  _symbol: string,
): Promise<InstitutionalHolder[]> {
  return [];
}
