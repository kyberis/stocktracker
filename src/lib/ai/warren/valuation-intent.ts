import { listHoldings as dbListHoldings } from "@/lib/db";
import { analyzeValuationForWarren } from "@/lib/services/warren-valuation";
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

export async function buildValuationPrefetchAppendix(
  message: string,
  opts: { userId: string; portfolioId?: string; snapshot?: PortfolioSnapshot },
): Promise<string | null> {
  if (!wantsValuationIntent(message)) return null;

  const symbols = await resolveValuationSymbols(opts);
  if (symbols.length === 0) {
    return [
      "TASK OVERRIDE — Valuation request detected:",
      'User asked whether stocks look expensive/cheap. Call `analyzeValuation` with `scope: "portfolio"` or explicit tickers.',
      "Do NOT call `screenMoatStocks` — that searches the global moat database for new ideas, not the user's holdings.",
    ].join("\n");
  }

  try {
    const result = await analyzeValuationForWarren(opts.userId, symbols);
    if (!result.ok) {
      return [
        "TASK OVERRIDE — Valuation request detected:",
        `Prefetch could not load fundamentals: ${result.error}`,
        'Try `analyzeValuation` with `scope: "portfolio"` or name specific tickers. Do NOT call `screenMoatStocks`.',
      ].join("\n");
    }

    const lines = result.results.map(
      (r) =>
        `${r.symbol} (${r.companyName}): label=${r.valuationLabel}, P/E=${r.metrics.peRatio ?? "n/a"}, forward P/E=${r.metrics.forwardPE ?? "n/a"}, ROE=${r.metrics.returnOnEquity ?? "n/a"} — ${r.valuationSummary} [${r.provider}, ${r.fetchedAt}]`,
    );

    const errors =
      result.errors.length > 0
        ? `No data for: ${result.errors.map((e) => `${e.symbol} (${e.error})`).join("; ")}`
        : "";

    return [
      "TASK OVERRIDE — Portfolio valuation request detected:",
      "User asked which stocks look expensive/cheap. Use the prefetch below (or call `analyzeValuation` with the same tickers).",
      "Do NOT call `screenMoatStocks` — that is for discovering new moat-screener ideas, not valuing holdings the user already owns.",
      "Answer in prose: group expensive vs fair vs cheap; cite P/E and fetchedAt; do not invent ratios.",
      ...lines,
      errors,
    ]
      .filter(Boolean)
      .join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return [
      "TASK OVERRIDE — Valuation request detected:",
      `Prefetch failed unexpectedly: ${msg}`,
      'Call `analyzeValuation` with `scope: "portfolio"`. Do NOT call `screenMoatStocks`.',
    ].join("\n");
  }
}
