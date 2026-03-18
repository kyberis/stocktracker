import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ensureInitialized } from "@/lib/db/client";
import { str, num } from "@/lib/db/helpers";
import { generateId, normalizeCurrency } from "@/lib/utils";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { closeOnOrBeforeDate } from "@/lib/performance";
import { withMetrics } from "@/lib/with-metrics";
import type { HistoricalDataPoint, Transaction } from "@/lib/types";
import { holdingAssetType, txType } from "@/lib/db/helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TickerState {
  ticker: string;
  exchange: string;
  shares: number;
  displayCurrency: string;
}

function replayTransactionsUpToDate(
  sorted: Transaction[],
  date: string,
  holdingCurrencyMap: Map<string, string>,
): TickerState[] {
  const agg = new Map<string, TickerState>();

  for (const tx of sorted) {
    if (tx.date > date) break;
    const ticker = (tx.ticker || "").toUpperCase().trim();
    if (!ticker || ticker === "FEE" || ticker === "UNKNOWN") continue;

    const key = ticker;
    // Prefer the holdings table's displayCurrency (authoritative) over the
    // transaction's, which may say "GBP" for stocks actually priced in GBX.
    let authoritativeCurrency =
      holdingCurrencyMap.get(ticker) || tx.displayCurrency || tx.currency || "EUR";

    // Yahoo returns .L stock prices in GBX (pence) even when labelled "GBP".
    // For sold stocks no longer in holdings, infer GBX from .L suffix + GBP.
    if (ticker.endsWith(".L") && normalizeCurrency(authoritativeCurrency) === "GBP") {
      authoritativeCurrency = "GBX";
    }

    const current = agg.get(key) || {
      ticker,
      exchange: (tx.exchange || "").toUpperCase().trim(),
      shares: 0,
      displayCurrency: authoritativeCurrency,
    };

    if (tx.type === "buy" && tx.shares > 0) {
      current.shares += tx.shares;
    } else if (tx.type === "sell" && tx.shares > 0 && current.shares > 0) {
      current.shares = Math.max(0, current.shares - tx.shares);
    }

    current.displayCurrency = authoritativeCurrency;
    agg.set(key, current);
  }

  return [...agg.values()].filter((s) => s.shares > 0);
}

function generateDateList(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000);

  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(current.toISOString().slice(0, 10));
    }
    if (totalDays > 365 && dates.length > 0) {
      current.setDate(current.getDate() + 7);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  return dates;
}

/**
 * GET /api/portfolio/backfill-snapshots?check=true
 * Lightweight check: do we need to backfill?
 */
export const GET = withMetrics("/api/portfolio/backfill-snapshots", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const client = await ensureInitialized();

  const [txResult, snapResult, userResult] = await Promise.all([
    client.execute({
      sql: "SELECT MIN(date) as earliest FROM transactions WHERE user_id = ? AND type IN ('buy','sell')",
      args: [session.userId],
    }),
    client.execute({
      sql: "SELECT MIN(date) as earliest, COUNT(*) as cnt FROM portfolio_snapshots WHERE user_id = ?",
      args: [session.userId],
    }),
    client.execute({
      sql: "SELECT snapshots_backfilled_at FROM users WHERE id = ?",
      args: [session.userId],
    }),
  ]);

  const earliestTx = str(txResult.rows[0]?.earliest) || null;
  const earliestSnapshot = str(snapResult.rows[0]?.earliest) || null;
  const snapshotCount = num(snapResult.rows[0]?.cnt);
  const backfilledAt = str(userResult.rows[0]?.snapshots_backfilled_at) || null;

  if (!earliestTx) {
    return NextResponse.json({ needsBackfill: false, reason: "no_transactions" });
  }

  const txDate = new Date(earliestTx);
  const snapDate = earliestSnapshot ? new Date(earliestSnapshot) : null;
  const gapDays = snapDate
    ? Math.floor((snapDate.getTime() - txDate.getTime()) / 86400000)
    : Infinity;

  const needsBackfill = gapDays > 7 && (!backfilledAt || backfilledAt < earliestTx);

  return NextResponse.json({
    needsBackfill,
    earliestTx,
    earliestSnapshot,
    snapshotCount,
    backfilledAt,
  });
});

/**
 * POST /api/portfolio/backfill-snapshots
 * Reconstructs historical portfolio value from transactions + Yahoo price data.
 */
export const POST = withMetrics("/api/portfolio/backfill-snapshots", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const client = await ensureInitialized();

  const txResult = await client.execute({
    sql: `SELECT * FROM transactions WHERE user_id = ? AND type IN ('buy','sell')
          ORDER BY date ASC, created_at ASC`,
    args: [session.userId],
  });

  if (txResult.rows.length === 0) {
    return NextResponse.json({ snapshotsCreated: 0, message: "No transactions found" });
  }

  const transactions: Transaction[] = txResult.rows.map((r) => ({
    id: str(r.id),
    holdingId: str(r.holding_id),
    ticker: str(r.ticker),
    name: str(r.name),
    exchange: str(r.exchange),
    isin: str(r.isin),
    assetType: holdingAssetType(r.asset_type),
    accountId: str(r.account_id),
    type: txType(r.type),
    date: str(r.date),
    shares: num(r.shares),
    pricePerShare: num(r.price_per_share),
    totalAmount: num(r.total_amount),
    fees: num(r.fees),
    taxes: num(r.taxes),
    currency: str(r.currency),
    displayCurrency: str(r.display_currency),
    exchangeRateEur: num(r.exchange_rate_eur) || undefined,
    notes: str(r.notes),
    sourceRef: str(r.source_ref),
    brokerName: str(r.broker_name),
    createdAt: str(r.created_at),
  }));

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const earliestDate = sorted[0].date;
  const today = new Date().toISOString().slice(0, 10);

  // Use the holdings table as the authoritative source for displayCurrency.
  // Transactions may store "GBP" while the holding correctly says "GBX" for
  // London-listed stocks where Yahoo returns prices in pence.
  const holdingsResult = await client.execute({
    sql: "SELECT ticker, display_currency FROM holdings WHERE user_id = ?",
    args: [session.userId],
  });
  const holdingCurrencyMap = new Map<string, string>();
  for (const row of holdingsResult.rows) {
    const ticker = str(row.ticker).toUpperCase().trim();
    const dc = str(row.display_currency).toUpperCase().trim();
    if (ticker && dc) holdingCurrencyMap.set(ticker, dc);
  }

  const uniqueTickers = [...new Set(sorted.map((tx) => tx.ticker.toUpperCase().trim()).filter(Boolean))];
  const uniqueCurrencies = [...new Set(
    sorted
      .map((tx) => {
        const ticker = (tx.ticker || "").toUpperCase().trim();
        const holdingDC = holdingCurrencyMap.get(ticker);
        let c = normalizeCurrency(holdingDC || tx.displayCurrency || tx.currency || "");
        if (c === "GBX") c = "GBP";
        return c;
      })
      .filter((c) => c && c !== "EUR")
  )];

  const yahoo = new YahooProvider();

  const tickerSeries = new Map<string, HistoricalDataPoint[]>();
  for (const ticker of uniqueTickers) {
    try {
      // Fetch weekly data for last year (better resolution for recent charts)
      // and monthly data for everything (covers older history)
      const [recent, full] = await Promise.all([
        yahoo.getHistorical(ticker, "1y").catch(() => [] as HistoricalDataPoint[]),
        yahoo.getHistorical(ticker, "all").catch(() => [] as HistoricalDataPoint[]),
      ]);
      // Merge: recent (weekly) overrides full (monthly) for overlapping dates
      const byDate = new Map<string, HistoricalDataPoint>();
      for (const p of full) byDate.set(p.date, p);
      for (const p of recent) byDate.set(p.date, p);
      const merged = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
      if (merged.length > 0) tickerSeries.set(ticker, merged);
    } catch {
      // Skip tickers that fail (delisted, crypto on wrong provider, etc.)
    }
  }

  const fxSeries = new Map<string, Map<string, number>>();
  for (const currency of uniqueCurrencies) {
    try {
      const pair = `EUR${currency}=X`;
      const [recent, full] = await Promise.all([
        yahoo.getHistorical(pair, "1y").catch(() => []),
        yahoo.getHistorical(pair, "all").catch(() => []),
      ]);
      const rateMap = new Map<string, number>();
      for (const p of full) if (p.close > 0) rateMap.set(p.date, p.close);
      for (const p of recent) if (p.close > 0) rateMap.set(p.date, p.close);
      if (rateMap.size > 0) fxSeries.set(currency, rateMap);
    } catch {
      try {
        const history = await yahoo.getHistorical(`${currency}EUR=X`, "all");
        const rateMap = new Map<string, number>();
        for (const p of history) if (p.close > 0) rateMap.set(p.date, 1 / p.close);
        if (rateMap.size > 0) fxSeries.set(currency, rateMap);
      } catch {
        // Skip currencies we can't resolve
      }
    }
  }

  // FX rates are stored as "1 EUR = X units of foreign currency"
  // (EURUSD=1.08 means 1 EUR = 1.08 USD). To convert local → EUR: amount / rate.
  function findFxRate(currency: string, date: string): number | null {
    let norm = currency.toUpperCase().trim();
    if (norm === "GBp") norm = "GBX";
    if (norm === "EUR") return 1;
    if (norm === "GBX") {
      const gbpRates = fxSeries.get("GBP");
      if (!gbpRates) return null;
      const rate = findClosestRate(gbpRates, date);
      // 1 EUR = EURGBP GBP = EURGBP * 100 GBX
      return rate ? rate * 100 : null;
    }
    const rates = fxSeries.get(norm);
    if (!rates) return null;
    return findClosestRate(rates, date);
  }

  // Historical data from Yahoo "all" uses monthly intervals (~30 days apart),
  // so we need a wider tolerance than the 7-day window used elsewhere.
  function findClosestRate(rates: Map<string, number>, target: string): number | null {
    if (rates.has(target)) return rates.get(target)!;
    const targetMs = new Date(target).getTime();
    let bestDate: string | null = null;
    let bestDiff = Infinity;
    for (const date of rates.keys()) {
      const diff = Math.abs(new Date(date).getTime() - targetMs);
      if (diff < bestDiff) { bestDiff = diff; bestDate = date; }
    }
    if (bestDate && bestDiff <= 35 * 86400000) return rates.get(bestDate)!;
    return null;
  }

  const dates = generateDateList(earliestDate, today);

  let snapshotsCreated = 0;
  const BATCH_SIZE = 50;
  let batch: { id: string; date: string; value: number }[] = [];

  for (const date of dates) {
    const holdings = replayTransactionsUpToDate(sorted, date, holdingCurrencyMap);
    let totalEUR = 0;

    for (const h of holdings) {
      const series = tickerSeries.get(h.ticker);
      if (!series) continue;

      const close = closeOnOrBeforeDate(series, date);
      if (close == null || close <= 0) continue;

      const valueInLocal = h.shares * close;
      const fxRate = findFxRate(h.displayCurrency, date);

      if (fxRate && fxRate > 0) {
        totalEUR += valueInLocal / fxRate;
      }
      // When FX rate is unavailable, skip the holding rather than
      // adding unconverted foreign-currency values as EUR.
    }

    if (totalEUR > 0) {
      batch.push({ id: generateId(), date, value: Math.round(totalEUR * 100) / 100 });
    }

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(client, session.userId, batch);
      snapshotsCreated += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await flushBatch(client, session.userId, batch);
    snapshotsCreated += batch.length;
  }

  await client.execute({
    sql: "UPDATE users SET snapshots_backfilled_at = datetime('now') WHERE id = ?",
    args: [session.userId],
  });

  return NextResponse.json({
    snapshotsCreated,
    dateRange: { from: earliestDate, to: today },
    tickers: uniqueTickers.length,
    currencies: uniqueCurrencies.length,
  });
});

async function flushBatch(
  client: Awaited<ReturnType<typeof ensureInitialized>>,
  userId: string,
  batch: { id: string; date: string; value: number }[],
) {
  for (const row of batch) {
    await client.execute({
      sql: `INSERT INTO portfolio_snapshots (id, user_id, portfolio_id, date, total_value_eur)
            VALUES (?, ?, '', ?, ?)
            ON CONFLICT(user_id, date) DO UPDATE SET total_value_eur = excluded.total_value_eur`,
      args: [row.id, userId, row.date, row.value],
    });
  }
}
