import { listHoldings as dbListHoldings } from "@/lib/db";
import type { PortfolioSnapshot } from "./tools";

/** User asks whether holdings look expensive/cheap — NOT moat screener stock ideas. */
export function wantsValuationIntent(message: string): boolean {
  const valuationCue =
    /(?:car[oa]s?|barat[oa]s?|expensive|cheap|fair|valoraci[oó]n|fundamental|infravalorad|sobrevalorad|m[uú]ltiplo|overvalued|undervalued|precio\s*justo)/i.test(
      message,
    );
  if (!valuationCue) return false;

  // Moat screener discovery prompts stay on screenMoatStocks.
  if (/moat\s*screener|screener\s*moat|ideas.*(?:invert|inversi|stock|moat)|stock\s*ideas|wide\s*moat|buenas\s*ideas.*invert/i.test(
    message,
  )) {
    return false;
  }

  return true;
}

async function resolveValuationSymbols(
  opts: { userId: string; portfolioId?: string; snapshot?: PortfolioSnapshot },
  max = 8,
): Promise<string[]> {
  const fromSnapshot =
    opts.snapshot?.topHoldings
      ?.slice()
      .sort((a, b) => b.weight - a.weight)
      .slice(0, max)
      .map((h) => h.ticker.toUpperCase()) ?? [];

  if (fromSnapshot.length > 0) return fromSnapshot;

  if (!opts.portfolioId) return [];
  const holdings = await dbListHoldings(opts.userId, opts.portfolioId);
  return holdings.slice(0, max).map((h) => h.ticker.toUpperCase());
}

/**
 * Lightweight intent appendix — no market-data fetch here (that blocks the stream
 * and duplicated the analyzeValuation tool). The tool fetches overview-only data.
 */
export async function buildValuationPrefetchAppendix(
  message: string,
  opts: { userId: string; portfolioId?: string; snapshot?: PortfolioSnapshot },
): Promise<string | null> {
  if (!wantsValuationIntent(message)) return null;

  const symbols = await resolveValuationSymbols(opts);
  const tickerLine =
    symbols.length > 0
      ? `Holdings to value: ${symbols.join(", ")}.`
      : "Use the active portfolio holdings.";

  return [
    "TASK OVERRIDE — Portfolio valuation request detected:",
    tickerLine,
    'Call `analyzeValuation` ONCE with `scope: "portfolio"` (or the tickers above).',
    "Do NOT call `screenMoatStocks` — that searches the global moat database for new ideas.",
    "After the tool returns, group holdings as expensive / fair / cheap; cite P/E, valuationLabel, fetchedAt, and provider. Do not invent ratios.",
  ].join("\n");
}
