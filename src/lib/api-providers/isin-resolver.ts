import { looksLikeIsin } from "@/lib/isin";
import { YahooProvider } from "./yahoo";

export { looksLikeIsin };

const isinCache = new Map<string, string>();

const EUROPEAN_YAHOO_SUFFIX = /\.(DE|SG|F|AS|PA|MI|SW|L|CO|HE|ST|OL|VI|BR|LS)$/i;

/**
 * Pick a Yahoo listing for an ISIN. Prefer a symbol that *is* the ISIN plus a
 * venue suffix (e.g. GB00BLD4ZL17.SG) so we don't land on a same-ticker US ETF.
 */
export function pickYahooSymbolForIsin(
  isin: string,
  results: { symbol: string }[],
): string | null {
  if (results.length === 0) return null;
  const upper = isin.trim().toUpperCase();
  const exact = results.find((r) => r.symbol.toUpperCase().startsWith(`${upper}.`));
  if (exact) return exact.symbol;
  const european = results.find((r) => EUROPEAN_YAHOO_SUFFIX.test(r.symbol));
  if (european) return european.symbol;
  return results[0].symbol;
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
