import { ensureInitialized } from "@/lib/db/client";
import {
  listDistinctHoldingTickers,
  listDistinctHoldingTickersForUser,
  listUserIdsWithHoldings,
  listHoldings,
  listDistinctPortfolioIdsForUser,
} from "@/lib/db";
import type { DistinctHoldingTicker } from "@/lib/db/holdings";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { computeValueByAssetType } from "@/lib/portfolio-summary";
import { generateId } from "@/lib/utils";
import { isAnyMarketActive } from "@/lib/market-hours";
import type { CashEntry, ExchangeRates, Holding, QuoteData } from "@/lib/types";
import { buildNeededFxPairs } from "@/lib/fx-pairs";

const QUOTE_BATCH_SIZE = 15;

/** 5-minute UTC bucket aligned with POST /api/portfolio/snapshot */
export function snapshotDateBucketUtc(): string {
  const floored = new Date();
  floored.setUTCMinutes(Math.floor(floored.getUTCMinutes() / 5) * 5, 0, 0);
  return floored.toISOString().slice(0, 16).replace("T", " ") + ":00";
}

function toQuoteData(q: ProviderQuoteResult): QuoteData {
  return {
    symbol: q.symbol,
    shortName: q.shortName,
    regularMarketPrice: q.regularMarketPrice,
    regularMarketChange: q.regularMarketChange,
    regularMarketChangePercent: q.regularMarketChangePercent,
    currency: q.currency,
    regularMarketPreviousClose: q.regularMarketPreviousClose,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    marketCap: q.marketCap,
    trailingAnnualDividendRate: q.trailingAnnualDividendRate,
    trailingAnnualDividendYield: q.trailingAnnualDividendYield,
    regularMarketTime: q.regularMarketTime,
  };
}

/**
 * Batch-fetch Yahoo quotes + FX (same strategy as refresh-holdings), return QuoteData map by ticker key.
 */
async function buildQuotesAndExchangeRates(distinctTickers: DistinctHoldingTicker[]): Promise<{
  quotes: Record<string, QuoteData>;
  exchangeRates: ExchangeRates;
  quoteErrors: number;
}> {
  const exchangeRates: ExchangeRates = {};
  const quotes: Record<string, QuoteData> = {};

  if (distinctTickers.length === 0) {
    return { quotes, exchangeRates, quoteErrors: 0 };
  }

  const yahoo = new YahooProvider();
  const uniqueTickers = [...new Set(distinctTickers.map((h) => h.ticker))];

  let errorCount = 0;

  for (let i = 0; i < uniqueTickers.length; i += QUOTE_BATCH_SIZE) {
    const batch = uniqueTickers.slice(i, i + QUOTE_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (ticker) => {
        const yahooTicker = ticker.includes(" ") ? ticker.replace(/\s+/g, "-") : ticker;
        const q = await yahoo.getQuote(yahooTicker);
        return { ticker, q };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.q.regularMarketPrice > 0) {
        const { ticker, q } = r.value;
        quotes[ticker] = toQuoteData(q);
      } else {
        errorCount++;
      }
    }
  }

  const neededPairs = buildNeededFxPairs([
    ...distinctTickers.map((h) => h.displayCurrency),
    ...Object.values(quotes).map((q) => q.currency),
  ]);
  const rateResults = await Promise.allSettled(
    neededPairs.map(async (pair) => {
      const from = pair.substring(0, 3);
      const to = pair.substring(3);
      const rate = await yahoo.getExchangeRate(from, to);
      return { pair, rate };
    }),
  );
  for (const r of rateResults) {
    if (r.status === "fulfilled" && r.value.rate > 0) {
      exchangeRates[r.value.pair] = r.value.rate;
    }
  }

  return { quotes, exchangeRates, quoteErrors: errorCount };
}

/**
 * Aggregate + per-portfolio rows for one user at the given UTC bucket (live quotes).
 *
 * Always uses the freshly-computed totalCostEUR as invested capital (no carry-forward).
 * This prevents stale invested values from propagating after moves, imports, or sells.
 * Historical accuracy comes from the backfill (daily rows); intraday rows from this
 * function use cost basis which is always current.
 */
async function writeLiveSnapshotsForUser(
  userId: string,
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  dateBucket: string,
): Promise<number> {
  const holdingsAll = await listHoldings(userId);
  if (holdingsAll.length === 0) return 0;
  if (!isAnyMarketActive(holdingsAll)) return 0;

  const hasQuote = (h: { ticker: string }) =>
    (quotes[h.ticker]?.regularMarketPrice ?? 0) > 0;

  interface SnapshotRow {
    portfolioId: string;
    value: number;
    invested: number;
    stockValue: number;
    etfValue: number;
    fundValue: number;
    cryptoValue: number;
  }
  const rows: SnapshotRow[] = [];

  function assetValues(h: Holding[]): { stockValue: number; etfValue: number; fundValue: number; cryptoValue: number } {
    const b = computeValueByAssetType(h, quotes, exchangeRates, "EUR");
    return { stockValue: b.stock, etfValue: b.etf, fundValue: b.fund, cryptoValue: b.crypto };
  }

  if (holdingsAll.every(hasQuote)) {
    const av = assetValues(holdingsAll);
    const holdingsValue = av.stockValue + av.etfValue + av.fundValue + av.cryptoValue;
    const emptyCash: CashEntry[] = [];
    const totalsAll = calculatePortfolioTotals(holdingsAll, emptyCash, quotes, exchangeRates, "EUR");
    if (holdingsValue > 0) {
      rows.push({
        portfolioId: "",
        value: holdingsValue,
        invested: totalsAll.totalCostEUR,
        ...av,
      });
    }
  }

  const portfolioIds = await listDistinctPortfolioIdsForUser(userId);
  for (const pid of portfolioIds) {
    const h = await listHoldings(userId, pid);
    if (h.length === 0) continue;
    if (!h.every(hasQuote)) continue;
    const av = assetValues(h);
    const holdingsValue = av.stockValue + av.etfValue + av.fundValue + av.cryptoValue;
    if (holdingsValue <= 0) continue;
    const emptyCash: CashEntry[] = [];
    const t = calculatePortfolioTotals(h, emptyCash, quotes, exchangeRates, "EUR");
    rows.push({
      portfolioId: pid,
      value: holdingsValue,
      invested: t.totalCostEUR,
      ...av,
    });
  }

  if (rows.length === 0) return 0;

  const client = await ensureInitialized();
  const fin = (n: number) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
  const stmts = rows.map((r) => ({
    sql: `INSERT INTO portfolio_snapshots (id, user_id, portfolio_id, date, total_value_eur, total_invested_eur, stock_value_eur, etf_value_eur, fund_value_eur, crypto_value_eur)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, portfolio_id, date) DO UPDATE SET
            total_value_eur = excluded.total_value_eur,
            total_invested_eur = excluded.total_invested_eur,
            stock_value_eur = excluded.stock_value_eur,
            etf_value_eur = excluded.etf_value_eur,
            fund_value_eur = excluded.fund_value_eur,
            crypto_value_eur = excluded.crypto_value_eur`,
    args: [
      generateId(),
      userId,
      r.portfolioId,
      dateBucket,
      fin(r.value),
      fin(r.invested),
      fin(r.stockValue),
      fin(r.etfValue),
      fin(r.fundValue),
      fin(r.cryptoValue),
    ],
  }));
  await client.batch(stmts, "write");

  return rows.length;
}

/**
 * Writes one 5-minute snapshot for a single user (after import, backfill, or move).
 * Uses forceRecalculateInvested so the invested line reflects the current portfolio
 * composition rather than carrying forward a stale value from before the operation.
 */
export async function materializeCurrentSnapshotsForUser(userId: string): Promise<{ snapshots: number }> {
  const distinctTickers = await listDistinctHoldingTickersForUser(userId);
  if (distinctTickers.length === 0) return { snapshots: 0 };
  const { quotes, exchangeRates } = await buildQuotesAndExchangeRates(distinctTickers);
  const dateBucket = snapshotDateBucketUtc();
  const snapshots = await writeLiveSnapshotsForUser(userId, quotes, exchangeRates, dateBucket);
  return { snapshots };
}

/**
 * Scheduled job: write portfolio_snapshots for all users with holdings (aggregate + per-portfolio),
 * using live Yahoo quotes so history charts populate even when clients are offline.
 */
export async function runPortfolioSnapshotsJob(): Promise<Record<string, unknown>> {
  const distinctTickers = await listDistinctHoldingTickers();
  const userIds = await listUserIdsWithHoldings();

  const maxUsersRaw = process.env.PORTFOLIO_SNAPSHOT_CRON_MAX_USERS;
  const maxUsers = maxUsersRaw ? Math.max(0, parseInt(maxUsersRaw, 10)) : 0;
  const cappedUserIds = maxUsers > 0 ? userIds.slice(0, maxUsers) : userIds;

  if (distinctTickers.length === 0 || cappedUserIds.length === 0) {
    return {
      users: 0,
      snapshots: 0,
      skippedNoHoldings: userIds.length === 0,
      quoteErrors: 0,
      userErrors: 0,
      capped: maxUsers > 0 && userIds.length > maxUsers,
    };
  }

  const { quotes, exchangeRates, quoteErrors } = await buildQuotesAndExchangeRates(distinctTickers);
  const dateBucket = snapshotDateBucketUtc();

  let snapshots = 0;
  let userErrors = 0;

  for (const userId of cappedUserIds) {
    try {
      snapshots += await writeLiveSnapshotsForUser(userId, quotes, exchangeRates, dateBucket);
    } catch (err) {
      userErrors++;
      console.warn(
        `[portfolio-snapshots] user ${userId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    users: cappedUserIds.length,
    snapshots,
    dateBucket,
    uniqueTickers: [...new Set(distinctTickers.map((d) => d.ticker))].length,
    quoteErrors,
    userErrors,
    capped: maxUsers > 0 && userIds.length > maxUsers,
    totalUsersInDb: userIds.length,
  };
}
