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

/**
 * Alternate Yahoo symbols when the primary venue ticker is thin/unavailable.
 * Tried in order after exchange-suffix fallbacks.
 */
const YAHOO_SYMBOL_ALIASES: Record<string, string[]> = {
  "W9C.DE": ["W9C.F", "CSU.TO"],
  "W9C.F": ["W9C.DE", "CSU.TO"],
  W9C: ["W9C.DE", "W9C.F", "CSU.TO"],
  "CSU.TO": ["W9C.DE", "W9C.F"],
};

/** Extra Yahoo symbols to try when `symbol` has no usable quote. */
export function yahooSymbolAliases(symbol: string): string[] {
  const key = symbol.trim().toUpperCase();
  return YAHOO_SYMBOL_ALIASES[key] ?? [];
}

/**
 * Yahoo Finance requires Hong Kong tickers zero-padded to 4 digits.
 * `215.HK` → `0215.HK`. Non-numeric or already-padded symbols pass through.
 */
export function normalizeHkYahooSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  const match = upper.match(/^0*(\d{1,5})\.HK$/);
  if (!match) return symbol;
  return `${match[1].padStart(4, "0")}.HK`;
}

/** Public Yahoo Finance quote URL for a ticker (+ optional exchange). */
export function toYahooFinanceQuoteUrl(
  ticker: string,
  exchange?: string | null,
): string {
  const symbol = yahooSymbolFromTickerExchange(ticker.trim(), (exchange ?? "").trim());
  if (!symbol) return "https://finance.yahoo.com/";
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}

/** Yahoo-compatible symbol from bare ticker + exchange (no ISIN fallback). */
export function yahooSymbolFromTickerExchange(ticker: string, exchange: string): string {
  const ex = exchange.trim().toUpperCase();
  let symbol: string;
  if (ticker.includes(".")) {
    symbol = ticker;
  } else if (ex === "CRYPTO") {
    symbol = normalizeCryptoTicker(ticker);
  } else {
    symbol = normalizeTickerForExchange(ticker, exchange);
  }

  // Bare numeric + HKG → 0215.HK even if EXCHANGE_SUFFIX_MAP was missing
  if ((ex === "HKG" || ex === "XHKG") && !symbol.toUpperCase().endsWith(".HK")) {
    const digits = symbol.trim().match(/^0*(\d{1,5})$/);
    if (digits) {
      return `${digits[1].padStart(4, "0")}.HK`;
    }
  }

  return normalizeHkYahooSymbol(symbol);
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
