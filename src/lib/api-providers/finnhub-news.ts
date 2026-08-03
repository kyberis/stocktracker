import type { NewsArticle } from "./types";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

function parseRelatedTickers(related: string, fetchSymbol: string): string[] {
  const out = new Set<string>();
  // Do NOT attribute every article to the fetch target — Finnhub company-news
  // often returns market-wide stories. Only trust the related field + title match later.
  if (!related) return [];
  for (const part of related.split(/[,;\s]+/)) {
    const raw = part.trim();
    if (!raw) continue;
    const t = (raw.split(".")[0] ?? raw).toUpperCase();
    if (t.length >= 1 && t.length <= 10 && /^[A-Z0-9_-]+$/.test(t)) out.add(t);
  }
  // If related is empty, allow fetch symbol only when headline mentions it
  void fetchSymbol;
  return [...out];
}

function normalizeTickerKey(t: string): string {
  return (t.split(".")[0] ?? t).toUpperCase();
}

function headlineMentionsSymbol(headline: string, symbol: string): boolean {
  const base = normalizeTickerKey(symbol);
  if (!base || base.length < 2) return false;
  const h = headline.toUpperCase();
  // Word-boundary-ish match to avoid "MAIN" in "maintain"
  const re = new RegExp(`(?:^|[^A-Z0-9])${base}(?:[^A-Z0-9]|$)`);
  return re.test(h);
}

function toNewsArticle(item: FinnhubNewsItem, fetchSymbol: string): NewsArticle {
  const dt = new Date(item.datetime * 1000);
  let syms = parseRelatedTickers(item.related, fetchSymbol);
  const symKey = normalizeTickerKey(fetchSymbol);
  if (syms.length === 0 && headlineMentionsSymbol(item.headline || "", fetchSymbol)) {
    syms = [symKey];
  }
  // Drop fetch-symbol attribution when neither related nor headline supports it
  const tickerSentiment = syms.map((ticker) => ({
    ticker,
    relevance: normalizeTickerKey(ticker) === symKey ? 0.9 : 0.6,
    sentimentScore: 0,
    sentimentLabel: "",
  }));
  return {
    title: item.headline || "",
    url: item.url || "",
    source: item.source || "",
    publishedAt: dt.toISOString(),
    summary: item.summary || "",
    overallSentiment: "",
    overallSentimentScore: 0,
    tickerSentiment,
    topics: item.category ? [item.category] : [],
  };
}

function mergeArticleTickers(a: NewsArticle, b: NewsArticle): NewsArticle {
  const seen = new Set(a.tickerSentiment.map((t) => t.ticker.toUpperCase()));
  const merged = [...a.tickerSentiment];
  for (const ts of b.tickerSentiment) {
    const k = ts.ticker.toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(ts);
  }
  return { ...a, tickerSentiment: merged };
}

export async function fetchFinnhubCompanyNews(
  symbol: string,
  apiKey: string,
): Promise<NewsArticle[]> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 7);

  const params = new URLSearchParams({
    symbol,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    token: apiKey,
  });

  const res = await fetch(`${FINNHUB_BASE}/company-news?${params}`);
  if (!res.ok) {
    console.error(`Finnhub company-news error: ${res.status} for ${symbol}`);
    return [];
  }

  const data: FinnhubNewsItem[] = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((item) => toNewsArticle(item, symbol));
}

export async function fetchFinnhubPortfolioNews(
  symbols: string[],
  apiKey: string,
): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(
    symbols.slice(0, 10).map((s) => fetchFinnhubCompanyNews(s, apiKey)),
  );

  const byUrl = new Map<string, NewsArticle>();

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const a of r.value) {
      const url = a.url?.trim();
      if (!url) continue;
      const existing = byUrl.get(url);
      if (!existing) {
        byUrl.set(url, a);
      } else {
        byUrl.set(url, mergeArticleTickers(existing, a));
      }
    }
  }

  const articles = [...byUrl.values()];
  articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return articles.slice(0, 30);
}
