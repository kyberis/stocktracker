import {
  getRecommendationCache,
  getUserSettings,
  listCashEntries,
  listHoldings,
  listRecommendationStates,
  upsertRecommendationCache,
} from "@/lib/db";
import { currentRecommendationWeekKey } from "@/lib/db/portfolio-recommendations";
import {
  buildPortfolioRecommendations,
  filterRecommendationQueue,
  type PortfolioRecommendation,
} from "@/lib/homepage/build-portfolio-recommendations";
import { buildNeededFxPairs } from "@/lib/fx-pairs";
import { getQuotesWithCache, getRatesWithCache } from "@/lib/quote-cache";
import type { CashEntry, ExchangeRates, Holding, QuoteData } from "@/lib/types";

export type RecommendationQueueResult = {
  current: PortfolioRecommendation | null;
  remaining: number;
  total: number;
  /** Tips before skip/acted filter */
  rawTotal: number;
  queue: PortfolioRecommendation[];
  source: "cache" | "live";
  weekKey: string;
};

async function loadRatesForHoldings(
  holdings: { displayCurrency: string }[],
  quotes: Record<string, { currency?: string }>,
): Promise<ExchangeRates> {
  const currencies = new Set<string>();
  for (const h of holdings) {
    if (h.displayCurrency) currencies.add(h.displayCurrency);
  }
  for (const q of Object.values(quotes)) {
    if (q.currency) currencies.add(q.currency);
  }
  const pairs = buildNeededFxPairs(currencies);
  return getRatesWithCache(pairs);
}

export async function computeLiveRecommendationQueue(args: {
  userId: string;
  portfolioId?: string;
  holdings?: Holding[];
  cashEntries?: CashEntry[];
  quotes?: Record<string, QuoteData>;
  exchangeRates?: ExchangeRates;
}): Promise<PortfolioRecommendation[]> {
  const portfolioId = args.portfolioId || undefined;
  const [holdings, cashEntries, settings] = await Promise.all([
    args.holdings
      ? Promise.resolve(args.holdings)
      : listHoldings(args.userId, portfolioId),
    args.cashEntries
      ? Promise.resolve(args.cashEntries)
      : listCashEntries(args.userId, portfolioId),
    getUserSettings(args.userId),
  ]);
  if (holdings.length === 0) return [];

  const tickers = [...new Set(holdings.map((h) => h.ticker))];
  const quotes =
    args.quotes ??
    (tickers.length > 0 ? await getQuotesWithCache(tickers) : {});
  const exchangeRates =
    args.exchangeRates ?? (await loadRatesForHoldings(holdings, quotes));

  return buildPortfolioRecommendations({
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    preferredCurrency: settings.defaultCurrency || "EUR",
  });
}

/**
 * Prefer this week's cron cache; fall back to live compute.
 * Filters skipped/acted keys either way.
 */
export async function resolveRecommendationQueue(args: {
  userId: string;
  portfolioId?: string;
  /** Force live recompute and overwrite this week's cache (manual CTA / cron). */
  forceRefresh?: boolean;
  /** When forceRefresh from user CTA, stamp last_manual_at for weekly cooldown. */
  markManual?: boolean;
  /**
   * Skip live compute on cache miss. Prefer passing prefetched quotes instead
   * so Home can fill the weekly cache without a second Yahoo pass.
   */
  cacheOnly?: boolean;
  holdings?: Holding[];
  cashEntries?: CashEntry[];
  quotes?: Record<string, QuoteData>;
  exchangeRates?: ExchangeRates;
}): Promise<RecommendationQueueResult> {
  const weekKey = currentRecommendationWeekKey();
  const portfolioKey = args.portfolioId || "";
  const states = await listRecommendationStates(args.userId);
  const dismissed = new Set(states.map((s) => s.recommendationKey));

  if (!args.forceRefresh) {
    const cached = await getRecommendationCache(args.userId, portfolioKey);
    // Prefer non-empty weekly cache. Empty cache may be stale after rule changes —
    // recompute live without burning the manual cooldown.
    if (
      cached &&
      cached.weekKey === weekKey &&
      Array.isArray(cached.queue) &&
      cached.queue.length > 0
    ) {
      const active = filterRecommendationQueue(cached.queue, dismissed);
      const current = active[0] ?? null;
      return {
        current,
        remaining: Math.max(0, active.length - (current ? 1 : 0)),
        total: active.length,
        rawTotal: cached.queue.length,
        queue: active,
        source: "cache",
        weekKey,
      };
    }
  }

  if (args.cacheOnly) {
    return {
      current: null,
      remaining: 0,
      total: 0,
      rawTotal: 0,
      queue: [],
      source: "cache",
      weekKey,
    };
  }

  const queue = await computeLiveRecommendationQueue(args);
  await upsertRecommendationCache(args.userId, portfolioKey, weekKey, queue, {
    markManual: !!args.forceRefresh && !!args.markManual,
  });

  const active = filterRecommendationQueue(queue, dismissed);
  const current = active[0] ?? null;
  return {
    current,
    remaining: Math.max(0, active.length - (current ? 1 : 0)),
    total: active.length,
    rawTotal: queue.length,
    queue: active,
    source: "live",
    weekKey,
  };
}
