import { ensureInitialized } from "@/lib/db/client";
import { str, num, holdingAssetType, txType } from "@/lib/db/helpers";
import { generateId, normalizeCurrency } from "@/lib/utils";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { closeOnOrBeforeDate } from "@/lib/performance";
import type { HistoricalDataPoint, Transaction } from "@/lib/types";

interface TickerState {
  ticker: string;
  exchange: string;
  shares: number;
  displayCurrency: string;
  portfolioId: string;
}

interface TxWithPortfolio extends Transaction {
  portfolioId: string;
}

export interface BackfillResult {
  snapshotsCreated: number;
  dateRange: { from: string; to: string };
  tickers: number;
  currencies: number;
}

function replayTransactionsUpToDate(
  sorted: TxWithPortfolio[],
  date: string,
  holdingCurrencyMap: Map<string, string>,
): TickerState[] {
  const agg = new Map<string, TickerState>();

  for (const tx of sorted) {
    if (tx.date > date) break;
    const ticker = (tx.ticker || "").toUpperCase().trim();
    if (!ticker || ticker === "FEE" || ticker === "UNKNOWN") continue;

    const pid = tx.portfolioId || "";
    const key = `${ticker}::${pid}`;

    let authoritativeCurrency =
      holdingCurrencyMap.get(ticker) || tx.displayCurrency || tx.currency || "EUR";

    if (ticker.endsWith(".L") && normalizeCurrency(authoritativeCurrency) === "GBP") {
      authoritativeCurrency = "GBX";
    }

    const current = agg.get(key) || {
      ticker,
      exchange: (tx.exchange || "").toUpperCase().trim(),
      shares: 0,
      displayCurrency: authoritativeCurrency,
      portfolioId: pid,
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

/** Recent window always uses weekday-daily samples so 1W/1M charts aren’t sparse when total history is long. */
const DENSE_LOOKBACK_DAYS = 420;

/**
 * Sample dates for reconstructed history (Yahoo daily closes only — no intraday).
 * - **Recent ~14 months before `endDate`:** business days only (daily points) so short ranges stay smooth.
 * - **Older history:** advance 7 days per step (weekly sampling) to bound API cost.
 * Current “hourly” chart detail comes from live / materialized snapshots, not this replay.
 */
function generateDateList(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) return [];

  const denseStart = new Date(end);
  denseStart.setDate(denseStart.getDate() - DENSE_LOOKBACK_DAYS);
  const splitTime = Math.max(start.getTime(), denseStart.getTime());

  const pushWeekday = (d: Date) => {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().slice(0, 10));
    }
  };

  // Older history: one weekday every ~7 days (cheap).
  let lastSparseWeekday: Date | null = null;
  let current = new Date(start);
  while (current.getTime() < splitTime) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      lastSparseWeekday = new Date(current);
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 7);
  }

  // Weekly steps can stop up to 6 days before `splitTime` — fill weekday gaps.
  if (lastSparseWeekday) {
    const bridge = new Date(lastSparseWeekday);
    bridge.setDate(bridge.getDate() + 1);
    while (bridge.getTime() < splitTime) {
      pushWeekday(bridge);
      bridge.setDate(bridge.getDate() + 1);
    }
  }

  // Recent window: every weekday.
  current = new Date(splitTime);
  while (current <= end) {
    pushWeekday(current);
    current.setDate(current.getDate() + 1);
  }

  return [...new Set(dates)].sort();
}

/**
 * Run the full backfill pipeline for a given user: fetch transactions,
 * replay holdings per date, pull Yahoo historical prices + FX, and
 * upsert portfolio_snapshots rows with value + invested capital.
 */
export async function runBackfillForUser(userId: string): Promise<BackfillResult> {
  const client = await ensureInitialized();

  const txResult = await client.execute({
    sql: `SELECT * FROM transactions WHERE user_id = ? AND type IN ('buy','sell')
          ORDER BY date ASC, created_at ASC`,
    args: [userId],
  });

  if (txResult.rows.length === 0) {
    return { snapshotsCreated: 0, dateRange: { from: "", to: "" }, tickers: 0, currencies: 0 };
  }

  const transactions: TxWithPortfolio[] = txResult.rows.map((r) => ({
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
    portfolioId: str(r.portfolio_id),
  }));

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const earliestDate = sorted[0].date;
  // Stop at yesterday — today's snapshot comes from live quotes + actual holdings
  // (via materializeCurrentSnapshotsForUser / POST /api/portfolio/snapshot) which
  // are more accurate than replaying transactions with stale close prices.
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const yesterday = now.toISOString().slice(0, 10);

  const holdingsResult = await client.execute({
    sql: "SELECT ticker, display_currency FROM holdings WHERE user_id = ?",
    args: [userId],
  });
  const holdingCurrencyMap = new Map<string, string>();
  for (const row of holdingsResult.rows) {
    const ticker = str(row.ticker).toUpperCase().trim();
    const dc = str(row.display_currency).toUpperCase().trim();
    if (ticker && dc) holdingCurrencyMap.set(ticker, dc);
  }

  const uniqueTickers = [...new Set(sorted.map((tx) => tx.ticker.toUpperCase().trim()).filter(Boolean))];
  const uniqueCurrencies = [
    ...new Set(
      sorted
        .map((tx) => {
          const ticker = (tx.ticker || "").toUpperCase().trim();
          const holdingDC = holdingCurrencyMap.get(ticker);
          let c = normalizeCurrency(holdingDC || tx.displayCurrency || tx.currency || "");
          if (c === "GBX") c = "GBP";
          return c;
        })
        .filter((c) => c && c !== "EUR"),
    ),
  ];

  const yahoo = new YahooProvider();

  const tickerSeries = new Map<string, HistoricalDataPoint[]>();
  for (const ticker of uniqueTickers) {
    try {
      const [recent, full] = await Promise.all([
        yahoo.getHistorical(ticker, "1y").catch(() => [] as HistoricalDataPoint[]),
        yahoo.getHistorical(ticker, "all").catch(() => [] as HistoricalDataPoint[]),
      ]);
      const byDate = new Map<string, HistoricalDataPoint>();
      for (const p of full) byDate.set(p.date, p);
      for (const p of recent) byDate.set(p.date, p);
      const merged = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
      if (merged.length > 0) tickerSeries.set(ticker, merged);
    } catch {
      // Skip tickers that fail
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

  function findFxRate(currency: string, date: string): number | null {
    let norm = currency.toUpperCase().trim();
    if (norm === "GBp") norm = "GBX";
    if (norm === "EUR") return 1;
    if (norm === "GBX") {
      const gbpRates = fxSeries.get("GBP");
      if (!gbpRates) return null;
      const rate = findClosestRate(gbpRates, date);
      return rate ? rate * 100 : null;
    }
    const rates = fxSeries.get(norm);
    if (!rates) return null;
    return findClosestRate(rates, date);
  }

  function findClosestRate(rates: Map<string, number>, target: string): number | null {
    if (rates.has(target)) return rates.get(target)!;
    const targetMs = new Date(target).getTime();
    let bestDate: string | null = null;
    let bestDiff = Infinity;
    for (const date of rates.keys()) {
      const diff = Math.abs(new Date(date).getTime() - targetMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestDate = date;
      }
    }
    if (bestDate && bestDiff <= 35 * 86400000) return rates.get(bestDate)!;
    return null;
  }

  function computeInvestedUpToDate(
    txs: TxWithPortfolio[],
    date: string,
  ): { aggregate: number; byPortfolio: Map<string, number> } {
    const byPortfolio = new Map<string, number>();
    let aggregate = 0;

    for (const tx of txs) {
      if (tx.date > date) break;
      // totalAmount, fees, and taxes are denominated in tx.currency (not displayCurrency)
      const cur = tx.currency || "EUR";
      let amountEUR: number;

      if (cur === "EUR" || normalizeCurrency(cur) === "EUR") {
        amountEUR = tx.totalAmount;
      } else if (tx.exchangeRateEur && tx.exchangeRateEur > 0) {
        amountEUR = tx.totalAmount / tx.exchangeRateEur;
      } else {
        const fxRate = findFxRate(cur, tx.date);
        if (!fxRate || fxRate <= 0) continue;
        amountEUR = tx.totalAmount / fxRate;
      }

      const feesEUR = tx.fees
        ? cur === "EUR" || normalizeCurrency(cur) === "EUR"
          ? tx.fees
          : tx.exchangeRateEur && tx.exchangeRateEur > 0
            ? tx.fees / tx.exchangeRateEur
            : (() => {
                const r = findFxRate(cur, tx.date);
                return r && r > 0 ? tx.fees / r : 0;
              })()
        : 0;
      const taxesEUR = tx.taxes
        ? cur === "EUR" || normalizeCurrency(cur) === "EUR"
          ? tx.taxes
          : tx.exchangeRateEur && tx.exchangeRateEur > 0
            ? tx.taxes / tx.exchangeRateEur
            : (() => {
                const r = findFxRate(cur, tx.date);
                return r && r > 0 ? tx.taxes / r : 0;
              })()
        : 0;

      let flow: number;
      if (tx.type === "buy") {
        flow = amountEUR + feesEUR + taxesEUR;
      } else {
        flow = -(amountEUR - feesEUR - taxesEUR);
      }

      aggregate += flow;
      const pid = tx.portfolioId || "";
      byPortfolio.set(pid, (byPortfolio.get(pid) || 0) + flow);
    }

    return { aggregate, byPortfolio };
  }

  const dates = generateDateList(earliestDate, yesterday);

  let snapshotsCreated = 0;
  const BATCH_SIZE = 50;
  let batch: { id: string; portfolioId: string; date: string; value: number; invested: number }[] = [];

  for (const date of dates) {
    const holdings = replayTransactionsUpToDate(sorted, date, holdingCurrencyMap);
    const { aggregate: investedAggregate, byPortfolio: investedByPortfolio } =
      computeInvestedUpToDate(sorted, date);

    const portfolioTotals = new Map<string, number>();
    let aggregateEUR = 0;

    for (const h of holdings) {
      const series = tickerSeries.get(h.ticker);
      if (!series) continue;

      const close = closeOnOrBeforeDate(series, date);
      if (close == null || close <= 0) continue;

      const valueInLocal = h.shares * close;
      const fxRate = findFxRate(h.displayCurrency, date);

      if (fxRate && fxRate > 0) {
        const eurValue = valueInLocal / fxRate;
        aggregateEUR += eurValue;
        const pid = h.portfolioId || "";
        portfolioTotals.set(pid, (portfolioTotals.get(pid) || 0) + eurValue);
      }
    }

    if (aggregateEUR > 0) {
      batch.push({
        id: generateId(),
        portfolioId: "",
        date,
        value: Math.round(aggregateEUR * 100) / 100,
        invested: Math.round(investedAggregate * 100) / 100,
      });

      for (const [pid, total] of portfolioTotals) {
        if (pid && total > 0) {
          batch.push({
            id: generateId(),
            portfolioId: pid,
            date,
            value: Math.round(total * 100) / 100,
            invested: Math.round((investedByPortfolio.get(pid) || 0) * 100) / 100,
          });
        }
      }
    }

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(client, userId, batch);
      snapshotsCreated += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await flushBatch(client, userId, batch);
    snapshotsCreated += batch.length;
  }

  await client.execute({
    sql: "UPDATE users SET snapshots_backfilled_at = datetime('now') WHERE id = ?",
    args: [userId],
  });

  return {
    snapshotsCreated,
    dateRange: { from: earliestDate, to: yesterday },
    tickers: uniqueTickers.length,
    currencies: uniqueCurrencies.length,
  };
}

/**
 * Incremental backfill: rebuild daily snapshots from `fromDate` to yesterday.
 * Unlike `runBackfillForUser` this only deletes daily rows in the affected range,
 * preserving all intraday snapshots and any daily history before `fromDate`.
 */
export async function runIncrementalBackfill(
  userId: string,
  fromDate: string,
): Promise<BackfillResult> {
  const client = await ensureInitialized();

  const txResult = await client.execute({
    sql: `SELECT * FROM transactions WHERE user_id = ? AND type IN ('buy','sell')
          ORDER BY date ASC, created_at ASC`,
    args: [userId],
  });

  if (txResult.rows.length === 0) {
    return { snapshotsCreated: 0, dateRange: { from: fromDate, to: fromDate }, tickers: 0, currencies: 0 };
  }

  const transactions: TxWithPortfolio[] = txResult.rows.map((r) => ({
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
    portfolioId: str(r.portfolio_id),
  }));

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const yesterday = now.toISOString().slice(0, 10);

  if (fromDate > yesterday) {
    return { snapshotsCreated: 0, dateRange: { from: fromDate, to: yesterday }, tickers: 0, currencies: 0 };
  }

  const holdingsResult = await client.execute({
    sql: "SELECT ticker, display_currency FROM holdings WHERE user_id = ?",
    args: [userId],
  });
  const holdingCurrencyMap = new Map<string, string>();
  for (const row of holdingsResult.rows) {
    const ticker = str(row.ticker).toUpperCase().trim();
    const dc = str(row.display_currency).toUpperCase().trim();
    if (ticker && dc) holdingCurrencyMap.set(ticker, dc);
  }

  const uniqueTickers = [...new Set(sorted.map((tx) => tx.ticker.toUpperCase().trim()).filter(Boolean))];
  const uniqueCurrencies = [
    ...new Set(
      sorted
        .map((tx) => {
          const ticker = (tx.ticker || "").toUpperCase().trim();
          const holdingDC = holdingCurrencyMap.get(ticker);
          let c = normalizeCurrency(holdingDC || tx.displayCurrency || tx.currency || "");
          if (c === "GBX") c = "GBP";
          return c;
        })
        .filter((c) => c && c !== "EUR"),
    ),
  ];

  const yahoo = new YahooProvider();

  const tickerSeries = new Map<string, HistoricalDataPoint[]>();
  for (const ticker of uniqueTickers) {
    try {
      const data = await yahoo.getHistorical(ticker, "1y").catch(() => [] as HistoricalDataPoint[]);
      if (data.length > 0) tickerSeries.set(ticker, data);
    } catch {
      // skip
    }
  }

  const fxSeries = new Map<string, Map<string, number>>();
  for (const currency of uniqueCurrencies) {
    try {
      const pair = `EUR${currency}=X`;
      const data = await yahoo.getHistorical(pair, "1y").catch(() => []);
      const rateMap = new Map<string, number>();
      for (const p of data) if (p.close > 0) rateMap.set(p.date, p.close);
      if (rateMap.size > 0) fxSeries.set(currency, rateMap);
    } catch {
      // skip
    }
  }

  function findFxRate(currency: string, date: string): number | null {
    let norm = currency.toUpperCase().trim();
    if (norm === "GBp") norm = "GBX";
    if (norm === "EUR") return 1;
    if (norm === "GBX") {
      const gbpRates = fxSeries.get("GBP");
      if (!gbpRates) return null;
      const rate = findClosestRateInc(gbpRates, date);
      return rate ? rate * 100 : null;
    }
    const rates = fxSeries.get(norm);
    if (!rates) return null;
    return findClosestRateInc(rates, date);
  }

  function findClosestRateInc(rates: Map<string, number>, target: string): number | null {
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

  function computeInvestedUpToDate(
    txs: TxWithPortfolio[],
    date: string,
  ): { aggregate: number; byPortfolio: Map<string, number> } {
    const byPortfolio = new Map<string, number>();
    let aggregate = 0;
    for (const tx of txs) {
      if (tx.date > date) break;
      const cur = tx.currency || "EUR";
      let amountEUR: number;
      if (cur === "EUR" || normalizeCurrency(cur) === "EUR") {
        amountEUR = tx.totalAmount;
      } else if (tx.exchangeRateEur && tx.exchangeRateEur > 0) {
        amountEUR = tx.totalAmount / tx.exchangeRateEur;
      } else {
        const fxR = findFxRate(cur, tx.date);
        if (!fxR || fxR <= 0) continue;
        amountEUR = tx.totalAmount / fxR;
      }
      const feesEUR = tx.fees
        ? cur === "EUR" || normalizeCurrency(cur) === "EUR"
          ? tx.fees
          : tx.exchangeRateEur && tx.exchangeRateEur > 0
            ? tx.fees / tx.exchangeRateEur
            : (() => { const r = findFxRate(cur, tx.date); return r && r > 0 ? tx.fees / r : 0; })()
        : 0;
      const taxesEUR = tx.taxes
        ? cur === "EUR" || normalizeCurrency(cur) === "EUR"
          ? tx.taxes
          : tx.exchangeRateEur && tx.exchangeRateEur > 0
            ? tx.taxes / tx.exchangeRateEur
            : (() => { const r = findFxRate(cur, tx.date); return r && r > 0 ? tx.taxes / r : 0; })()
        : 0;
      const flow = tx.type === "buy"
        ? amountEUR + feesEUR + taxesEUR
        : -(amountEUR - feesEUR - taxesEUR);
      aggregate += flow;
      const pid = tx.portfolioId || "";
      byPortfolio.set(pid, (byPortfolio.get(pid) || 0) + flow);
    }
    return { aggregate, byPortfolio };
  }

  // Only delete daily rows from fromDate onward — leaves older history intact
  await client.execute({
    sql: `DELETE FROM portfolio_snapshots
          WHERE user_id = ? AND date >= ? AND date NOT LIKE '% %' AND date NOT LIKE '%T%'`,
    args: [userId, fromDate],
  });

  const dates = generateDateList(fromDate, yesterday);
  let snapshotsCreated = 0;
  const BATCH_SIZE = 50;
  let batch: { id: string; portfolioId: string; date: string; value: number; invested: number }[] = [];

  for (const date of dates) {
    const holdings = replayTransactionsUpToDate(sorted, date, holdingCurrencyMap);
    const { aggregate: investedAggregate, byPortfolio: investedByPortfolio } =
      computeInvestedUpToDate(sorted, date);

    const portfolioTotals = new Map<string, number>();
    let aggregateEUR = 0;

    for (const h of holdings) {
      const series = tickerSeries.get(h.ticker);
      if (!series) continue;
      const close = closeOnOrBeforeDate(series, date);
      if (close == null || close <= 0) continue;
      const valueInLocal = h.shares * close;
      const fxR = findFxRate(h.displayCurrency, date);
      if (fxR && fxR > 0) {
        const eurValue = valueInLocal / fxR;
        aggregateEUR += eurValue;
        const pid = h.portfolioId || "";
        portfolioTotals.set(pid, (portfolioTotals.get(pid) || 0) + eurValue);
      }
    }

    if (aggregateEUR > 0) {
      batch.push({
        id: generateId(), portfolioId: "", date,
        value: Math.round(aggregateEUR * 100) / 100,
        invested: Math.round(investedAggregate * 100) / 100,
      });
      for (const [pid, total] of portfolioTotals) {
        if (pid && total > 0) {
          batch.push({
            id: generateId(), portfolioId: pid, date,
            value: Math.round(total * 100) / 100,
            invested: Math.round((investedByPortfolio.get(pid) || 0) * 100) / 100,
          });
        }
      }
    }

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(client, userId, batch);
      snapshotsCreated += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await flushBatch(client, userId, batch);
    snapshotsCreated += batch.length;
  }

  return {
    snapshotsCreated,
    dateRange: { from: fromDate, to: yesterday },
    tickers: uniqueTickers.length,
    currencies: uniqueCurrencies.length,
  };
}

async function flushBatch(
  client: Awaited<ReturnType<typeof ensureInitialized>>,
  userId: string,
  batch: { id: string; portfolioId: string; date: string; value: number; invested: number }[],
) {
  if (batch.length === 0) return;
  const stmts = batch.map((row) => ({
    sql: `INSERT INTO portfolio_snapshots (id, user_id, portfolio_id, date, total_value_eur, total_invested_eur)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, portfolio_id, date) DO UPDATE SET
            total_value_eur = excluded.total_value_eur,
            total_invested_eur = excluded.total_invested_eur`,
    args: [row.id, userId, row.portfolioId, row.date, row.value, row.invested],
  }));
  await client.batch(stmts, "write");
}
