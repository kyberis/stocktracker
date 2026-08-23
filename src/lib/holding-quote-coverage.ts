import { resolveStaleTickersViaFigi } from "@/lib/db";
import type { DistinctHoldingTicker } from "@/lib/db/holdings";
import { fetchSharedQuotesAndRates } from "@/lib/cron-quotes";
import type { ExchangeRates } from "@/lib/types";

export type QuotedTicker = { price: number; currency: string };

export function quotesFromShared(
  uniqueTickers: readonly string[],
  sharedQuotes: Record<string, { regularMarketPrice: number; currency: string } | undefined>,
): { quotes: Record<string, QuotedTicker>; failedTickers: string[] } {
  const quotes: Record<string, QuotedTicker> = {};
  const failedTickers: string[] = [];
  for (const ticker of uniqueTickers) {
    const q = sharedQuotes[ticker];
    if (q && q.regularMarketPrice > 0) {
      quotes[ticker] = { price: q.regularMarketPrice, currency: q.currency };
    } else {
      failedTickers.push(ticker);
    }
  }
  return { quotes, failedTickers };
}

/**
 * When Yahoo misses a holding quote, try OpenFIGI rename + a second shared fetch.
 * Used by refresh-holdings (primary) and the weekly coverage-reconcile backup.
 */
export async function healFailedHoldingQuotes(args: {
  distinctTickers: DistinctHoldingTicker[];
  failedTickers: readonly string[];
  quotes: Record<string, QuotedTicker>;
  exchangeRates: ExchangeRates;
}): Promise<{
  quotes: Record<string, QuotedTicker>;
  exchangeRates: ExchangeRates;
  figiResolved: number;
  stillFailed: string[];
}> {
  const failed = new Set(args.failedTickers);
  if (failed.size === 0) {
    return {
      quotes: args.quotes,
      exchangeRates: args.exchangeRates,
      figiResolved: 0,
      stillFailed: [],
    };
  }

  const quotes = { ...args.quotes };
  let exchangeRates = args.exchangeRates;
  let figiResolved = 0;

  const staleWithFigi = args.distinctTickers
    .filter((h) => failed.has(h.ticker) && h.figiShareClass)
    .reduce((acc, h) => {
      if (!acc.some((a) => a.figiShareClass === h.figiShareClass)) {
        acc.push({ ticker: h.ticker, exchange: h.exchange, figiShareClass: h.figiShareClass });
      }
      return acc;
    }, [] as { ticker: string; exchange: string; figiShareClass: string }[]);

  if (staleWithFigi.length > 0) {
    try {
      const renames = await resolveStaleTickersViaFigi(staleWithFigi);
      figiResolved = renames.length;

      for (const { oldTicker, newTicker } of renames) {
        failed.delete(oldTicker);
        for (const h of args.distinctTickers) {
          if (h.ticker.toUpperCase() === oldTicker.toUpperCase()) {
            h.ticker = newTicker;
          }
        }
      }

      if (renames.length > 0) {
        const healed = await fetchSharedQuotesAndRates({
          tickers: renames.map((r) => r.newTicker),
          currencies: [
            ...args.distinctTickers.map((h) => h.displayCurrency),
            ...Object.values(quotes).map((q) => q.currency),
          ],
        });
        for (const { newTicker } of renames) {
          const q = healed.quotes[newTicker];
          if (q && q.regularMarketPrice > 0) {
            quotes[newTicker] = { price: q.regularMarketPrice, currency: q.currency };
          } else {
            failed.add(newTicker);
          }
        }
        exchangeRates = { ...exchangeRates, ...healed.exchangeRates };
      }
    } catch (err) {
      console.warn("[holding-quote-coverage] OpenFIGI fallback failed:", err instanceof Error ? err.message : err);
    }
  }

  const stillFailed = [...failed].filter((ticker) => {
    const q = quotes[ticker];
    return !q || q.price <= 0;
  });

  return { quotes, exchangeRates, figiResolved, stillFailed };
}
