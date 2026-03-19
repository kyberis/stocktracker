import { ensureInitialized } from "@/lib/db/client";
import {
  listDistinctHoldingTickers,
  listDistinctHoldingTickersForUser,
  listUserIdsWithHoldings,
  listHoldings,
  listCashEntries,
  listDistinctPortfolioIdsForUser,
} from "@/lib/db";
import type { DistinctHoldingTicker } from "@/lib/db/holdings";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { generateId } from "@/lib/utils";
import type { ExchangeRates, QuoteData } from "@/lib/types";

const QUOTE_BATCH_SIZE = 15;

const FX_PAIRS = [
  "EURUSD", "EURGBP", "EURDKK", "EURCAD", "EURCHF",
  "EURSEK", "EURNOK", "EURAUD", "EURNZD", "EURJPY",
  "EURPLN", "EURCZK", "EURHUF", "EURRON", "EURSGD",
  "EURHKD", "EURZAR", "EURTRY", "EURBRL", "EURMXN",
];

/** Same 15-minute UTC bucket as POST /api/portfolio/snapshot */
export function snapshotDateBucketUtc(): string {
  const floored = new Date();
  floored.setUTCMinutes(Math.floor(floored.getUTCMinutes() / 15) * 15, 0, 0);
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
  };
}

async function upsertPortfolioSnapshotRow(
  userId: string,
  portfolioId: string,
  dateBucket: string,
  totalValueEUR: number,
  totalInvestedEUR: number,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT INTO portfolio_snapshots (id, user_id, portfolio_id, date, total_value_eur, total_invested_eur)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, portfolio_id, date) DO UPDATE SET
            total_value_eur = excluded.total_value_eur,
            total_invested_eur = excluded.total_invested_eur`,
    args: [generateId(), userId, portfolioId, dateBucket, totalValueEUR, totalInvestedEUR],
  });
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

  const neededCurrencies = new Set(
    distinctTickers
      .map((h) => h.displayCurrency.toUpperCase())
      .filter((c) => c !== "EUR" && c !== "GBX"),
  );
  const neededPairs = FX_PAIRS.filter((pair) => {
    const to = pair.substring(3);
    return neededCurrencies.has(to);
  });
  if (distinctTickers.some((h) => h.displayCurrency === "GBX" || h.displayCurrency === "GBp")) {
    if (!neededPairs.includes("EURGBP")) neededPairs.push("EURGBP");
  }

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

  let errorCount = 0;
  const failedTickers = new Set<string>();

  for (let i = 0; i < uniqueTickers.length; i += QUOTE_BATCH_SIZE) {
    const batch = uniqueTickers.slice(i, i + QUOTE_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (ticker) => {
        const q = await yahoo.getQuote(ticker);
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

  return { quotes, exchangeRates, quoteErrors: errorCount };
}

/** Aggregate + per-portfolio rows for one user at the given UTC bucket (live quotes). */
async function writeLiveSnapshotsForUser(
  userId: string,
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  dateBucket: string,
): Promise<number> {
  let snapshots = 0;
  const holdingsAll = await listHoldings(userId);
  if (holdingsAll.length === 0) return 0;

  const cashAll = await listCashEntries(userId);
  const totalsAll = calculatePortfolioTotals(holdingsAll, cashAll, quotes, exchangeRates, "EUR");
  if (totalsAll.totalCurrentEUR > 0) {
    await upsertPortfolioSnapshotRow(userId, "", dateBucket, totalsAll.totalCurrentEUR, totalsAll.totalCostEUR);
    snapshots++;
  }

  const portfolioIds = await listDistinctPortfolioIdsForUser(userId);
  for (const pid of portfolioIds) {
    const h = await listHoldings(userId, pid);
    const c = await listCashEntries(userId, pid);
    if (h.length === 0 && c.length === 0) continue;
    const t = calculatePortfolioTotals(h, c, quotes, exchangeRates, "EUR");
    if (t.totalCurrentEUR <= 0) continue;
    await upsertPortfolioSnapshotRow(userId, pid, dateBucket, t.totalCurrentEUR, t.totalCostEUR);
    snapshots++;
  }
  return snapshots;
}

/**
 * Writes one 15-minute “dashboard open” snapshot for a single user (after import or backfill).
 * Fetches Yahoo quotes only for that user’s tickers.
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
