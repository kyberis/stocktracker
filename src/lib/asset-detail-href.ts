import type { Holding } from "@/lib/types";
import {
  CRYPTO_PAGE_SUPPORTED_SYMBOLS,
  yahooCryptoSymbolToBase,
} from "@/lib/crypto-page-symbols";

const CRYPTO_QUOTE_SUFFIX = /-(USD|EUR|GBP|USDT|USDC)$/i;
const CRYPTO_EXCHANGES = new Set(["CRYPTO", "CCC", "CRY"]);

/**
 * Normalize Yahoo/holding crypto tickers ("BTC-USD", "BTC USD", "btc") to a
 * base symbol suitable for `/crypto?symbol=`.
 */
export function cryptoBaseFromTicker(ticker: string): string {
  const normalized = ticker.trim().toUpperCase().replace(/\s+/g, "-");
  return yahooCryptoSymbolToBase(normalized);
}

/** Href for the in-app crypto market page, or null if the base is unsupported. */
export function cryptoMarketHref(tickerOrBase: string): string | null {
  const base = cryptoBaseFromTicker(tickerOrBase);
  if (!CRYPTO_PAGE_SUPPORTED_SYMBOLS.has(base)) return null;
  return `/crypto?symbol=${encodeURIComponent(base)}`;
}

/**
 * True when a ticker/exchange pair should use the crypto page instead of
 * company analysis (`/analisis`).
 */
export function isCryptoAssetRoute(
  ticker: string,
  exchange?: string | null,
): boolean {
  const normalized = ticker.trim().toUpperCase().replace(/\s+/g, "-");
  const base = yahooCryptoSymbolToBase(normalized);
  if (!CRYPTO_PAGE_SUPPORTED_SYMBOLS.has(base)) return false;

  const ex = (exchange || "").trim().toUpperCase();
  if (CRYPTO_EXCHANGES.has(ex)) return true;
  if (CRYPTO_QUOTE_SUFFIX.test(normalized)) return true;
  // Bare supported base (e.g. BTC) with no equity exchange suffix.
  if (base === normalized && !normalized.includes(".")) return true;
  return false;
}

/** Detail page for a portfolio holding: crypto → `/crypto`, else `/analisis`. */
export function holdingDetailHref(h: Holding): string {
  if (h.assetType === "crypto" || isCryptoAssetRoute(h.ticker, h.exchange)) {
    return cryptoMarketHref(h.ticker) ?? "/crypto";
  }
  const q = new URLSearchParams();
  if (h.exchange) q.set("exchange", h.exchange);
  const qs = q.toString();
  return `/analisis/${encodeURIComponent(h.ticker)}${qs ? `?${qs}` : ""}`;
}

/**
 * If `/analisis/[ticker]` was opened for a crypto symbol, return the crypto
 * page href to redirect to; otherwise null.
 */
export function analisisCryptoRedirectHref(
  ticker: string,
  exchange?: string | null,
): string | null {
  if (!isCryptoAssetRoute(ticker, exchange)) return null;
  return cryptoMarketHref(ticker);
}
