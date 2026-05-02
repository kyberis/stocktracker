import {
  listHoldings as dbListHoldings,
  listCashEntries as dbListCashEntries,
  resolvePortfolioId,
} from "@/lib/db";
import { createProvider } from "@/lib/api-providers";
import { calculatePortfolioTotals, computeAllocationByType } from "@/lib/portfolio-summary";
import { convertCurrency, convertToEUR, normalizeCurrency, resolveQuoteCurrency } from "@/lib/utils";
import type { ExchangeRates, Holding, QuoteData } from "@/lib/types";
import type { PortfolioSnapshot } from "./tools";

// Rate keys MUST be in the `EUR<CURRENCY>` shape because that's what
// `convertToEUR` / `convertCurrency` look up. The previous prefetch list used
// the inverted `<CURRENCY>EUR` shape, which silently produced no-op FX
// conversion for every non-EUR holding in Warren's snapshot — making totals
// and per-holding values diverge from the web.
const FX_PAIRS_TO_PREFETCH = ["EURUSD", "EURGBP", "EURJPY", "EURCHF", "EURCAD", "EURAUD"];

/**
 * Server-side equivalent of `WarrenDrawer.buildSnapshot`. The web client builds
 * the snapshot from in-memory portfolio context, but Telegram has no client —
 * so we build the same shape from DB + Yahoo here.
 *
 * Errors (e.g. one quote fails) are tolerated: missing fields fall back to
 * purchase price so Warren can still answer.
 */
export async function buildPortfolioSnapshot(opts: {
  userId: string;
  portfolioId?: string;
  baseCurrency?: string;
}): Promise<PortfolioSnapshot> {
  const baseCurrency = (opts.baseCurrency || "EUR").toUpperCase();
  const portfolioId = opts.portfolioId
    ? await resolvePortfolioId(opts.userId, opts.portfolioId)
    : undefined;

  const [holdings, cashEntries] = await Promise.all([
    dbListHoldings(opts.userId, portfolioId),
    dbListCashEntries(opts.userId, portfolioId),
  ]);

  const provider = createProvider("yahoo");
  const tickers = Array.from(new Set(holdings.map((h) => h.ticker).filter(Boolean)));
  const quoteEntries = await Promise.all(
    tickers.map(async (t) => {
      try {
        const q = await provider.getQuote(t);
        const data: QuoteData = {
          symbol: q.symbol || t,
          shortName: q.shortName || t,
          regularMarketPrice: q.regularMarketPrice || 0,
          regularMarketChange: q.regularMarketChange || 0,
          regularMarketChangePercent: q.regularMarketChangePercent || 0,
          currency: q.currency || "USD",
          regularMarketPreviousClose: q.regularMarketPreviousClose || 0,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || 0,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow || 0,
        };
        return [t, data] as const;
      } catch {
        return [t, null] as const;
      }
    }),
  );
  const quotes: Record<string, QuoteData> = {};
  for (const [t, q] of quoteEntries) if (q) quotes[t] = q;

  const exchangeRates = await fetchExchangeRates(provider, [
    ...new Set([
      ...holdings.map((h) => `EUR${normalizeCurrency(h.displayCurrency)}`),
      ...Object.values(quotes).map((q) => `EUR${normalizeCurrency(q.currency)}`),
      ...FX_PAIRS_TO_PREFETCH,
    ]),
  ]);

  const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency);
  const allocation = computeAllocationByType(holdings, cashEntries, quotes, exchangeRates, baseCurrency);

  const topHoldings = holdings
    .map((h) => buildTopHoldingRow(h, quotes, exchangeRates, totals.totalCurrentEUR))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  const cashSummary = cashEntries.reduce(
    (acc, c) => {
      const key = c.displayCurrency || "EUR";
      acc[key] = (acc[key] || 0) + c.amountEUR;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    baseCurrency,
    totals: {
      value: round(totals.totalCurrentEUR),
      cost: round(totals.totalCostEUR),
      gainLoss: round(totals.totalGainLoss),
      gainLossPct: round(totals.totalGainLossPercent),
      dayChange: round(totals.dayGainLossEUR),
    },
    holdingsCount: holdings.length,
    topHoldings,
    allocation: allocation.map((a) => ({ type: a.label, pct: round(a.percent, 1) })),
    cashSummary,
  };
}

function buildTopHoldingRow(
  h: Holding,
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  totalCurrentEUR: number,
) {
  // Currency contract for the snapshot the AI consumes:
  //   - `purchasePrice`, `currentPrice`, `currency` are ALL expressed in the
  //     holding's *display* currency (e.g. GBP, USD, EUR).
  //   - `value` and `totalGainPct` are computed against EUR so that holdings
  //     in different currencies can be aggregated.
  //
  // Why this matters: Yahoo returns LSE prices in GBp (pence) while the user
  // typically stores the holding as GBP. Mixing those units in `totalGainPct`
  // produced ~100x wrong gain percentages, and tagging `purchasePrice` with
  // the quote currency made Warren say things like "avg cost 45 GBp" when
  // the web showed "£45 GBP". `resolveQuoteCurrency` + `convertCurrency`
  // already know how to normalise GBX/GBP — we just have to use them.
  const q = quotes[h.ticker];
  const displayCur = h.displayCurrency;
  const quoteCur = q ? resolveQuoteCurrency(displayCur, q.currency) : displayCur;
  const quotePrice = q?.regularMarketPrice ?? 0;

  const localValue = quotePrice * h.shares;
  const valueEUR = q
    ? convertToEUR(localValue, quoteCur, exchangeRates)
    : convertToEUR(h.purchasePrice * h.shares, displayCur, exchangeRates);

  const currentPriceDisplay = q
    ? convertCurrency(quotePrice, quoteCur, displayCur, exchangeRates)
    : undefined;

  const fiftyTwoWeekHighDisplay = q?.fiftyTwoWeekHigh
    ? convertCurrency(q.fiftyTwoWeekHigh, quoteCur, displayCur, exchangeRates)
    : undefined;
  const fiftyTwoWeekLowDisplay = q?.fiftyTwoWeekLow
    ? convertCurrency(q.fiftyTwoWeekLow, quoteCur, displayCur, exchangeRates)
    : undefined;

  // Both sides converted to EUR; the resulting percentage is currency-neutral.
  const costEUR = convertToEUR(h.purchasePrice * h.shares, displayCur, exchangeRates);
  const totalGainPct = costEUR > 0 ? ((valueEUR - costEUR) / costEUR) * 100 : 0;

  return {
    ticker: h.ticker,
    name: h.name || h.ticker,
    shares: h.shares,
    currentPrice: currentPriceDisplay,
    purchasePrice: h.purchasePrice,
    currency: displayCur,
    value: round(valueEUR),
    weight: totalCurrentEUR > 0 ? round((valueEUR / totalCurrentEUR) * 100, 2) : 0,
    sector: h.sector || undefined,
    region: h.region || undefined,
    assetType: h.assetType || "stock",
    dayChangePct: q?.regularMarketChangePercent,
    totalGainPct: round(totalGainPct, 2),
    fiftyTwoWeekHigh: fiftyTwoWeekHighDisplay,
    fiftyTwoWeekLow: fiftyTwoWeekLowDisplay,
  };
}

async function fetchExchangeRates(
  provider: ReturnType<typeof createProvider>,
  pairs: string[],
): Promise<ExchangeRates> {
  const unique = Array.from(new Set(pairs.filter((p) => p && p.length === 6 && p.slice(0, 3) !== p.slice(3))));
  const out: ExchangeRates = {};
  await Promise.all(
    unique.map(async (pair) => {
      try {
        const from = pair.slice(0, 3);
        const to = pair.slice(3);
        const rate = await provider.getExchangeRate(from, to);
        if (rate > 0) out[pair] = rate;
      } catch {
        // tolerate provider failures — converters fall back to 1
      }
    }),
  );
  return out;
}

function round(n: number, decimals = 2): number {
  const m = Math.pow(10, decimals);
  return Math.round(n * m) / m;
}
