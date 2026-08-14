import { randomUUID } from "crypto";

import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

export type PortfolioResetArchive = {
  id: string;
  userId: string;
  portfolioId: string;
  holdingsJson: string;
  transactionsJson: string;
  cashJson: string;
  snapshotMaxEur: number;
  source: string;
  createdAt: string;
};

/**
 * Snapshot current ledger for a portfolio before a destructive reset so support
 * can restore if the wipe was accidental (common after invisible-holdings bugs).
 */
export async function archivePortfolioLedgerBeforeReset(
  userId: string,
  portfolioId: string,
  opts?: { includeEmptyPortfolioId?: boolean; source?: string },
): Promise<string | null> {
  const client = await ensureInitialized();
  const includeEmpty = opts?.includeEmptyPortfolioId === true;
  const pidFilter = includeEmpty
    ? `(portfolio_id = ? OR portfolio_id = '' OR portfolio_id IS NULL)`
    : `portfolio_id = ?`;

  const [holdings, transactions, cash, snap] = await Promise.all([
    client.execute({
      sql: `SELECT * FROM holdings WHERE user_id = ? AND ${pidFilter}`,
      args: [userId, portfolioId],
    }),
    client.execute({
      sql: `SELECT * FROM transactions WHERE user_id = ? AND ${pidFilter}`,
      args: [userId, portfolioId],
    }),
    client.execute({
      sql: `SELECT * FROM cash_entries WHERE user_id = ? AND ${pidFilter}`,
      args: [userId, portfolioId],
    }),
    client.execute({
      sql: `SELECT COALESCE(MAX(total_value_eur), 0) AS mx FROM portfolio_snapshots WHERE user_id = ?`,
      args: [userId],
    }),
  ]);

  if (holdings.rows.length === 0 && transactions.rows.length === 0 && cash.rows.length === 0) {
    return null;
  }

  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO portfolio_reset_archives (
            id, user_id, portfolio_id, holdings_json, transactions_json, cash_json,
            snapshot_max_eur, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      portfolioId,
      JSON.stringify(holdings.rows),
      JSON.stringify(transactions.rows),
      JSON.stringify(cash.rows),
      num(snap.rows[0]?.mx),
      opts?.source || "reset_portfolio",
    ],
  });
  return id;
}

export async function listRecentPortfolioResetArchives(
  userId: string,
  limit = 5,
): Promise<PortfolioResetArchive[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM portfolio_reset_archives WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows.map((r) => ({
    id: str(r.id),
    userId: str(r.user_id),
    portfolioId: str(r.portfolio_id),
    holdingsJson: str(r.holdings_json),
    transactionsJson: str(r.transactions_json),
    cashJson: str(r.cash_json),
    snapshotMaxEur: num(r.snapshot_max_eur),
    source: str(r.source),
    createdAt: str(r.created_at),
  }));
}

/**
 * Users whose snapshot history shows a non-trivial portfolio but the live ledger
 * is empty (0 open holdings and 0 transactions). Used by anomaly scan alerts.
 */
export async function listUserIdsWithEmptyLedgerSnapshotHistory(
  minSnapshotEur = 100,
): Promise<string[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT u.id AS user_id
          FROM users u
          WHERE EXISTS (
            SELECT 1 FROM portfolio_snapshots s
            WHERE s.user_id = u.id AND s.total_value_eur >= ?
          )
          AND NOT EXISTS (
            SELECT 1 FROM holdings h WHERE h.user_id = u.id AND h.shares > 0
          )
          AND NOT EXISTS (
            SELECT 1 FROM transactions t WHERE t.user_id = u.id
          )
          AND lower(u.email) NOT LIKE 'test+%@trefolio.com'
          AND lower(u.email) NOT LIKE 'suarez84+%'
          AND lower(u.email) NOT LIKE '%@test.example.com'
          AND lower(u.email) NOT LIKE '%@example.com'`,
    args: [minSnapshotEur],
  });
  return result.rows.map((r) => str(r.user_id));
}
