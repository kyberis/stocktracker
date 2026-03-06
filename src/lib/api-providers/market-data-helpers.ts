import { YahooProvider } from "./yahoo";

export const DE_FALLBACK_SUFFIXES = [".F", ".DU", ".MU"];

export function isRateLimitError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("rate limit");
}

/**
 * For German exchange symbols ending in .DE, try alternate suffixes (.F, .DU, .MU)
 * which may have better data availability in Yahoo Finance.
 */
export async function tryGermanFallback<T extends { regularMarketPrice?: number }>(
  yahoo: YahooProvider,
  symbol: string,
  fetcher: (yahoo: YahooProvider, sym: string) => Promise<T>
): Promise<{ data: T; usedSymbol: string } | null> {
  if (!symbol.toUpperCase().endsWith(".DE")) return null;
  const base = symbol.slice(0, -3);
  for (const suffix of DE_FALLBACK_SUFFIXES) {
    try {
      const data = await fetcher(yahoo, `${base}${suffix}`);
      if (data.regularMarketPrice && data.regularMarketPrice > 0) {
        return { data, usedSymbol: `${base}${suffix}` };
      }
    } catch {
      // try next suffix
    }
  }
  return null;
}
