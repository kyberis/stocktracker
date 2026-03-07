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

function toNewsArticle(item: FinnhubNewsItem): NewsArticle {
  const dt = new Date(item.datetime * 1000);
  return {
    title: item.headline || "",
    url: item.url || "",
    source: item.source || "",
    publishedAt: dt.toISOString(),
    summary: item.summary || "",
    overallSentiment: "",
    overallSentimentScore: 0,
    tickerSentiment: [],
    topics: item.category ? [item.category] : [],
  };
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

  return data.map(toNewsArticle);
}

export async function fetchFinnhubPortfolioNews(
  symbols: string[],
  apiKey: string,
): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(
    symbols.slice(0, 10).map((s) => fetchFinnhubCompanyNews(s, apiKey)),
  );

  const seen = new Set<string>();
  const articles: NewsArticle[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const a of r.value) {
      if (seen.has(a.url)) continue;
      seen.add(a.url);
      articles.push(a);
    }
  }

  articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return articles.slice(0, 30);
}
