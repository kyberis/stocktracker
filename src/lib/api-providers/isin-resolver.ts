import { YahooProvider } from "./yahoo";

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

const isinCache = new Map<string, string>();

export function looksLikeIsin(symbol: string): boolean {
  return ISIN_PATTERN.test(symbol);
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
    if (results.length > 0) {
      const resolved = results[0].symbol;
      isinCache.set(symbol, resolved);
      return resolved;
    }
  } catch {
    // fall through — return the original symbol
  }
  return symbol;
}
