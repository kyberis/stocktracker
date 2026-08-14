import type { NewsArticle } from "@/lib/api-providers/types";

function holdingRankOf(article: NewsArticle, upperTickers: string[]): number {
  let best = 999;
  for (const ts of article.tickerSentiment) {
    const i = upperTickers.indexOf(ts.ticker.toUpperCase());
    if (i !== -1 && i < best) best = i;
  }
  return best;
}

/** Best matching holding ticker for an article (lower index = larger weight). */
export function bestHoldingTicker(
  article: NewsArticle,
  orderedTickers: string[],
): string {
  const upper = orderedTickers.map((t) => t.toUpperCase());
  const rank = holdingRankOf(article, upper);
  if (rank < upper.length) return upper[rank]!;
  return article.tickerSentiment[0]?.ticker?.toUpperCase() ?? "";
}

/** Lower index in orderedTickers = larger portfolio weight. */
export function rankPortfolioNewsForTickers(
  articles: NewsArticle[],
  orderedTickers: string[],
): NewsArticle[] {
  const upper = orderedTickers.map((t) => t.toUpperCase());
  return [...articles].sort((a, b) => {
    const ra = holdingRankOf(a, upper);
    const rb = holdingRankOf(b, upper);
    if (ra !== rb) return ra - rb;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

/**
 * Round-robin across holdings so one ticker cannot fill the feed.
 * Preserves input order within each ticker (callers should pre-sort).
 */
export function diversifyItemsByTicker<T>(
  items: T[],
  orderedTickers: string[],
  getTicker: (item: T) => string,
  opts: { limit: number; maxPerTicker?: number },
): T[] {
  const maxPerTicker = opts.maxPerTicker ?? 2;
  const { limit } = opts;
  if (limit <= 0 || items.length === 0) return [];

  const upper = orderedTickers.map((t) => t.toUpperCase());
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const key = (getTicker(item) || "").toUpperCase();
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  const tickerOrder = [
    ...upper,
    ...[...buckets.keys()].filter((k) => k && !upper.includes(k)),
  ];

  const out: T[] = [];
  const used = new Set<T>();

  for (let pass = 0; pass < maxPerTicker && out.length < limit; pass++) {
    for (const ticker of tickerOrder) {
      if (out.length >= limit) break;
      const list = buckets.get(ticker);
      if (!list || pass >= list.length) continue;
      const item = list[pass]!;
      out.push(item);
      used.add(item);
    }
  }

  if (out.length < limit) {
    for (const item of items) {
      if (out.length >= limit) break;
      if (used.has(item)) continue;
      out.push(item);
      used.add(item);
    }
  }

  return out;
}

export function diversifyPortfolioNews(
  articles: NewsArticle[],
  orderedTickers: string[],
  opts: { limit: number; maxPerTicker?: number },
): NewsArticle[] {
  const ranked = rankPortfolioNewsForTickers(articles, orderedTickers);
  return diversifyItemsByTicker(
    ranked,
    orderedTickers,
    (article) => bestHoldingTicker(article, orderedTickers),
    opts,
  );
}
