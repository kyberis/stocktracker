/**
 * Read-only SQLite row dumps for admin debugging. No merges, derivations, or read-time mutations.
 */
import { ensureInitialized } from "./client";

function rowToPlainObject(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "bigint") {
      out[k] = v.toString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

function rowsToPlain(rows: { [key: string]: unknown }[]): Record<string, unknown>[] {
  return rows.map((r) => rowToPlainObject(r as Record<string, unknown>));
}

/**
 * Literal `holdings` table rows (no ticker merge, no derivation from transactions).
 */
export async function listHoldingsRaw(userId: string, portfolioId?: string): Promise<Record<string, unknown>[]> {
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const result = await client.execute({
    sql: `SELECT * FROM holdings WHERE user_id = ?${portfolioFilter} ORDER BY created_at ASC, id ASC`,
    args: [userId, ...portfolioArgs],
  });
  return rowsToPlain(result.rows as { [key: string]: unknown }[]);
}

const mapSub = "(SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?)";

/**
 * Literal `transactions` table rows (no self-heal UPDATE, no type mapping).
 */
export async function listTransactionsRaw(userId: string, portfolioId?: string): Promise<Record<string, unknown>[]> {
  const client = await ensureInitialized();
  let sql: string;
  let args: string[];
  if (portfolioId) {
    sql = `SELECT * FROM transactions WHERE user_id = ?
           AND (portfolio_id = ? OR id IN ${mapSub})
           ORDER BY date DESC, created_at DESC`;
    args = [userId, portfolioId, userId, portfolioId];
  } else {
    sql = "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC";
    args = [userId];
  }
  const result = await client.execute({ sql, args });
  return rowsToPlain(result.rows as { [key: string]: unknown }[]);
}

/**
 * Literal `transaction_portfolio_map` rows for the user (optional portfolio filter).
 */
export async function listTransactionPortfolioMapRaw(
  userId: string,
  portfolioId?: string
): Promise<Record<string, unknown>[]> {
  const client = await ensureInitialized();
  const pf = portfolioId ? " AND portfolio_id = ?" : "";
  const args = portfolioId ? [userId, portfolioId] : [userId];
  const result = await client.execute({
    sql: `SELECT * FROM transaction_portfolio_map WHERE user_id = ?${pf} ORDER BY portfolio_id ASC, transaction_id ASC`,
    args,
  });
  return rowsToPlain(result.rows as { [key: string]: unknown }[]);
}

/**
 * Literal `cash_entries` table rows (cash & manual assets: savings, pension, real estate, etc.).
 */
export async function listCashEntriesRaw(userId: string, portfolioId?: string): Promise<Record<string, unknown>[]> {
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const result = await client.execute({
    sql: `SELECT * FROM cash_entries WHERE user_id = ?${portfolioFilter} ORDER BY type ASC, created_at ASC, id ASC`,
    args: [userId, ...portfolioArgs],
  });
  return rowsToPlain(result.rows as { [key: string]: unknown }[]);
}

/**
 * Literal `holdings` rows with `asset_type = 'crypto'` (separate from merged listHoldings output).
 */
export async function listCryptoHoldingsRaw(userId: string, portfolioId?: string): Promise<Record<string, unknown>[]> {
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const result = await client.execute({
    sql: `SELECT * FROM holdings WHERE user_id = ? AND UPPER(COALESCE(asset_type,'')) = 'CRYPTO'${portfolioFilter} ORDER BY created_at ASC, id ASC`,
    args: [userId, ...portfolioArgs],
  });
  return rowsToPlain(result.rows as { [key: string]: unknown }[]);
}
