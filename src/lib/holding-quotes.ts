import {
  getQuotesWithCache,
  type QuoteCacheStats,
  type QuoteFetchOptions,
} from "@/lib/quote-cache";
import { marketDataSymbolForHolding } from "@/lib/market-symbol";
import { providerQuotesToQuoteMap } from "@/lib/aid/quotes-map";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";
import type { QuoteData } from "@/lib/types";

type HoldingQuoteInput = {
  ticker: string;
  exchange: string;
  isin?: string | null;
  name?: string | null;
};

export type ProviderQuotesForHoldingsResult = {
  quotes: Record<string, ProviderQuoteResult>;
  stats: QuoteCacheStats;
};

/**
 * Fetch Yahoo quotes for holdings using market-data symbols (HK pad, exchange
 * suffixes), then re-key results by the holding's stored `ticker` so AID /
 * home lookups (`quotes[h.ticker]`) succeed.
 */
export async function fetchProviderQuotesForHoldings(
  holdings: HoldingQuoteInput[],
  opts?: QuoteFetchOptions,
): Promise<Record<string, ProviderQuoteResult>> {
  const { quotes } = await fetchProviderQuotesForHoldingsWithStats(holdings, opts);
  return quotes;
}

export async function fetchProviderQuotesForHoldingsWithStats(
  holdings: HoldingQuoteInput[],
  opts?: QuoteFetchOptions,
): Promise<ProviderQuotesForHoldingsResult> {
  if (holdings.length === 0) {
    return { quotes: {}, stats: { hitCount: 0, missCount: 0 } };
  }

  const pairs = holdings.map((h) => ({
    ticker: h.ticker,
    fetchKey: marketDataSymbolForHolding(h),
  }));
  const unique = [...new Set(pairs.flatMap((p) => [p.fetchKey, p.ticker].filter(Boolean)))];
  let stats: QuoteCacheStats = { hitCount: 0, missCount: 0 };
  const fetched = await getQuotesWithCache(unique, {
    ...opts,
    onStats: (s) => {
      stats = s;
      opts?.onStats?.(s);
    },
  });

  const out: Record<string, ProviderQuoteResult> = {};
  for (const { ticker, fetchKey } of pairs) {
    const q = fetched[fetchKey] ?? fetched[ticker];
    if (q) out[ticker] = { ...q, symbol: ticker };
  }
  return { quotes: out, stats };
}

export async function fetchQuoteMapForHoldings(
  holdings: HoldingQuoteInput[],
  opts?: QuoteFetchOptions,
): Promise<Record<string, QuoteData>> {
  return providerQuotesToQuoteMap(await fetchProviderQuotesForHoldings(holdings, opts));
}
