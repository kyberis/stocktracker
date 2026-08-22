import { listHoldings as dbListHoldings } from "@/lib/db";
import { filterWarrenValuationSymbols } from "@/lib/services/warren-valuation";
import type { PortfolioSnapshot } from "./tools";

/** User asks whether holdings look expensive/cheap — NOT moat screener stock ideas. */
const VALUATION_CUE =
  /(?:car[oa]s?|barat[oa]s?|expensive|cheap|fair|valoraci[oó]n|fundamental|infravalorad|sobrevalorad|m[uú]ltiplo|overvalued|undervalued|precio\s*justo)/i;

/** Post-valuation decision: sell / rank / least upside — still not a moat screener. */
const POST_VALUATION_DECISION =
  /(?:margen\s+de\s+subida|menor\s+margen|menos\s+margen|upside|decidir\s+cu[aá]l|(?:vender|sell).{0,40}(?:margen|primero|upside|cu[aá]l)|(?:cu[aá]l|which).{0,40}(?:vender|sell))/i;

const MOAT_SCREENER_CUE =
  /moat\s*screener|screener\s*moat|ideas.*(?:invert|inversi|stock|moat)|stock\s*ideas|wide\s*moat|buenas\s*ideas.*invert/i;

export function wantsPostValuationDecisionIntent(message: string): boolean {
  return POST_VALUATION_DECISION.test(message) && !MOAT_SCREENER_CUE.test(message);
}

export function wantsValuationIntent(message: string): boolean {
  if (MOAT_SCREENER_CUE.test(message)) return false;
  return VALUATION_CUE.test(message) || wantsPostValuationDecisionIntent(message);
}

async function resolveValuationSymbols(
  opts: { userId: string; portfolioId?: string; snapshot?: PortfolioSnapshot },
): Promise<string[]> {
  const assetTypes = new Map<string, string | undefined>();
  const symbols: string[] = [];

  const fromSnapshot =
    opts.snapshot?.topHoldings?.slice().sort((a, b) => b.weight - a.weight) ?? [];

  if (fromSnapshot.length > 0) {
    for (const h of fromSnapshot) {
      const sym = h.ticker.toUpperCase();
      assetTypes.set(sym, h.assetType);
      symbols.push(sym);
    }
  } else if (opts.portfolioId) {
    const holdings = await dbListHoldings(opts.userId, opts.portfolioId);
    for (const h of holdings) {
      const sym = h.ticker.toUpperCase();
      assetTypes.set(sym, h.assetType);
      symbols.push(sym);
    }
  }

  return filterWarrenValuationSymbols(symbols, assetTypes);
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

  const decision = wantsPostValuationDecisionIntent(message);
  const afterTool = decision
    ? "If this thread already has valuation numbers, do NOT re-call `analyzeValuation`. Rank by upsideToTargetPct (lowest = least upside) and explain the bottom names — do not regroup expensive / fair / cheap."
    : "After the tool returns, group holdings as expensive / fair / cheap; cite P/E, valuationLabel, currentPrice, upsideToTargetPct, fetchedAt, and provider. Do not invent ratios.";

  return [
    "TASK OVERRIDE — Portfolio valuation request detected:",
    tickerLine,
    'Call `analyzeValuation` ONCE with `scope: "portfolio"` (or the tickers above) unless valuation numbers are already in this thread.',
    "Do NOT call `screenMoatStocks` — that searches the global moat database for new ideas.",
    afterTool,
  ].join("\n");
}
