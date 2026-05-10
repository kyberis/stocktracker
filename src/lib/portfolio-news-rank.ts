import type { NewsArticle } from "@/lib/api-providers/types";

/** Lower index in orderedTickers = larger portfolio weight. */
export function rankPortfolioNewsForTickers(
  articles: NewsArticle[],
  orderedTickers: string[],
): NewsArticle[] {
  const upper = orderedTickers.map((t) => t.toUpperCase());
  const rankOf = (a: NewsArticle): number => {
    let best = 999;
    for (const ts of a.tickerSentiment) {
      const i = upper.indexOf(ts.ticker.toUpperCase());
      if (i !== -1 && i < best) best = i;
    }
    return best;
  };
  return [...articles].sort((a, b) => {
    const ra = rankOf(a);
    const rb = rankOf(b);
    if (ra !== rb) return ra - rb;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}
