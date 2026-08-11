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

  // Re-assign surviving transactions whose portfolio_id still points to the
  // deleted portfolio — pick the first remaining mapped portfolio so they don't
  // become orphans if that other portfolio is deleted later.
  await client.execute({
    sql: `UPDATE transactions SET portfolio_id = (
            SELECT portfolio_id FROM transaction_portfolio_map
            WHERE transaction_id = transactions.id AND user_id = ?
            LIMIT 1
          )
          WHERE user_id = ? AND portfolio_id = ?
          AND id IN (SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ?)`,
    args: [userId, userId, portfolioId, userId],
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

export type MergePortfolioResult = {
  merged: boolean;
  holdingsMoved: number;
  holdingsCombined: number;
  cashMoved: number;
  cashCombined: number;
};

/**
 * Merge all data from a non-default source portfolio into the target (principal),
 * then delete the source portfolio row.
 *
 * Holdings with the same ticker+exchange are combined (sum shares, weighted avg cost).
 * Cash with the same (name, source) sums amounts into the target row.
 * Source snapshots / shares / scores / rec-cache are dropped (regenerable).
 */
export async function mergePortfolioInto(
  userId: string,
  sourcePortfolioId: string,
  targetPortfolioId: string,
): Promise<MergePortfolioResult> {
  const client = await ensureInitialized();
  if (sourcePortfolioId === targetPortfolioId) {
    return { merged: false, holdingsMoved: 0, holdingsCombined: 0, cashMoved: 0, cashCombined: 0 };
  }

  const check = await client.execute({
    sql: "SELECT id, is_default FROM portfolios WHERE id = ? AND user_id = ?",
    args: [sourcePortfolioId, userId],
  });
  if (check.rows.length === 0) {
    return { merged: false, holdingsMoved: 0, holdingsCombined: 0, cashMoved: 0, cashCombined: 0 };
  }
  if (num(check.rows[0].is_default) === 1) {
    return { merged: false, holdingsMoved: 0, holdingsCombined: 0, cashMoved: 0, cashCombined: 0 };
  }

  const targetOk = await client.execute({
    sql: "SELECT id FROM portfolios WHERE id = ? AND user_id = ?",
    args: [targetPortfolioId, userId],
  });
  if (targetOk.rows.length === 0) {
    return { merged: false, holdingsMoved: 0, holdingsCombined: 0, cashMoved: 0, cashCombined: 0 };
  }

  let holdingsMoved = 0;
  let holdingsCombined = 0;
  let cashMoved = 0;
  let cashCombined = 0;

  // ── Holdings: combine ticker+exchange collisions, else reparent ──
  const sourceHoldings = await client.execute({
    sql: `SELECT id, ticker, exchange, shares, purchase_price, value_in_eur
          FROM holdings WHERE user_id = ? AND portfolio_id = ?`,
    args: [userId, sourcePortfolioId],
  });
  for (const row of sourceHoldings.rows) {
    const ticker = str(row.ticker);
    const exchange = str(row.exchange);
    const existing = await client.execute({
      sql: `SELECT id, shares, purchase_price, value_in_eur FROM holdings
            WHERE user_id = ? AND portfolio_id = ?
              AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)
            LIMIT 1`,
      args: [userId, targetPortfolioId, ticker, exchange],
    });
    if (existing.rows.length > 0) {
      const dest = existing.rows[0];
      const oldShares = num(dest.shares);
      const addShares = num(row.shares);
      const newShares = oldShares + addShares;
      const oldCost = oldShares * num(dest.purchase_price);
      const addCost = addShares * num(row.purchase_price);
      const avgPrice = newShares > 0 ? (oldCost + addCost) / newShares : 0;
      const newValue = num(dest.value_in_eur) + num(row.value_in_eur);
      await client.execute({
        sql: `UPDATE holdings SET shares = ?, purchase_price = ?, value_in_eur = ?
              WHERE id = ? AND user_id = ?`,
        args: [newShares, avgPrice, newValue, str(dest.id), userId],
      });
      await client.execute({
        sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
        args: [str(row.id), userId],
      });
      holdingsCombined += 1;
    } else {
      await client.execute({
        sql: "UPDATE holdings SET portfolio_id = ? WHERE id = ? AND user_id = ?",
        args: [targetPortfolioId, str(row.id), userId],
      });
      holdingsMoved += 1;
    }
  }

  // ── Cash: combine (name, source) collisions, else reparent ──
  const sourceCash = await client.execute({
    sql: `SELECT id, name, source, amount_eur, display_amount FROM cash_entries
          WHERE user_id = ? AND portfolio_id = ?`,
    args: [userId, sourcePortfolioId],
  });
  for (const row of sourceCash.rows) {
    const name = str(row.name);
    const source = str(row.source) || "manual";
    const existing = await client.execute({
      sql: `SELECT id, amount_eur, display_amount FROM cash_entries
            WHERE user_id = ? AND portfolio_id = ? AND name = ? AND source = ?
            LIMIT 1`,
      args: [userId, targetPortfolioId, name, source],
    });
    if (existing.rows.length > 0) {
      const dest = existing.rows[0];
      await client.execute({
        sql: `UPDATE cash_entries
              SET amount_eur = ?, display_amount = ?, updated_at = datetime('now')
              WHERE id = ? AND user_id = ?`,
        args: [
          num(dest.amount_eur) + num(row.amount_eur),
          num(dest.display_amount) + num(row.display_amount),
          str(dest.id),
          userId,
        ],
      });
      await client.execute({
        sql: "DELETE FROM cash_entries WHERE id = ? AND user_id = ?",
        args: [str(row.id), userId],
      });
      cashCombined += 1;
    } else {
      await client.execute({
        sql: "UPDATE cash_entries SET portfolio_id = ? WHERE id = ? AND user_id = ?",
        args: [targetPortfolioId, str(row.id), userId],
      });
      cashMoved += 1;
    }
  }

  // ── Transactions: reparent primary portfolio_id ──
  await client.execute({
    sql: "UPDATE transactions SET portfolio_id = ? WHERE user_id = ? AND portfolio_id = ?",
    args: [targetPortfolioId, userId, sourcePortfolioId],
  });

  // Map rows: delete if target already mapped; else reparent
  await client.execute({
    sql: `DELETE FROM transaction_portfolio_map
          WHERE user_id = ? AND portfolio_id = ?
            AND transaction_id IN (
              SELECT transaction_id FROM (
                SELECT transaction_id FROM transaction_portfolio_map
                WHERE user_id = ? AND portfolio_id = ?
              )
            )`,
    args: [userId, sourcePortfolioId, userId, targetPortfolioId],
  });
  await client.execute({
    sql: `UPDATE transaction_portfolio_map SET portfolio_id = ?
          WHERE user_id = ? AND portfolio_id = ?`,
    args: [targetPortfolioId, userId, sourcePortfolioId],
  });

  // ── Alerts & goals: reparent ──
  await client.execute({
    sql: "UPDATE price_alerts SET portfolio_id = ? WHERE user_id = ? AND portfolio_id = ?",
    args: [targetPortfolioId, userId, sourcePortfolioId],
  });
  await client.execute({
    sql: "UPDATE goals SET portfolio_id = ? WHERE user_id = ? AND portfolio_id = ?",
    args: [targetPortfolioId, userId, sourcePortfolioId],
  });

  // ── SnapTrade broker map: drop source rows that would collide; else reparent ──
  await client.execute({
    sql: `DELETE FROM snaptrade_broker_portfolio_map
          WHERE user_id = ? AND portfolio_id = ?
            AND brokerage_authorization_id IN (
              SELECT brokerage_authorization_id FROM (
                SELECT brokerage_authorization_id FROM snaptrade_broker_portfolio_map
                WHERE user_id = ? AND portfolio_id = ?
              )
            )`,
    args: [userId, sourcePortfolioId, userId, targetPortfolioId],
  });
  await client.execute({
    sql: `UPDATE snaptrade_broker_portfolio_map SET portfolio_id = ?
          WHERE user_id = ? AND portfolio_id = ?`,
    args: [targetPortfolioId, userId, sourcePortfolioId],
  });

  // ── Regenerable / cache tables: drop source rows ──
  for (const table of [
    "portfolio_snapshots",
    "portfolio_shares",
    "portfolio_scores",
  ] as const) {
    await client.execute({
      sql: `DELETE FROM ${table} WHERE user_id = ? AND portfolio_id = ?`,
      args: [userId, sourcePortfolioId],
    });
  }
  await client.execute({
    sql: "DELETE FROM weekly_digests WHERE user_id = ? AND portfolio_id = ?",
    args: [userId, sourcePortfolioId],
  });
  await client.execute({
    sql: "DELETE FROM portfolio_recommendation_cache WHERE user_id = ? AND portfolio_id = ?",
    args: [userId, sourcePortfolioId],
  });

  // ── User / telegram pointers ──
  await client.execute({
    sql: "UPDATE users SET device_portfolio_id = ? WHERE id = ? AND device_portfolio_id = ?",
    args: [targetPortfolioId, userId, sourcePortfolioId],
  });
  await client.execute({
    sql: `UPDATE telegram_chats SET last_active_portfolio_id = ?
          WHERE user_id = ? AND last_active_portfolio_id = ?`,
    args: [targetPortfolioId, userId, sourcePortfolioId],
  });

  await client.execute({
    sql: "DELETE FROM portfolios WHERE id = ? AND user_id = ?",
    args: [sourcePortfolioId, userId],
  });

  return { merged: true, holdingsMoved, holdingsCombined, cashMoved, cashCombined };
}

export type ConsolidateSinglePortfolioResult = {
  userId: string;
  principalId: string;
  merged: string[];
  deletedEmpty: string[];
};

/**
 * Collapse a user to exactly one portfolio: merge every non-default with
 * holdings or cash into the default; delete empty extras.
 */
export async function consolidateUserToSinglePortfolio(
  userId: string,
): Promise<ConsolidateSinglePortfolioResult> {
  const client = await ensureInitialized();
  const principal = await getDefaultPortfolio(userId);
  const list = await listPortfolios(userId);
  const merged: string[] = [];
  const deletedEmpty: string[] = [];

  for (const p of list) {
    if (p.id === principal.id) continue;

    const holdingsCnt = await client.execute({
      sql: "SELECT COUNT(*) as cnt FROM holdings WHERE user_id = ? AND portfolio_id = ?",
      args: [userId, p.id],
    });
    const cashCnt = await client.execute({
      sql: "SELECT COUNT(*) as cnt FROM cash_entries WHERE user_id = ? AND portfolio_id = ?",
      args: [userId, p.id],
    });
    const hasContent = num(holdingsCnt.rows[0]?.cnt) > 0 || num(cashCnt.rows[0]?.cnt) > 0;

    if (hasContent) {
      const result = await mergePortfolioInto(userId, p.id, principal.id);
      if (result.merged) merged.push(p.id);
    } else {
      // Empty: drop portfolio row (no data to preserve). Clear pointers first.
      await client.execute({
        sql: "UPDATE users SET device_portfolio_id = ? WHERE id = ? AND device_portfolio_id = ?",
        args: [principal.id, userId, p.id],
      });
      await client.execute({
        sql: `UPDATE telegram_chats SET last_active_portfolio_id = ?
              WHERE user_id = ? AND last_active_portfolio_id = ?`,
        args: [principal.id, userId, p.id],
      });
      await client.execute({
        sql: "DELETE FROM snaptrade_broker_portfolio_map WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      await client.execute({
        sql: "DELETE FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      await client.execute({
        sql: "DELETE FROM portfolio_snapshots WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      await client.execute({
        sql: "DELETE FROM portfolio_shares WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      await client.execute({
        sql: "DELETE FROM portfolio_scores WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      await client.execute({
        sql: "DELETE FROM weekly_digests WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      await client.execute({
        sql: "DELETE FROM portfolio_recommendation_cache WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      await client.execute({
        sql: "DELETE FROM price_alerts WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      await client.execute({
        sql: "DELETE FROM goals WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      // Orphan txs pointing only at this empty portfolio (unlikely but safe)
      await client.execute({
        sql: `DELETE FROM transactions WHERE user_id = ? AND portfolio_id = ?
              AND id NOT IN (SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ?)`,
        args: [userId, p.id, userId],
      });
      await client.execute({
        sql: "DELETE FROM portfolios WHERE id = ? AND user_id = ?",
        args: [p.id, userId],
      });
      deletedEmpty.push(p.id);
    }
  }

  return { userId, principalId: principal.id, merged, deletedEmpty };
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
