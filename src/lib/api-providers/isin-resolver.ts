import { looksLikeIsin } from "@/lib/isin";
import { YahooProvider } from "./yahoo";

export { looksLikeIsin };

const isinCache = new Map<string, string>();

export const EUROPEAN_YAHOO_SUFFIX = /\.(DE|SG|F|AS|PA|MI|SW|L|CO|HE|ST|OL|VI|BR|LS)$/i;

function isIsinPrefixedSymbol(symbol: string, isin: string): boolean {
  const s = symbol.trim().toUpperCase();
  const i = isin.trim().toUpperCase();
  return s === i || s.startsWith(`${i}.`);
}

/**
 * Pick a Yahoo listing for an ISIN.
 * Prefer a real equity/ETF ticker (European suffix over bare US) and never
 * return `ISIN` / `ISIN.VENUE` — those are not reliable quote symbols and must
 * not be persisted as holdings tickers.
 */
export function pickYahooSymbolForIsin(
  isin: string,
  results: { symbol: string }[],
): string | null {
  if (results.length === 0) return null;
  const upper = isin.trim().toUpperCase();
  const usable = results.filter((r) => r.symbol && !isIsinPrefixedSymbol(r.symbol, upper));
  if (usable.length === 0) return null;
  const european = usable.find((r) => EUROPEAN_YAHOO_SUFFIX.test(r.symbol));
  if (european) return european.symbol;
  return usable[0].symbol;
}

/**
 * Resolve an ISIN to a Yahoo ticker symbol via search.
 * Returns the resolved ticker, or the original symbol if resolution fails.
 * Results are cached in-memory for the lifetime of the process.
 */
export async function resolveIsinToTicker(
  yahoo: YahooProvider,
  symbol: string,
): Promise<string> {
  if (!looksLikeIsin(symbol)) return symbol;

  const cached = isinCache.get(symbol);
  if (cached) return cached;

  try {
    const results = await yahoo.search(symbol);
    const resolved = pickYahooSymbolForIsin(symbol, results);
    if (resolved) {
      isinCache.set(symbol, resolved);
      return resolved;
    }
  } catch {
    // fall through — return the original symbol
  }
  return symbol;
}
