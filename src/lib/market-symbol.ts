import { isNonUsIsin, looksLikeIsin } from "@/lib/isin";
import {
  baseTickerName,
  canonicalExchangeCode,
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
export function isTickerExchangeCollision(ticker: string, exchange: string | null | undefined): boolean {
  const t = ticker.trim().toUpperCase();
  const ex = (exchange ?? "").trim().toUpperCase();
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
  // Novo Nordisk — Copenhagen / ADR (news tickers strip `.CO`)
  "NOVO-B": ["NOVO-B.CO", "NVO"],
  "NOVO-B.CO": ["NVO"],
  NVO: ["NOVO-B.CO"],
  // Nagarro Tradegate / Xetra
  NA9: ["NA9.DE", "NA9.F"],
  "NA9.DE": ["NA9.F"],
  "NA9.F": ["NA9.DE"],
  // CoinShares Physical Bitcoin (GB00BLD4ZL17) — not NYSE BITC
  "BITC.DE": ["GB00BLD4ZL17.SG", "BITC.SW"],
  "GB00BLD4ZL17.SG": ["BITC.SW"],
  // Hysan / numeric HK bases after news-ticker strip
  "215": ["0215.HK"],
  "215.HK": ["0215.HK"],
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
export function yahooSymbolFromTickerExchange(
  ticker: string,
  exchange: string | null | undefined,
): string {
  const rawExchange = exchange ?? "";
  const ex = rawExchange.trim().toUpperCase();
  let symbol: string;
  if (ticker.includes(".")) {
    symbol = ticker;
  } else if (ex === "CRYPTO") {
    symbol = normalizeCryptoTicker(ticker);
  } else {
    symbol = normalizeTickerForExchange(ticker, rawExchange);
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
 * Known US/EU ticker namesakes used when SnapTrade omits ISIN.
 * Yahoo's unsuffixed `BITC` is the NYSE Bitwise ETF (~$40); IBKR/JustETF BITC
 * is CoinShares Physical Bitcoin (ISIN GB00BLD4ZL17, ~€65).
 * The general quote path is ISIN-first for any unsuffixed ticker + non-US ISIN.
 */
export const COINSHARES_BITC_ISIN = "GB00BLD4ZL17";

const LISTING_COLLISIONS: {
  baseTicker: string;
  displayTicker: string;
  displayExchange: string;
  isin: string;
  namePattern: RegExp;
}[] = [
  {
    baseTicker: "BITC",
    displayTicker: "BITC.DE",
    displayExchange: "XET",
    isin: COINSHARES_BITC_ISIN,
    namePattern: /coinshares/i,
  },
];

const EUROPEAN_VENUES = new Set([
  "XET", "XETR", "GER", "FRA", "AMS", "MIL", "EPA", "PAR", "PA", "AS", "MI",
  "SWX", "LSE", "TDG", "TGD", "GETTEX", "STU",
]);

function listingCollisionFor(input: {
  ticker: string;
  isin?: string | null;
  name?: string | null;
}) {
  const base = baseTickerName(input.ticker).toUpperCase();
  const isin = (input.isin ?? "").trim().toUpperCase();
  return LISTING_COLLISIONS.find((c) => c.baseTicker === base || (isin !== "" && c.isin === isin));
}

export function isListingCollisionRemap(fromTicker: string, toTicker: string): boolean {
  const from = fromTicker.trim().toUpperCase();
  const to = toTicker.trim().toUpperCase();
  return LISTING_COLLISIONS.some(
    (c) =>
      (from === c.baseTicker && to === c.displayTicker) ||
      (from === c.displayTicker && to === c.baseTicker),
  );
}

/**
 * When SnapTrade/Yahoo would map a European listing onto a US namesake, rewrite
 * to the European display ticker and canonical ISIN.
 */
export function disambiguateListing(input: {
  ticker: string;
  exchange?: string | null;
  name?: string | null;
  currency?: string | null;
  isin?: string | null;
}): { ticker: string; exchange: string; isin: string } {
  const ticker = input.ticker.trim();
  const exchange = (input.exchange ?? "").trim();
  const isinIn = (input.isin ?? "").trim().toUpperCase();
  const collision = listingCollisionFor({ ticker, isin: isinIn, name: input.name });
  if (!collision) {
    return { ticker, exchange, isin: isinIn };
  }

  const venue = (canonicalExchangeCode(exchange) || exchange).toUpperCase();
  const currency = (input.currency ?? "").trim().toUpperCase();
  const alreadyEuropean = ticker.toUpperCase() === collision.displayTicker;
  const isEuropean =
    alreadyEuropean ||
    isinIn === collision.isin ||
    collision.namePattern.test(input.name ?? "") ||
    currency === "EUR" ||
    EUROPEAN_VENUES.has(venue);

  if (!isEuropean) {
    return { ticker, exchange, isin: isinIn };
  }

  return {
    ticker: collision.displayTicker,
    exchange: collision.displayExchange,
    isin: isinIn || collision.isin,
  };
}

/** Yahoo treats symbols with no `.` suffix as US listings. */
function yahooSymbolIsUnsuffixed(ticker: string, exchange: string | null | undefined): boolean {
  return !yahooSymbolFromTickerExchange(ticker, exchange).includes(".");
}

function shouldQuoteByIsin(h: {
  ticker: string;
  exchange: string | null | undefined;
  isin?: string | null;
  name?: string | null;
}): boolean {
  if (isTickerExchangeCollision(h.ticker, h.exchange)) return true;

  const collision = listingCollisionFor(h);
  if (collision) {
    const venue = (canonicalExchangeCode(h.exchange ?? "") || h.exchange || "").toUpperCase();
    return (
      collision.namePattern.test(h.name ?? "") ||
      (h.isin ?? "").trim().toUpperCase() === collision.isin ||
      h.ticker.toUpperCase() === collision.displayTicker ||
      EUROPEAN_VENUES.has(venue)
    );
  }

  // Same ticker, different security: unsuffixed Yahoo lookup is the US namesake.
  const isin = (h.isin ?? "").trim();
  return isNonUsIsin(isin) && yahooSymbolIsUnsuffixed(h.ticker, h.exchange);
}

/**
 * Symbol to send to quote/history providers for a holding.
 * Uses ISIN when the ticker collides with the exchange code, when a known
 * US/EU namesake would otherwise quote the wrong security, or whenever an
 * unsuffixed ticker carries a non-US ISIN (Yahoo would treat it as US).
 */
export function marketDataSymbolForHolding(h: {
  ticker: string;
  exchange: string | null | undefined;
  isin?: string | null;
  name?: string | null;
}): string {
  const disambiguated = disambiguateListing(h);
  const isin = disambiguated.isin || (h.isin ?? "").trim();
  const exchange = disambiguated.exchange || h.exchange;
  if (
    isin &&
    looksLikeIsin(isin) &&
    shouldQuoteByIsin({ ...h, ticker: disambiguated.ticker, exchange, isin })
  ) {
    return isin;
  }
  return yahooSymbolFromTickerExchange(disambiguated.ticker, exchange);
}
