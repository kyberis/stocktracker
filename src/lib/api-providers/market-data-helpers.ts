import { YahooProvider } from "./yahoo";

export const DE_FALLBACK_SUFFIXES = [".F", ".DU", ".MU"];
export const PA_FALLBACK_SUFFIXES = [".AS", ".MI", ".SW"];

export function isRateLimitError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("rate limit");
}

const EXCHANGE_FALLBACKS: [string, string[]][] = [
  [".DE", DE_FALLBACK_SUFFIXES],
  [".PA", PA_FALLBACK_SUFFIXES],
];

/**
 * For exchange symbols that Yahoo may not cover (e.g. .DE, .PA), try alternate
 * exchange suffixes that often carry the same instrument.
 */
export async function tryExchangeFallback<T extends { regularMarketPrice?: number }>(
  yahoo: YahooProvider,
  symbol: string,
  fetcher: (yahoo: YahooProvider, sym: string) => Promise<T>
): Promise<{ data: T; usedSymbol: string } | null> {
  const upper = symbol.toUpperCase();
  const match = EXCHANGE_FALLBACKS.find(([suffix]) => upper.endsWith(suffix));
  if (!match) return null;

  const [suffix, fallbacks] = match;
  const base = symbol.slice(0, -suffix.length);
  for (const fb of fallbacks) {
    try {
      const data = await fetcher(yahoo, `${base}${fb}`);
      if (data.regularMarketPrice && data.regularMarketPrice > 0) {
        return { data, usedSymbol: `${base}${fb}` };
      }
    } catch {
      // try next suffix
    }
  }
  return null;
}
