import { looksLikeIsin } from "@/lib/api-providers/isin-resolver";
import {
  baseTickerName,
  normalizeCryptoTicker,
  normalizeTickerForExchange,
  EXCHANGE_SUFFIX_MAP,
} from "@/lib/db/helpers";

/** DeGiro codes and MICs that identify a venue, not a security symbol. */
const EXCHANGE_CODES = new Set([
  ...Object.keys(EXCHANGE_SUFFIX_MAP),
  "XGAT",
  "XETR",
  "TRADEGATE",
  "NASDAQ",
  "NYSE",
  "US",
  "EPA",
  "EBR",
  "STO",
  "OSL",
  "HKG",
  "ASX",
]);

/**
 * True when the stored ticker is actually an exchange code (e.g. TDG + TDG → TDG.DE).
 * Common after broker imports that put the venue in the symbol field.
 */
export function isTickerExchangeCollision(ticker: string, exchange: string): boolean {
  const t = ticker.trim().toUpperCase();
  const ex = exchange.trim().toUpperCase();
  if (!t || !ex) return false;

  const base = baseTickerName(t).toUpperCase();
  if (base === ex) return true;

  if (EXCHANGE_CODES.has(base) && (ex === base || EXCHANGE_CODES.has(ex))) return true;

  if (EXCHANGE_CODES.has(ex) && (t === `${ex}.DE` || t === `${ex}.F` || base === ex)) {
    return true;
  }

  return false;
}

/** Yahoo-compatible symbol from bare ticker + exchange (no ISIN fallback). */
export function yahooSymbolFromTickerExchange(ticker: string, exchange: string): string {
  if (ticker.includes(".")) return ticker;
  if (exchange.toUpperCase() === "CRYPTO") return normalizeCryptoTicker(ticker);
  return normalizeTickerForExchange(ticker, exchange);
}

/**
 * Symbol to send to quote/history providers for a holding.
 * Uses ISIN when the ticker collides with the exchange code.
 */
export function marketDataSymbolForHolding(h: {
  ticker: string;
  exchange: string;
  isin?: string | null;
}): string {
  const isin = (h.isin ?? "").trim();
  if (isin && looksLikeIsin(isin) && isTickerExchangeCollision(h.ticker, h.exchange)) {
    return isin;
  }
  return yahooSymbolFromTickerExchange(h.ticker, h.exchange);
}
