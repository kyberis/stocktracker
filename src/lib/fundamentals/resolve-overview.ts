import { DE_FALLBACK_SUFFIXES } from "@/lib/api-providers/market-data-helpers";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import type { CompanyOverview, StockDataProvider } from "@/lib/api-providers/types";
import {
  hasValuationMetrics,
  mergeOverviews,
  overviewQualityScore,
} from "@/lib/fundamentals/overview-quality";
import {
  resolveFundamentalsProvider,
  type FundamentalsDataBackend,
} from "@/lib/market-data/resolve-provider";
import { normalizeHkYahooSymbol, yahooSymbolAliases } from "@/lib/market-symbol";

async function settledOverview(
  provider: StockDataProvider,
  symbol: string,
): Promise<CompanyOverview | null> {
  try {
    return (await provider.getOverview?.(symbol)) ?? null;
  } catch {
    return null;
  }
}

/** Symbols to try when the portfolio ticker is thin on Yahoo/FMP (cross-listings, venues). */
export function overviewSymbolCandidates(requestedSymbol: string): string[] {
  const primary = normalizeHkYahooSymbol(requestedSymbol.trim().toUpperCase());
  const out: string[] = [primary];

  if (primary.endsWith(".DE")) {
    const base = primary.slice(0, -3);
    for (const suffix of DE_FALLBACK_SUFFIXES) {
      out.push(`${base}${suffix}`);
    }
  }

  for (const key of new Set([primary, requestedSymbol.trim().toUpperCase()])) {
    for (const alias of yahooSymbolAliases(key)) {
      out.push(normalizeHkYahooSymbol(alias));
    }
  }

  return [...new Set(out.filter(Boolean))];
}

function withRequestedSymbol(
  requestedSymbol: string,
  overview: CompanyOverview,
): CompanyOverview {
  return { ...overview, symbol: requestedSymbol };
}

async function fetchBestOverviewForProvider(
  provider: StockDataProvider,
  requestedSymbol: string,
  candidates: string[],
): Promise<CompanyOverview | null> {
  let best: CompanyOverview | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const overview = await settledOverview(provider, candidate);
    if (!overview) continue;
    const scored = overviewQualityScore(overview);
    if (scored > bestScore) {
      best = overview;
      bestScore = scored;
    }
    if (hasValuationMetrics(overview) && scored >= 6) break;
  }

  return best ? withRequestedSymbol(requestedSymbol, best) : null;
}

export interface ResolvedOverviewResult {
  data: CompanyOverview;
  backend: FundamentalsDataBackend;
}

/**
 * Resolve overview for a portfolio ticker: alias fallbacks, alternate venues,
 * and FMP enrichment when Yahoo (or primary) returns sparse multiples.
 */
export async function fetchResolvedOverview(
  userId: string,
  requestedSymbol: string,
  primary: { provider: StockDataProvider; backend: FundamentalsDataBackend },
): Promise<ResolvedOverviewResult | null> {
  const candidates = overviewSymbolCandidates(requestedSymbol);

  let best = await fetchBestOverviewForProvider(primary.provider, requestedSymbol, candidates);
  let backend = primary.backend;

  if (!hasValuationMetrics(best)) {
    const alt =
      primary.backend === "fmp"
        ? { provider: new YahooProvider(), backend: "yahoo" as const }
        : await resolveFundamentalsProvider(userId);

    if (alt.backend !== primary.backend) {
      const altBest = await fetchBestOverviewForProvider(
        alt.provider,
        requestedSymbol,
        candidates,
      );
      if (altBest) {
        best = best ? mergeOverviews(best, altBest) : altBest;
        backend = alt.backend;
      }
    }
  }

  if (!best) return null;
  return { data: best, backend };
}
