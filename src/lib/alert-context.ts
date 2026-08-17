import {
  listPortfolioNewsForTickers,
  normalizePortfolioNewsSymbol,
} from "@/lib/db/portfolio-news";
import type { NewsArticle } from "@/lib/api-providers/types";

export const ALERT_NEWS_LOOKBACK_MS = 48 * 3600 * 1000;
export const ALERT_NEWS_MAX_HEADLINES = 3;

export interface AlertHeadline {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
}

export interface AlertNewsContext {
  headlines: AlertHeadline[];
}

export function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isWithinLookback(publishedAt: string, now = Date.now(), lookbackMs = ALERT_NEWS_LOOKBACK_MS): boolean {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return false;
  return now - t <= lookbackMs && t <= now + 60_000;
}

export function selectAlertHeadlines(
  articles: NewsArticle[],
  opts?: { maxHeadlines?: number; lookbackMs?: number; now?: number },
): AlertHeadline[] {
  const max = opts?.maxHeadlines ?? ALERT_NEWS_MAX_HEADLINES;
  const lookbackMs = opts?.lookbackMs ?? ALERT_NEWS_LOOKBACK_MS;
  const now = opts?.now ?? Date.now();

  return articles
    .filter((a) => a.title?.trim() && isHttpUrl(a.url) && isWithinLookback(a.publishedAt, now, lookbackMs))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, max)
    .map((a) => ({
      title: a.title.trim(),
      source: (a.source || "").trim(),
      publishedAt: a.publishedAt,
      url: a.url.trim(),
    }));
}

export async function getAlertNewsContext(
  ticker: string,
  opts?: { maxHeadlines?: number; lookbackMs?: number },
): Promise<AlertNewsContext> {
  const symbol = normalizePortfolioNewsSymbol(ticker);
  if (!symbol) return { headlines: [] };
  try {
    const articles = await listPortfolioNewsForTickers([symbol], 20);
    return { headlines: selectAlertHeadlines(articles, opts) };
  } catch (err) {
    console.error(
      "[alert-context] news lookup failed:",
      err instanceof Error ? err.message : err,
    );
    return { headlines: [] };
  }
}
