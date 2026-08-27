import { listCashEntries, listHoldings, getUserSettings, getSnapTradeMarkReconciliation } from "@/lib/db";
import { fetchProviderQuotesForHoldingsWithStats } from "@/lib/holding-quotes";
import { buildAidStatus } from "@/lib/aid/build-status";
import {
  buildDayHighlightsPayload,
  type DayHighlightsPayload,
} from "@/lib/homepage/build-day-highlights";
import {
  resolveRecommendationQueue,
  type RecommendationQueueResult,
} from "@/lib/homepage/resolve-recommendation-queue";
import { providerQuotesToQuoteMap } from "@/lib/aid/quotes-map";
import { buildNeededFxPairs } from "@/lib/fx-pairs";
import { getRatesWithCache, type QuoteCacheStats } from "@/lib/quote-cache";
import type { AidStatusPayload, CashEntry, ExchangeRates, Holding, QuoteData } from "@/lib/types";
import type { PortfolioRecommendation } from "@/lib/homepage/build-portfolio-recommendations";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";
import type { MarkReconciliation } from "@/lib/snaptrade-mark-reconciliation";
import { parseStoredMarkReconciliation } from "@/lib/snaptrade-mark-reconciliation";
import {
  resolveAnalystTargetsForHoldings,
  type ResolveAnalystTargetsResult,
} from "@/lib/fundamentals/analyst-targets";
import type { AnalystTargetSnapshot } from "@/lib/types";

export type HomeBootstrapCorePayload = {
  holdings: Holding[];
  cashEntries: CashEntry[];
  quotes: Record<string, QuoteData>;
  exchangeRates: ExchangeRates;
  quoteStats: QuoteCacheStats;
  holdingsCount: number;
  asOf: string;
};

export type HomeBootstrapSectionsPayload = {
  dayHighlights: DayHighlightsPayload;
  aidStatus: AidStatusPayload;
  recommendation: {
    current: PortfolioRecommendation | null;
    remaining: number;
    total: number;
    rawTotal: number;
    source: RecommendationQueueResult["source"];
  } | null;
  markGap: MarkReconciliation | null;
  analystTargets: Record<string, AnalystTargetSnapshot>;
  analystTargetsPartial: boolean;
};

export type HomeBootstrapPayload = HomeBootstrapCorePayload & HomeBootstrapSectionsPayload;

type BootstrapBook = {
  holdings: Holding[];
  cashEntries: CashEntry[];
  settings: Awaited<ReturnType<typeof getUserSettings>>;
};

async function loadBootstrapBook(args: {
  userId: string;
  portfolioId?: string;
}): Promise<BootstrapBook> {
  const [holdings, settings, cashEntries] = await Promise.all([
    listHoldings(args.userId, args.portfolioId),
    getUserSettings(args.userId),
    listCashEntries(args.userId, args.portfolioId),
  ]);
  return { holdings, cashEntries, settings };
}

function buildFxRates(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  preferredCurrency: string,
): Promise<ExchangeRates> {
  const currencies = new Set<string>([preferredCurrency || "EUR"]);
  for (const h of holdings) {
    if (h.displayCurrency) currencies.add(h.displayCurrency);
  }
  for (const q of Object.values(quotes)) {
    if (q.currency) currencies.add(q.currency);
  }
  return getRatesWithCache(buildNeededFxPairs(currencies));
}

/**
 * Fast path: holdings + cash + one quote map + FX. Unblocks Home first paint.
 */
export async function buildHomeBootstrapCore(args: {
  userId: string;
  portfolioId?: string;
}): Promise<HomeBootstrapCorePayload> {
  const { holdings, cashEntries, settings } = await loadBootstrapBook(args);

  const { quotes: providerQuotes, stats: quoteStats } =
    await fetchProviderQuotesForHoldingsWithStats(holdings);
  const quotes = providerQuotesToQuoteMap(providerQuotes);
  const exchangeRates = await buildFxRates(
    holdings,
    quotes,
    settings.defaultCurrency || "EUR",
  );

  return {
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    quoteStats,
    holdingsCount: holdings.length,
    asOf: new Date().toISOString(),
  };
}

/**
 * Below-the-fold sections. Run after core so quote Redis is warm.
 * Recommendations stay cache-only on cold load (live via manual CTA).
 */
export async function buildHomeBootstrapSections(args: {
  userId: string;
  portfolioId?: string;
}): Promise<HomeBootstrapSectionsPayload> {
  const { holdings, cashEntries, settings } = await loadBootstrapBook(args);

  const { quotes: providerQuotes } = await fetchProviderQuotesForHoldingsWithStats(holdings);
  const quotes = providerQuotesToQuoteMap(providerQuotes);
  const exchangeRates = await buildFxRates(
    holdings,
    quotes,
    settings.defaultCurrency || "EUR",
  );

  const [dayHighlights, aidStatus, recommendation, markGap, analystTargetResult] = await Promise.all([
    buildDayHighlightsPayload({
      userId: args.userId,
      portfolioId: args.portfolioId,
      holdings,
      providerQuotes: providerQuotes as Record<string, ProviderQuoteResult>,
    }),
    buildAidStatus({
      userId: args.userId,
      portfolioId: args.portfolioId,
      language: settings.language || "en",
      quotes,
      holdings,
      includeBriefing: false,
    }),
    resolveRecommendationQueue({
      userId: args.userId,
      portfolioId: args.portfolioId,
      holdings,
      cashEntries,
      quotes,
      exchangeRates,
      cacheOnly: true,
    })
      .then((r) => ({
        current: r.current,
        remaining: r.remaining,
        total: r.total,
        rawTotal: r.rawTotal,
        source: r.source,
      }))
      .catch(() => null),
    getSnapTradeMarkReconciliation(args.userId)
      .then((row) => parseStoredMarkReconciliation(row?.json ?? ""))
      .catch(() => null),
    resolveAnalystTargetsForHoldings(args.userId, holdings).catch(
      (): ResolveAnalystTargetsResult => ({ targets: {}, partial: false }),
    ),
  ]);

  return {
    dayHighlights,
    aidStatus,
    recommendation,
    markGap,
    analystTargets: analystTargetResult.targets,
    analystTargetsPartial: analystTargetResult.partial,
  };
}

/**
 * Full bootstrap (tests + callers that want one round trip).
 */
export async function buildHomeBootstrap(args: {
  userId: string;
  portfolioId?: string;
}): Promise<HomeBootstrapPayload> {
  const core = await buildHomeBootstrapCore(args);
  const sections = await buildHomeBootstrapSections(args);
  return { ...core, ...sections };
}
