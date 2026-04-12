/**
 * Base symbols supported by the in-app crypto market page (`/crypto`) and `/api/crypto`.
 * Keep in sync with validation in `src/app/api/crypto/route.ts`.
 */
export const CRYPTO_PAGE_SUPPORTED_SYMBOLS = new Set([
  "BTC",
  "ETH",
  "SOL",
  "ADA",
  "XRP",
  "DOT",
  "AVAX",
  "LINK",
  "BNB",
  "DOGE",
  "MATIC",
  "SHIB",
]);

/** Map a Yahoo-style pair (e.g. BTC-USD) to base symbol. */
export function yahooCryptoSymbolToBase(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  const i = upper.indexOf("-");
  if (i > 0) return upper.slice(0, i);
  return upper;
}
