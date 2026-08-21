/**
 * Collapse holdings/transactions that differ only by venue aliases
 * (CPH↔OMK, NYSEAM↔NYSE, 215.HK↔0215.HK, …).
 *
 * Safe to run repeatedly. Used by the CLI repair script and anomaly auto-fix.
 */
import { ensureInitialized } from "@/lib/db/client";
import {
  canonicalExchangeCode,
  exchangeCodeAliases,
  str,
  num,
} from "@/lib/db/helpers";
import { normalizeHkYahooSymbol } from "@/lib/market-symbol";

export type ExchangeAliasRepairSummary = {
  userId: string;
  txCanonicalized: number;
  holdingsDeleted: number;
  txsRelinked: number;
};

type HoldingRow = {
  id: string;
  ticker: string;
  exchange: string;
  shares: number;
  purchasePrice: number;
  valueInEur: number;
  createdAt: string;
  key: string;
};

export async function repairExchangeAliasDuplicatesForUser(
  userId: string,
  opts?: { dryRun?: boolean },
): Promise<ExchangeAliasRepairSummary> {
  const dryRun = opts?.dryRun === true;
  const client = await ensureInitialized();

  let txCanonicalized = 0;
  const txs = await client.execute({
    sql: `SELECT id, ticker, exchange FROM transactions WHERE user_id = ?`,
    args: [userId],
  });
  for (const row of txs.rows) {
    const id = str(row.id);
    const ticker = normalizeHkYahooSymbol(str(row.ticker));
    const exchange = canonicalExchangeCode(str(row.exchange)) || str(row.exchange);
    if (ticker === str(row.ticker) && exchange === str(row.exchange)) continue;
    txCanonicalized += 1;
    if (!dryRun) {
      await client.execute({
        sql: "UPDATE transactions SET ticker = ?, exchange = ? WHERE id = ? AND user_id = ?",
        args: [ticker, exchange, id, userId],
      });
    }
  }

  const holdings = await client.execute({
    sql: `SELECT id, ticker, exchange, shares, purchase_price, value_in_eur, created_at
          FROM holdings WHERE user_id = ? ORDER BY created_at ASC`,
    args: [userId],
  });

  const mapped: HoldingRow[] = holdings.rows.map((r) => {
    const ticker = normalizeHkYahooSymbol(str(r.ticker));
    const exchange = canonicalExchangeCode(str(r.exchange)) || str(r.exchange);
    return {
      id: str(r.id),
      ticker,
      exchange,
      shares: num(r.shares),
      purchasePrice: num(r.purchase_price),
      valueInEur: num(r.value_in_eur),
      createdAt: str(r.created_at),
      key: `${ticker.toUpperCase()}|${canonicalExchangeCode(exchange)}`,
    };
  });

  const byKey = new Map<string, HoldingRow[]>();
  for (const h of mapped) {
    const list = byKey.get(h.key) || [];
    list.push(h);
    byKey.set(h.key, list);
  }

  let holdingsDeleted = 0;
  let txsRelinked = 0;

  for (const [, group] of byKey) {
    const keep = group[0];
    const drop = group.slice(1);

    if (!dryRun) {
      await client.execute({
        sql: "UPDATE holdings SET ticker = ?, exchange = ? WHERE id = ? AND user_id = ?",
        args: [keep.ticker, keep.exchange, keep.id, userId],
      });
    }

    const aliases = exchangeCodeAliases(keep.exchange);
    const aliasPlaceholders = aliases.map(() => "?").join(",");
    const groupPlaceholders = group.map(() => "?").join(",");

    if (!dryRun) {
      const link = await client.execute({
        sql: `UPDATE transactions SET holding_id = ?, exchange = ?, ticker = ?
              WHERE user_id = ? AND UPPER(ticker) = UPPER(?)
              AND (holding_id = '' OR holding_id IN (${groupPlaceholders}))
              AND (UPPER(COALESCE(exchange,'')) IN (${aliasPlaceholders}) OR COALESCE(exchange,'') = '')`,
        args: [
          keep.id,
          keep.exchange,
          keep.ticker,
          userId,
          keep.ticker,
          ...group.map((g) => g.id),
          ...aliases.map((a) => a.toUpperCase()),
        ],
      });
      txsRelinked += Number(link.rowsAffected || 0);
    }

    for (const d of drop) {
      holdingsDeleted += 1;
      if (!dryRun) {
        await client.execute({
          sql: "UPDATE transactions SET holding_id = ?, exchange = ?, ticker = ? WHERE user_id = ? AND holding_id = ?",
          args: [keep.id, keep.exchange, keep.ticker, userId, d.id],
        });
        await client.execute({
          sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
          args: [d.id, userId],
        });
      }
    }
  }

  return { userId, txCanonicalized, holdingsDeleted, txsRelinked };
}

/** Users that still have raw duplicate lots under venue aliases (for cron/CLI). */
export async function listUserIdsWithExchangeAliasDuplicates(): Promise<string[]> {
  const client = await ensureInitialized();
  // Pull all holdings and group in JS — alias map is richer than SQL alone.
  const result = await client.execute({
    sql: `SELECT user_id, id, ticker, exchange, shares, purchase_price FROM holdings`,
    args: [],
  });

  type Row = { userId: string; key: string; shares: number; purchasePrice: number };
  const byUser = new Map<string, Row[]>();
  for (const r of result.rows) {
    const userId = str(r.user_id);
    const ticker = normalizeHkYahooSymbol(str(r.ticker)).toUpperCase();
    const exchange = canonicalExchangeCode(str(r.exchange));
    const key = `${ticker}|${exchange}`;
    const list = byUser.get(userId) || [];
    list.push({
      userId,
      key,
      shares: num(r.shares),
      purchasePrice: num(r.purchase_price),
    });
    byUser.set(userId, list);
  }

  const affected: string[] = [];
  for (const [userId, rows] of byUser) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.key, (counts.get(row.key) || 0) + 1);
    }
    if ([...counts.values()].some((n) => n > 1)) {
      affected.push(userId);
      continue;
    }
    // Also flag when a ticker has two rows that look like the same lot
    // under residual aliases already collapsed to the same key… handled above.
    // Flag non-canonical ticker/exchange spellings that would re-diverge on sync.
    const hasNonCanonical = result.rows.some((r) => {
      if (str(r.user_id) !== userId) return false;
      const ticker = str(r.ticker);
      const exchange = str(r.exchange);
      return (
        normalizeHkYahooSymbol(ticker) !== ticker ||
        (exchange !== "" && canonicalExchangeCode(exchange) !== exchange)
      );
    });
    if (hasNonCanonical) affected.push(userId);
  }
  return affected;
}
