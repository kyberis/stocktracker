import { listDistinctHoldingTickers, batchUpdateValueInEur, resolveStaleTickersViaFigi } from "@/lib/db";
import { fetchSharedQuotesAndRates, shouldFetchLiveMarketData } from "@/lib/cron-quotes";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";
import type { ExchangeRates } from "@/lib/types";

export async function runRefreshHoldingsJob(): Promise<Record<string, unknown>> {
  const distinctTickers = await listDistinctHoldingTickers();
  if (distinctTickers.length === 0) {
    return { tickers: 0, updated: 0, errors: 0 };
  }

  const uniqueTickers = [...new Set(distinctTickers.map((h) => h.ticker))];

  if (!shouldFetchLiveMarketData(distinctTickers)) {
    return {
      tickers: uniqueTickers.length,
      updated: 0,
      errors: 0,
      skippedMarketsClosed: true,
    };
  }

  const shared = await fetchSharedQuotesAndRates({
    tickers: uniqueTickers,
    currencies: distinctTickers.map((h) => h.displayCurrency),
  });

  const quotes: Record<string, { price: number; currency: string }> = {};
  const failedTickers = new Set<string>();
  for (const ticker of uniqueTickers) {
    const q = shared.quotes[ticker];
    if (q && q.regularMarketPrice > 0) {
      quotes[ticker] = { price: q.regularMarketPrice, currency: q.currency };
    } else {
      failedTickers.add(ticker);
    }
  }

  let exchangeRates: ExchangeRates = shared.exchangeRates;
  let errorCount = shared.quoteErrors;

  let figiResolved = 0;
  if (failedTickers.size > 0) {
    const staleWithFigi = distinctTickers
      .filter((h) => failedTickers.has(h.ticker) && h.figiShareClass)
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
          for (const h of distinctTickers) {
            if (h.ticker.toUpperCase() === oldTicker.toUpperCase()) {
              h.ticker = newTicker;
            }
          }
        }

        if (renames.length > 0) {
          const healed = await fetchSharedQuotesAndRates({
            tickers: renames.map((r) => r.newTicker),
            currencies: [
              ...distinctTickers.map((h) => h.displayCurrency),
              ...Object.values(quotes).map((q) => q.currency),
            ],
          });
          for (const { newTicker } of renames) {
            const q = healed.quotes[newTicker];
            if (q && q.regularMarketPrice > 0) {
              quotes[newTicker] = { price: q.regularMarketPrice, currency: q.currency };
              errorCount = Math.max(0, errorCount - 1);
            }
          }
          exchangeRates = { ...exchangeRates, ...healed.exchangeRates };
        }
      } catch (err) {
        console.warn("[refresh-holdings] OpenFIGI fallback failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  const tickerCurrencyMap = new Map<string, Set<string>>();
  for (const h of distinctTickers) {
    let set = tickerCurrencyMap.get(h.ticker);
    if (!set) {
      set = new Set();
      tickerCurrencyMap.set(h.ticker, set);
    }
    set.add(h.displayCurrency);
  }

  const updates: { ticker: string; pricePerShareEur: Record<string, number> }[] = [];

  for (const [ticker, currencies] of tickerCurrencyMap) {
    const quote = quotes[ticker];
    if (!quote) continue;

    const pricePerShareEur: Record<string, number> = {};
    for (const displayCurrency of currencies) {
      const quoteCurrency = resolveQuoteCurrency(displayCurrency, quote.currency);
      const eurPerShare = convertToEUR(quote.price, quoteCurrency, exchangeRates);
      if (Number.isFinite(eurPerShare) && eurPerShare > 0) {
        pricePerShareEur[displayCurrency] = eurPerShare;
      }
    }

    if (Object.keys(pricePerShareEur).length > 0) {
      updates.push({ ticker, pricePerShareEur });
    }
  }

  const totalUpdated = updates.length > 0 ? await batchUpdateValueInEur(updates) : 0;

  return {
    tickers: uniqueTickers.length,
    quoted: Object.keys(quotes).length,
    fxPairs: Object.keys(exchangeRates).length,
    updated: totalUpdated,
    errors: errorCount,
    figiResolved,
  };
}
