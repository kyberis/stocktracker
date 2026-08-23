import { listDistinctHoldingTickers, batchUpdateValueInEur } from "@/lib/db";
import { fetchSharedQuotesAndRates, shouldFetchLiveMarketData } from "@/lib/cron-quotes";
import { healFailedHoldingQuotes, quotesFromShared } from "@/lib/holding-quote-coverage";
import { recordCoverageGaps } from "@/lib/coverage-gaps";
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

  const { quotes, failedTickers } = quotesFromShared(uniqueTickers, shared.quotes);
  let exchangeRates: ExchangeRates = shared.exchangeRates;
  let errorCount = shared.quoteErrors;

  const healed = await healFailedHoldingQuotes({
    distinctTickers,
    failedTickers,
    quotes,
    exchangeRates,
  });
  exchangeRates = healed.exchangeRates;
  errorCount = Math.max(healed.stillFailed.length, errorCount - healed.figiResolved);

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
    const quote = healed.quotes[ticker];
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

  await recordCoverageGaps(healed.stillFailed);

  return {
    tickers: uniqueTickers.length,
    quoted: Object.keys(healed.quotes).length,
    fxPairs: Object.keys(exchangeRates).length,
    updated: totalUpdated,
    errors: errorCount,
    figiResolved: healed.figiResolved,
    uncoveredTickers: healed.stillFailed.slice(0, 100),
    coverageGaps: healed.stillFailed.length,
  };
}
