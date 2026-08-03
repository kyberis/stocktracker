import { YahooProvider } from "@/lib/api-providers/yahoo";
import { DE_FALLBACK_SUFFIXES, PA_FALLBACK_SUFFIXES } from "@/lib/api-providers/market-data-helpers";
import { resolveIsinToTicker } from "@/lib/api-providers/isin-resolver";
import { normalizeHkYahooSymbol, yahooSymbolAliases } from "@/lib/market-symbol";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";

async function tryAliasSymbols(
  yahoo: YahooProvider,
  symbol: string,
): Promise<{ quote: ProviderQuoteResult; usedSymbol: string } | null> {
  for (const alt of yahooSymbolAliases(symbol)) {
    try {
      const q = await yahoo.getQuote(alt);
      if (q.regularMarketPrice > 0) {
        return { quote: q, usedSymbol: alt };
      }
    } catch {
      // try next
    }
  }
  return null;
}

async function tryExchangeFallback(
  yahoo: YahooProvider,
  symbol: string,
): Promise<{ quote: ProviderQuoteResult; usedSymbol: string } | null> {
  const upper = symbol.toUpperCase();
  let suffixes: string[] | null = null;
  let baseLen = 0;

  if (upper.endsWith(".DE")) {
    suffixes = DE_FALLBACK_SUFFIXES;
    baseLen = 3;
  } else if (upper.endsWith(".PA")) {
    suffixes = PA_FALLBACK_SUFFIXES;
    baseLen = 3;
  }

  if (!suffixes) return null;

  const base = symbol.slice(0, -baseLen);
  for (const suffix of suffixes) {
    try {
      const q = await yahoo.getQuote(`${base}${suffix}`);
      if (q.regularMarketPrice > 0) {
        return { quote: q, usedSymbol: `${base}${suffix}` };
      }
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Fetch a Yahoo quote with the same resolution path as `/api/quote`:
 * ISIN resolve → HK pad → primary → DE/PA exchange fallbacks → symbol aliases.
 * Returns the quote keyed to `requestedSymbol` for cache/lookup consistency.
 */
export async function resolveYahooQuote(
  yahoo: YahooProvider,
  requestedSymbol: string,
): Promise<ProviderQuoteResult | null> {
  const resolved = await resolveIsinToTicker(yahoo, requestedSymbol);
  const ticker = normalizeHkYahooSymbol(
    resolved.includes(" ") ? resolved.replace(/\s+/g, "-") : resolved,
  );

  const tryPrimary = async (sym: string): Promise<ProviderQuoteResult | null> => {
    try {
      const quote = await yahoo.getQuote(sym);
      if (quote.regularMarketPrice > 0) {
        return { ...quote, symbol: requestedSymbol };
      }
    } catch {
      // fall through
    }
    return null;
  };

  const primary = await tryPrimary(ticker);
  if (primary) return primary;

  // Bare numeric HK tickers (news path strips `.HK` → `215`)
  if (/^\d{1,5}$/.test(ticker.trim())) {
    const hk = `${ticker.trim().padStart(4, "0")}.HK`;
    const hkHit = await tryPrimary(hk);
    if (hkHit) return hkHit;
  }

  const fb = await tryExchangeFallback(yahoo, ticker);
  if (fb) return { ...fb.quote, symbol: requestedSymbol };

  for (const key of new Set([ticker, requestedSymbol])) {
    const aliasHit = await tryAliasSymbols(yahoo, key);
    if (aliasHit) return { ...aliasHit.quote, symbol: requestedSymbol };
  }

  return null;
}
