import type { ProviderQuoteResult } from "@/lib/api-providers/types";
import { getMarketStatus } from "@/lib/market-hours";
import { buildNeededFxPairs } from "@/lib/fx-pairs";
import { getQuotesWithCache, getRatesWithCache } from "@/lib/quote-cache";
import type { ExchangeRates } from "@/lib/types";

/** Same batch size as the previous snapshot / refresh-holdings Yahoo loops. */
export const CRON_QUOTE_BATCH_SIZE = 15;

export type MarketAwareHolding = {
  assetType?: string;
  exchange?: string;
};

/**
 * Whether quote/FX crons should call Yahoo.
 *
 * Crypto is always live. A known open exchange keeps the job running. If every
 * recognised exchange is closed, unknown-exchange tickers still run on weekdays
 * (alerts can fire on symbols we have no holding metadata for).
 */
export function shouldFetchLiveMarketData(
  holdings: ReadonlyArray<MarketAwareHolding>,
  now?: Date,
): boolean {
  const ts = now ?? new Date();
  if (holdings.some((h) => h.assetType === "crypto")) return true;

  const withExchange = holdings.filter((h) => h.exchange);
  if (withExchange.some((h) => getMarketStatus(h.exchange!, ts).isOpen)) {
    return true;
  }

  const hasUnknown =
    holdings.length === 0 ||
    holdings.some((h) => !h.exchange && h.assetType !== "crypto");
  if (hasUnknown) {
    const day = ts.getUTCDay();
    return day !== 0 && day !== 6;
  }

  return false;
}

/**
 * Shared quote + FX refresh used by portfolio-snapshots, refresh-holdings,
 * and check-alerts. Reads/writes the Redis quote cache so overlapping crons
 * reuse one Yahoo pass.
 */
export async function fetchSharedQuotesAndRates(input: {
  tickers: string[];
  currencies: Iterable<string | null | undefined>;
}): Promise<{
  quotes: Record<string, ProviderQuoteResult>;
  exchangeRates: ExchangeRates;
  quoteErrors: number;
  uniqueTickers: number;
}> {
  const uniqueTickers = [
    ...new Set(input.tickers.map((t) => t.trim()).filter(Boolean)),
  ];
  const quotes: Record<string, ProviderQuoteResult> = {};
  for (let i = 0; i < uniqueTickers.length; i += CRON_QUOTE_BATCH_SIZE) {
    const batch = uniqueTickers.slice(i, i + CRON_QUOTE_BATCH_SIZE);
    Object.assign(quotes, await getQuotesWithCache(batch));
  }

  let quoteErrors = 0;
  for (const ticker of uniqueTickers) {
    const quote = quotes[ticker];
    if (!quote || !(quote.regularMarketPrice > 0)) quoteErrors += 1;
  }

  const neededPairs = buildNeededFxPairs([
    ...input.currencies,
    ...Object.values(quotes).map((q) => q.currency),
  ]);
  const exchangeRates =
    neededPairs.length > 0 ? await getRatesWithCache(neededPairs) : {};

  return {
    quotes,
    exchangeRates,
    quoteErrors,
    uniqueTickers: uniqueTickers.length,
  };
}
