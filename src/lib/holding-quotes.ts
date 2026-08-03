import { getQuotesWithCache } from "@/lib/quote-cache";
import { marketDataSymbolForHolding } from "@/lib/market-symbol";
import { providerQuotesToQuoteMap } from "@/lib/aid/quotes-map";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";
import type { QuoteData } from "@/lib/types";

type HoldingQuoteInput = {
  ticker: string;
  exchange: string;
  isin?: string | null;
};

/**
 * Fetch Yahoo quotes for holdings using market-data symbols (HK pad, exchange
 * suffixes), then re-key results by the holding's stored `ticker` so AID /
 * home lookups (`quotes[h.ticker]`) succeed.
 */
export async function fetchProviderQuotesForHoldings(
  holdings: HoldingQuoteInput[],
): Promise<Record<string, ProviderQuoteResult>> {
  if (holdings.length === 0) return {};

  const pairs = holdings.map((h) => ({
    ticker: h.ticker,
    fetchKey: marketDataSymbolForHolding(h),
  }));
  const unique = [...new Set(pairs.flatMap((p) => [p.fetchKey, p.ticker].filter(Boolean)))];
  const fetched = await getQuotesWithCache(unique);

  const out: Record<string, ProviderQuoteResult> = {};
  for (const { ticker, fetchKey } of pairs) {
    const q = fetched[fetchKey] ?? fetched[ticker];
    if (q) out[ticker] = { ...q, symbol: ticker };
  }
  return out;
}

export async function fetchQuoteMapForHoldings(
  holdings: HoldingQuoteInput[],
): Promise<Record<string, QuoteData>> {
  return providerQuotesToQuoteMap(await fetchProviderQuotesForHoldings(holdings));
}
