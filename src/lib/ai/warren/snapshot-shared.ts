/**
 * Pure helpers shared between the **server-side** Warren snapshot
 * (`build-snapshot.ts`, used by Telegram/MCP) and the **client-side** snapshot
 * built in `WarrenDrawer.tsx`. Keeping the row-shape logic in one place is
 * critical: if these two diverge, Warren's numbers will silently disagree
 * across surfaces (we shipped a bug exactly like that — see the regression
 * tests in `__tests__/build-snapshot.test.ts`).
 *
 * Currency contract for what the AI consumes:
 *   - `purchasePrice`, `currentPrice`, `currency`, and 52w high/low are ALL
 *     expressed in the holding's *display* currency (e.g. GBP, USD, EUR).
 *   - `value` is in EUR so positions in different currencies can be summed
 *     and weighted against `totalCurrentEUR`.
 *   - `totalGainPct` is computed from EUR-normalised cost and value (a
 *     percentage is currency-neutral once both sides share a unit).
 */

import type { ExchangeRates, Holding, QuoteData } from "@/lib/types";
import { convertCurrency, convertToEUR, resolveQuoteCurrency } from "@/lib/utils";

export interface TopHoldingRow {
  ticker: string;
  name: string;
  shares: number;
  currentPrice?: number;
  purchasePrice: number;
  currency: string;
  value: number;
  weight: number;
  sector?: string;
  region?: string;
  assetType: string;
  dayChangePct?: number;
  totalGainPct: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

function round(n: number, decimals = 2): number {
  const m = Math.pow(10, decimals);
  return Math.round(n * m) / m;
}

export function buildTopHoldingRow(
  h: Holding,
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  totalCurrentEUR: number,
): TopHoldingRow {
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
