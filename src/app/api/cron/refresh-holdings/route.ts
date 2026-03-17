import { NextRequest } from "next/server";
import { listDistinctHoldingTickers, batchUpdateValueInEur, resolveStaleTickersViaFigi } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";
import type { ExchangeRates } from "@/lib/types";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const QUOTE_BATCH_SIZE = 15;
const FX_PAIRS = [
  "EURUSD", "EURGBP", "EURDKK", "EURCAD", "EURCHF",
  "EURSEK", "EURNOK", "EURAUD", "EURNZD", "EURJPY",
  "EURPLN", "EURCZK", "EURHUF", "EURRON", "EURSGD",
  "EURHKD", "EURZAR", "EURTRY", "EURBRL", "EURMXN",
];

const runRefreshHoldings = withCronLogging("refresh-holdings", async () => {
  const distinctTickers = await listDistinctHoldingTickers();
  if (distinctTickers.length === 0) {
    return { tickers: 0, updated: 0, errors: 0 };
  }

  const uniqueTickers = [...new Set(distinctTickers.map((h) => h.ticker))];

  const yahoo = new YahooProvider();

  // 1. Fetch exchange rates once
  const exchangeRates: ExchangeRates = {};
  const neededCurrencies = new Set(
    distinctTickers
      .map((h) => h.displayCurrency.toUpperCase())
      .filter((c) => c !== "EUR" && c !== "GBX"),
  );
  // Only fetch FX pairs we actually need
  const neededPairs = FX_PAIRS.filter((pair) => {
    const to = pair.substring(3);
    return neededCurrencies.has(to);
  });
  // Always include EURGBP if any holding uses GBX
  if (distinctTickers.some((h) => h.displayCurrency === "GBX" || h.displayCurrency === "GBp")) {
    if (!neededPairs.includes("EURGBP")) neededPairs.push("EURGBP");
  }

  const rateResults = await Promise.allSettled(
    neededPairs.map(async (pair) => {
      const from = pair.substring(0, 3);
      const to = pair.substring(3);
      const rate = await yahoo.getExchangeRate(from, to);
      return { pair, rate };
    }),
  );
  for (const r of rateResults) {
    if (r.status === "fulfilled" && r.value.rate > 0) {
      exchangeRates[r.value.pair] = r.value.rate;
    }
  }

  // 2. Fetch quotes in batches
  const quotes: Record<string, { price: number; currency: string }> = {};
  let errorCount = 0;
  const failedTickers = new Set<string>();

  for (let i = 0; i < uniqueTickers.length; i += QUOTE_BATCH_SIZE) {
    const batch = uniqueTickers.slice(i, i + QUOTE_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (ticker) => {
        const q = await yahoo.getQuote(ticker);
        return { ticker, price: q.regularMarketPrice, currency: q.currency };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.price > 0) {
        quotes[r.value.ticker] = { price: r.value.price, currency: r.value.currency };
      } else {
        errorCount++;
        if (r.status === "fulfilled") failedTickers.add(r.value.ticker);
      }
    }
  }

  // 2b. For failed tickers with a FIGI, attempt to resolve the new ticker via OpenFIGI.
  // This is a self-healing mechanism: once resolved, the holding's ticker is updated
  // in DB so the next cron run fetches the correct ticker from Yahoo directly.
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

        // Patch the in-memory ticker list so step 3 uses the new tickers
        for (const { oldTicker, newTicker } of renames) {
          for (const h of distinctTickers) {
            if (h.ticker.toUpperCase() === oldTicker.toUpperCase()) {
              h.ticker = newTicker;
            }
          }
        }

        // Re-fetch quotes for the corrected tickers
        for (const { newTicker } of renames) {
          try {
            const q = await yahoo.getQuote(newTicker);
            if (q.regularMarketPrice > 0) {
              quotes[newTicker] = { price: q.regularMarketPrice, currency: q.currency };
              errorCount--;
            }
          } catch { /* quote still fails — leave as error */ }
        }
      } catch (err) {
        console.warn("[refresh-holdings] OpenFIGI fallback failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  // 3. Compute per-share EUR value for each (ticker, displayCurrency) pair
  // Group distinct tickers by ticker → set of displayCurrencies
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
      const valueInQuoteCurrency = quote.price; // per share
      const eurPerShare = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
      if (Number.isFinite(eurPerShare) && eurPerShare > 0) {
        pricePerShareEur[displayCurrency] = eurPerShare;
      }
    }

    if (Object.keys(pricePerShareEur).length > 0) {
      updates.push({ ticker, pricePerShareEur });
    }
  }

  // 4. Batch update all holdings
  const totalUpdated = updates.length > 0 ? await batchUpdateValueInEur(updates) : 0;

  return {
    tickers: uniqueTickers.length,
    quoted: Object.keys(quotes).length,
    fxPairs: Object.keys(exchangeRates).length,
    updated: totalUpdated,
    errors: errorCount,
    figiResolved,
  };
});

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("refresh-holdings", req.headers.get("authorization"));
  if (denied) return denied;
  return runRefreshHoldings();
}
