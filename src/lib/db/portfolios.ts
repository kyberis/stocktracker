import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num, rowToPortfolio, type Portfolio, type PortfolioCurrency } from "./helpers";

export async function listPortfolios(userId: string): Promise<Portfolio[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM portfolios WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC",
    args: [userId],
  });
  return result.rows.map(rowToPortfolio);
}

export async function getDefaultPortfolio(userId: string): Promise<Portfolio> {
  const client = await ensureInitialized();
  let result = await client.execute({
    sql: "SELECT * FROM portfolios WHERE user_id = ? AND is_default = 1",
    args: [userId],
  });

  if (result.rows.length === 0) {
    // Auto-create default portfolio if missing (e.g. legacy user)
    const id = randomUUID();
    await client.execute({
      sql: "INSERT OR IGNORE INTO portfolios (id, user_id, name, is_default, sort_order) VALUES (?, ?, 'My Portfolio', 1, 0)",
      args: [id, userId],
    });
    result = await client.execute({
      sql: "SELECT * FROM portfolios WHERE user_id = ? AND is_default = 1",
      args: [userId],
    });
  }

  return rowToPortfolio(result.rows[0]);
}

export async function createPortfolio(userId: string, name: string, currency: PortfolioCurrency = "EUR"): Promise<Portfolio> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const sortResult = await client.execute({
    sql: "SELECT MAX(sort_order) as mx FROM portfolios WHERE user_id = ?",
    args: [userId],
  });
  const nextSort = num(sortResult.rows[0]?.mx) + 1;

  await client.execute({
    sql: "INSERT INTO portfolios (id, user_id, name, is_default, sort_order, currency) VALUES (?, ?, ?, 0, ?, ?)",
    args: [id, userId, name, nextSort, currency],
  });

  return { id, userId, name, isDefault: false, sortOrder: nextSort, currency, createdAt: new Date().toISOString() };
}

export async function renamePortfolio(userId: string, portfolioId: string, name: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "UPDATE portfolios SET name = ? WHERE id = ? AND user_id = ?",
    args: [name, portfolioId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function updatePortfolioCurrency(userId: string, portfolioId: string, currency: PortfolioCurrency): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "UPDATE portfolios SET currency = ? WHERE id = ? AND user_id = ?",
    args: [currency, portfolioId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

/**
 * Deletes a non-default portfolio and **permanently removes** all data scoped to it:
 * holdings, transactions (including multi-portfolio map rows), cash, evolution snapshots,
 * share links, price alerts, goals, broker↔portfolio mappings, and clears
 * `users.device_portfolio_id` when it pointed at this portfolio.
 *
 * Returns false if the portfolio is the default or doesn't exist.
 */
export async function deletePortfolio(userId: string, portfolioId: string): Promise<boolean> {
  const client = await ensureInitialized();

  // Verify it's not the default
  const check = await client.execute({
    sql: "SELECT is_default FROM portfolios WHERE id = ? AND user_id = ?",
    args: [portfolioId, userId],
  });
  if (check.rows.length === 0) return false;
  if (num(check.rows[0].is_default) === 1) return false;

  // Multi-portfolio transactions: remove map rows first, then delete tx rows that
  // belong only to this portfolio (same rules as deleteAllTransactions — avoids
  // importing transactions.ts and a circular dependency with resolvePortfolioId).
  await client.execute({
    sql: "DELETE FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?",
    args: [userId, portfolioId],
  });
  await client.execute({
    sql: `DELETE FROM transactions WHERE user_id = ? AND portfolio_id = ?
          AND id NOT IN (SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ?)`,
    args: [userId, portfolioId, userId],
  });

  for (const table of ["holdings", "cash_entries", "portfolio_snapshots", "portfolio_shares"] as const) {
    await client.execute({
      sql: `DELETE FROM ${table} WHERE user_id = ? AND portfolio_id = ?`,
      args: [userId, portfolioId],
    });
  }

  await client.execute({
    sql: "DELETE FROM price_alerts WHERE user_id = ? AND portfolio_id = ?",
    args: [userId, portfolioId],
  });
  await client.execute({
    sql: "DELETE FROM goals WHERE user_id = ? AND portfolio_id = ?",
    args: [userId, portfolioId],
  });
  await client.execute({
    sql: "DELETE FROM snaptrade_broker_portfolio_map WHERE user_id = ? AND portfolio_id = ?",
    args: [userId, portfolioId],
  });

  await client.execute({
    sql: "UPDATE users SET device_portfolio_id = '' WHERE id = ? AND device_portfolio_id = ?",
    args: [userId, portfolioId],
  });

  await client.execute({
    sql: "DELETE FROM portfolios WHERE id = ? AND user_id = ?",
    args: [portfolioId, userId],
  });

  return true;
}

export async function setDefaultPortfolio(userId: string, portfolioId: string): Promise<boolean> {
  const client = await ensureInitialized();

  // Verify the portfolio exists
  const check = await client.execute({
    sql: "SELECT id FROM portfolios WHERE id = ? AND user_id = ?",
    args: [portfolioId, userId],
  });
  if (check.rows.length === 0) return false;

  // Unset current default, set new one
  await client.execute({
    sql: "UPDATE portfolios SET is_default = 0 WHERE user_id = ?",
    args: [userId],
  });
  await client.execute({
    sql: "UPDATE portfolios SET is_default = 1 WHERE id = ? AND user_id = ?",
    args: [portfolioId, userId],
  });

  return true;
}

export async function countPortfolios(userId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT COUNT(*) as cnt FROM portfolios WHERE user_id = ?",
    args: [userId],
  });
  return num(result.rows[0]?.cnt);
}

export async function findPortfolioById(userId: string, portfolioId: string): Promise<Portfolio | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM portfolios WHERE id = ? AND user_id = ?",
    args: [portfolioId, userId],
  });
  if (result.rows.length === 0) return null;
  return rowToPortfolio(result.rows[0]);
}

/**
 * Moves all holdings and transactions for a given holding (by ticker+exchange)
 * from one portfolio to another. Used for the "Move to..." feature.
 */
export async function moveHoldingToPortfolio(
  userId: string,
  ticker: string,
  exchange: string,
  fromPortfolioId: string,
  toPortfolioId: string,
): Promise<boolean> {
  const client = await ensureInitialized();

  // Move holdings
  const hResult = await client.execute({
    sql: `UPDATE holdings SET portfolio_id = ?
          WHERE user_id = ? AND portfolio_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)`,
    args: [toPortfolioId, userId, fromPortfolioId, ticker, exchange],
  });

  // Move transactions
  await client.execute({
    sql: `UPDATE transactions SET portfolio_id = ?
          WHERE user_id = ? AND portfolio_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)`,
    args: [toPortfolioId, userId, fromPortfolioId, ticker, exchange],
  });

  // Remove stale mapping entries for the old portfolio on moved transactions
  await client.execute({
    sql: `DELETE FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?
          AND transaction_id IN (
            SELECT id FROM transactions WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)
          )`,
    args: [userId, fromPortfolioId, userId, ticker, exchange],
  });

  return (hResult.rowsAffected ?? 0) > 0;
}

/**
 * Called during user creation to ensure a default portfolio exists.
 */
export async function ensureDefaultPortfolio(userId: string): Promise<string> {
  const p = await getDefaultPortfolio(userId);
  return p.id;
}

/**
 * Returns the given portfolioId if non-empty, otherwise resolves to
 * the user's default portfolio ID. Guarantees a valid portfolio UUID
 * is always returned for insert operations.
 */
export async function resolvePortfolioId(userId: string, portfolioId?: string): Promise<string> {
  if (portfolioId) return portfolioId;
  const p = await getDefaultPortfolio(userId);
  return p.id;
}
