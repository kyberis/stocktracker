import { randomUUID } from "crypto";
import type { InValue } from "@libsql/client";
import { ensureInitialized } from "./client";
import { str, num, holdingAssetType, txType, normalizeTickerForExchange } from "./helpers";
import type { Transaction } from "@/lib/types";
import { resolvePortfolioId } from "./portfolios";

export async function listTransactions(userId: string, holdingId?: string, portfolioId?: string): Promise<Transaction[]> {
  const client = await ensureInitialized();
  let sql: string;
  let args: string[];

  // When filtering by holdingId, also match unlinked transactions by ticker+exchange
  // so transactions created before the holding_id backfill still appear.
  let holdingTicker: string | null = null;
  let holdingExchange: string | null = null;
  if (holdingId) {
    const hRes = await client.execute({
      sql: "SELECT ticker, exchange FROM holdings WHERE id = ? AND user_id = ?",
      args: [holdingId, userId],
    });
    if (hRes.rows.length > 0) {
      holdingTicker = str(hRes.rows[0].ticker);
      holdingExchange = str(hRes.rows[0].exchange);
    }
  }

  const mapSub = "(SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?)";

  if (holdingId && portfolioId && holdingTicker) {
    sql = `SELECT * FROM transactions WHERE user_id = ?
           AND (portfolio_id = ? OR id IN ${mapSub})
           AND (holding_id = ? OR (holding_id = '' AND ticker = ? AND UPPER(COALESCE(exchange,'')) = ?))
           ORDER BY date DESC, created_at DESC`;
    args = [userId, portfolioId, userId, portfolioId, holdingId, holdingTicker, (holdingExchange || "").toUpperCase()];
  } else if (holdingId && portfolioId) {
    sql = `SELECT * FROM transactions WHERE user_id = ? AND holding_id = ?
           AND (portfolio_id = ? OR id IN ${mapSub})
           ORDER BY date DESC, created_at DESC`;
    args = [userId, holdingId, portfolioId, userId, portfolioId];
  } else if (portfolioId) {
    sql = `SELECT * FROM transactions WHERE user_id = ?
           AND (portfolio_id = ? OR id IN ${mapSub})
           ORDER BY date DESC, created_at DESC`;
    args = [userId, portfolioId, userId, portfolioId];
  } else if (holdingId && holdingTicker) {
    sql = `SELECT * FROM transactions WHERE user_id = ?
           AND (holding_id = ? OR (holding_id = '' AND ticker = ? AND UPPER(COALESCE(exchange,'')) = ?))
           ORDER BY date DESC, created_at DESC`;
    args = [userId, holdingId, holdingTicker, (holdingExchange || "").toUpperCase()];
  } else if (holdingId) {
    sql = "SELECT * FROM transactions WHERE user_id = ? AND holding_id = ? ORDER BY date DESC, created_at DESC";
    args = [userId, holdingId];
  } else {
    sql = "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC";
    args = [userId];
  }
  const result = await client.execute({ sql, args });

  // Self-heal: backfill holding_id on unlinked transactions
  if (holdingId && holdingTicker) {
    const unlinked = result.rows.filter((r) => str(r.holding_id) === "");
    if (unlinked.length > 0) {
      const ids = unlinked.map((r) => str(r.id));
      const placeholders = ids.map(() => "?").join(",");
      await client.execute({
        sql: `UPDATE transactions SET holding_id = ? WHERE id IN (${placeholders}) AND user_id = ?`,
        args: [holdingId, ...ids, userId],
      });
    }
  }
  return result.rows.map((r) => ({
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
    exchangeRateEur: r.exchange_rate_eur != null ? Number(r.exchange_rate_eur) || undefined : undefined,
    notes: str(r.notes),
    sourceRef: str(r.source_ref),
    brokerName: str(r.broker_name) || undefined,
    createdAt: str(r.created_at),
  }));
}

async function findHoldingForTicker(
  client: Awaited<ReturnType<typeof ensureInitialized>>,
  userId: string,
  ticker: string,
  exchange: string,
  portfolioId?: string,
): Promise<{ id: string; shares: number; purchasePrice: number } | null> {
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];

  let result = await client.execute({
    sql: `SELECT id, shares, purchase_price FROM holdings WHERE user_id = ? AND UPPER(ticker) = ? AND UPPER(exchange) = ?${portfolioFilter}`,
    args: [userId, ticker, exchange, ...portfolioArgs],
  });

  if (result.rows.length === 0 && exchange === "") {
    result = await client.execute({
      sql: `SELECT id, shares, purchase_price FROM holdings WHERE user_id = ? AND UPPER(ticker) = ?${portfolioFilter}`,
      args: [userId, ticker, ...portfolioArgs],
    });
  }
  if (result.rows.length === 0) return null;

  if (result.rows.length > 1) {
    const keep = result.rows[0];
    let mergedShares = num(keep.shares);
    let mergedCost = mergedShares * num(keep.purchase_price);
    const dupDeleteFilter = portfolioId ? " AND portfolio_id = ?" : "";
    const dupDeleteArgs = portfolioId ? [portfolioId] : [];
    for (let i = 1; i < result.rows.length; i++) {
      const dup = result.rows[i];
      const dupShares = num(dup.shares);
      mergedShares += dupShares;
      mergedCost += dupShares * num(dup.purchase_price);
      await client.execute({
        sql: `DELETE FROM holdings WHERE id = ? AND user_id = ?${dupDeleteFilter}`,
        args: [str(dup.id), userId, ...dupDeleteArgs],
      });
    }
    const mergedPrice = mergedShares > 0 ? mergedCost / mergedShares : 0;
    await client.execute({
      sql: "UPDATE holdings SET shares = ?, purchase_price = ? WHERE id = ? AND user_id = ?",
      args: [mergedShares, mergedPrice, str(keep.id), userId],
    });
    return { id: str(keep.id), shares: mergedShares, purchasePrice: mergedPrice };
  }

  const row = result.rows[0];
  return { id: str(row.id), shares: num(row.shares), purchasePrice: num(row.purchase_price) };
}

async function syncHoldingForTransaction(
  userId: string,
  tx: { ticker: string; exchange: string; name: string; isin: string; assetType: string; type: string; shares: number; totalAmount: number; fees: number; taxes: number; currency: string; displayCurrency?: string; accountId?: string },
  portfolioId?: string,
): Promise<string | undefined> {
  if (tx.type !== "buy" && tx.type !== "sell") return undefined;

  const client = await ensureInitialized();
  const ticker = tx.ticker.toUpperCase();
  const exchange = (tx.exchange || "").toUpperCase();
  const existing = await findHoldingForTicker(client, userId, ticker, exchange, portfolioId);

  if (tx.type === "buy") {
    if (existing) {
      const newShares = existing.shares + tx.shares;
      const oldCost = existing.shares * existing.purchasePrice;
      const newCost = oldCost + tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0);
      const newPrice = newShares > 0 ? newCost / newShares : 0;
      await client.execute({
        sql: "UPDATE holdings SET shares = ?, purchase_price = ? WHERE id = ? AND user_id = ?",
        args: [newShares, newPrice, existing.id, userId],
      });
      return existing.id;
    } else {
      const id = randomUUID();
      const price = tx.shares > 0 ? (tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0)) / tx.shares : 0;
      await client.execute({
        sql: `INSERT INTO holdings (id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, account_id, portfolio_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        args: [id, userId, tx.name || ticker, ticker, tx.isin || "", tx.assetType || "stock", tx.shares, price, tx.displayCurrency || tx.currency || "EUR", exchange, tx.accountId || "", portfolioId || ""],
      });
      return id;
    }
  } else if (tx.type === "sell") {
    if (existing) {
      const sold = Math.min(tx.shares, existing.shares);
      const avgCost = existing.shares > 0 ? (existing.shares * existing.purchasePrice) / existing.shares : 0;
      const newShares = existing.shares - sold;
      const newCost = Math.max(0, existing.shares * existing.purchasePrice - sold * avgCost);
      const newPrice = newShares > 0 ? newCost / newShares : 0;

      if (newShares <= 0) {
        await client.execute({
          sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
          args: [existing.id, userId],
        });
      } else {
        await client.execute({
          sql: "UPDATE holdings SET shares = ?, purchase_price = ? WHERE id = ? AND user_id = ?",
          args: [newShares, newPrice, existing.id, userId],
        });
      }
      return existing.id;
    }
  }
  return undefined;
}

export async function addTransaction(userId: string, tx: Omit<Transaction, "id" | "createdAt">, portfolioId?: string): Promise<Transaction | null> {
  const client = await ensureInitialized();
  const resolved = await resolvePortfolioId(userId, portfolioId);
  const id = randomUUID();
  const total = tx.totalAmount || tx.shares * tx.pricePerShare;
  const exchange = (tx.exchange || "").toUpperCase();
  const ticker = normalizeTickerForExchange(tx.ticker, exchange);
  const sourceRef = tx.sourceRef || "";

  try {
    await client.execute({
      sql: `INSERT INTO transactions (
              id, user_id, holding_id, ticker, name, exchange, isin, asset_type, account_id,
              type, date, shares, price_per_share, total_amount, fees, taxes, currency, display_currency, exchange_rate_eur, notes, source_ref, portfolio_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, tx.holdingId || "", ticker, tx.name || "", exchange,
        tx.isin || "", tx.assetType || "stock", tx.accountId || "",
        tx.type, tx.date, tx.shares, tx.pricePerShare, total,
        tx.fees || 0, tx.taxes || 0, tx.currency || "EUR",
        tx.displayCurrency || tx.currency || "EUR", tx.exchangeRateEur ?? null,
        tx.notes || "", sourceRef,
        resolved,
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (sourceRef && msg.includes("UNIQUE constraint failed")) {
      return null;
    }
    throw err;
  }

  const created: Transaction = {
    ...tx,
    id,
    ticker,
    exchange,
    totalAmount: total,
    fees: tx.fees || 0,
    taxes: tx.taxes || 0,
    notes: tx.notes || "",
    createdAt: new Date().toISOString(),
  };

  const holdingIdFromSync = await syncHoldingForTransaction(userId, {
    ticker,
    exchange,
    name: tx.name || "",
    isin: tx.isin || "",
    assetType: tx.assetType || "stock",
    type: tx.type,
    shares: tx.shares,
    totalAmount: total,
    fees: tx.fees || 0,
    taxes: tx.taxes || 0,
    currency: tx.currency || "EUR",
    displayCurrency: tx.displayCurrency || tx.currency || "EUR",
    accountId: tx.accountId || "",
  }, resolved);

  if (holdingIdFromSync && !tx.holdingId) {
    await client.execute({
      sql: "UPDATE transactions SET holding_id = ? WHERE id = ? AND user_id = ?",
      args: [holdingIdFromSync, id, userId],
    });
    created.holdingId = holdingIdFromSync;
  }

  return created;
}

export async function addTransactionsBulk(
  userId: string,
  txs: Omit<Transaction, "id" | "createdAt">[],
  portfolioId?: string,
): Promise<{ inserted: number; skipped: number }> {
  if (txs.length === 0) return { inserted: 0, skipped: 0 };

  const client = await ensureInitialized();
  const resolved = await resolvePortfolioId(userId, portfolioId);
  const BATCH_SIZE = 50;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < txs.length; i += BATCH_SIZE) {
    const batch = txs.slice(i, i + BATCH_SIZE);
    const stmts = batch.map((tx) => {
      const id = randomUUID();
      const total = tx.totalAmount || tx.shares * tx.pricePerShare;
      const exchange = (tx.exchange || "").toUpperCase();
      const ticker = normalizeTickerForExchange(tx.ticker, exchange);
      const sourceRef = tx.sourceRef || "";

      return {
        sql: `INSERT OR IGNORE INTO transactions (
                id, user_id, holding_id, ticker, name, exchange, isin, asset_type, account_id,
                type, date, shares, price_per_share, total_amount, fees, taxes, currency, display_currency, exchange_rate_eur, notes, source_ref, broker_name, portfolio_id
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, userId, tx.holdingId || "", ticker, tx.name || "", exchange,
          tx.isin || "", tx.assetType || "stock", tx.accountId || "",
          tx.type, tx.date, tx.shares, tx.pricePerShare, total,
          tx.fees || 0, tx.taxes || 0, tx.currency || "EUR",
          tx.displayCurrency || tx.currency || "EUR", tx.exchangeRateEur ?? null,
          tx.notes || "", sourceRef, (tx as Record<string, unknown>).brokerName || "",
          resolved,
        ] as InValue[],
      };
    });

    const results = await client.batch(stmts, "write");
    for (const r of results) {
      if ((r.rowsAffected ?? 0) > 0) inserted++;
      else skipped++;
    }
  }

  return { inserted, skipped };
}

export async function updateTransaction(
  userId: string,
  txId: string,
  updates: Partial<Pick<Transaction, "type" | "date" | "shares" | "pricePerShare" | "totalAmount" | "fees" | "taxes" | "notes">>,
): Promise<boolean> {
  const client = await ensureInitialized();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (updates.type !== undefined) { sets.push("type = ?"); args.push(updates.type); }
  if (updates.date !== undefined) { sets.push("date = ?"); args.push(updates.date); }
  if (updates.shares !== undefined) { sets.push("shares = ?"); args.push(updates.shares); }
  if (updates.pricePerShare !== undefined) { sets.push("price_per_share = ?"); args.push(updates.pricePerShare); }
  if (updates.totalAmount !== undefined) { sets.push("total_amount = ?"); args.push(updates.totalAmount); }
  if (updates.fees !== undefined) { sets.push("fees = ?"); args.push(updates.fees); }
  if (updates.taxes !== undefined) { sets.push("taxes = ?"); args.push(updates.taxes); }
  if (updates.notes !== undefined) { sets.push("notes = ?"); args.push(updates.notes); }

  if (sets.length === 0) return false;
  args.push(txId, userId);

  const result = await client.execute({
    sql: `UPDATE transactions SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function deleteTransaction(userId: string, txId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "DELETE FROM transactions WHERE id = ? AND user_id = ?", args: [txId, userId] });
  return (result.rowsAffected ?? 0) > 0;
}

export async function deleteTransactionsForPosition(
  userId: string,
  ticker: string,
  exchange: string,
  portfolioId?: string,
): Promise<number> {
  const client = await ensureInitialized();
  const normalizedTicker = normalizeTickerForExchange(ticker, exchange);

  if (portfolioId) {
    // Remove mapping entries for this portfolio + ticker
    await client.execute({
      sql: `DELETE FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?
            AND transaction_id IN (
              SELECT id FROM transactions WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)
            )`,
      args: [userId, portfolioId, userId, normalizedTicker, exchange],
    });

    // Only delete the actual rows if they belong to this portfolio and aren't mapped elsewhere
    const result = await client.execute({
      sql: `DELETE FROM transactions WHERE user_id = ? AND portfolio_id = ?
            AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)
            AND id NOT IN (SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ?)`,
      args: [userId, portfolioId, normalizedTicker, exchange, userId],
    });

    // Re-assign surviving transactions whose portfolio_id still points here
    await client.execute({
      sql: `UPDATE transactions SET portfolio_id = (
              SELECT portfolio_id FROM transaction_portfolio_map
              WHERE transaction_id = transactions.id AND user_id = ?
              LIMIT 1
            )
            WHERE user_id = ? AND portfolio_id = ?
            AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)
            AND id IN (SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ?)`,
      args: [userId, userId, portfolioId, normalizedTicker, exchange, userId],
    });

    return Number(result.rowsAffected ?? 0);
  }

  const result = await client.execute({
    sql: `DELETE FROM transactions WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)`,
    args: [userId, normalizedTicker, exchange],
  });
  return Number(result.rowsAffected ?? 0);
}

export async function deleteAllTransactions(userId: string, portfolioId?: string): Promise<number> {
  const client = await ensureInitialized();

  if (portfolioId) {
    // Remove mapping entries for this portfolio
    await client.execute({
      sql: "DELETE FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?",
      args: [userId, portfolioId],
    });

    // Only delete actual rows that belong to this portfolio and aren't mapped elsewhere
    const result = await client.execute({
      sql: `DELETE FROM transactions WHERE user_id = ? AND portfolio_id = ?
            AND id NOT IN (SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ?)`,
      args: [userId, portfolioId, userId],
    });

    // Re-assign surviving transactions whose portfolio_id still points here
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

    return Number(result.rowsAffected ?? 0);
  }

  const result = await client.execute({
    sql: "DELETE FROM transactions WHERE user_id = ?",
    args: [userId],
  });
  return Number(result.rowsAffected ?? 0);
}

export async function listTransactionSourceRefs(userId: string, portfolioId?: string): Promise<Set<string>> {
  const client = await ensureInitialized();
  let sql: string;
  let args: string[];
  if (portfolioId) {
    sql = `SELECT source_ref FROM transactions WHERE user_id = ? AND source_ref != ''
           AND (portfolio_id = ? OR id IN (SELECT transaction_id FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?))`;
    args = [userId, portfolioId, userId, portfolioId];
  } else {
    sql = "SELECT source_ref FROM transactions WHERE user_id = ? AND source_ref != ''";
    args = [userId];
  }
  const result = await client.execute({ sql, args });
  return new Set(result.rows.map((r) => str(r.source_ref)));
}

/* ── Transaction ↔ Portfolio mapping (multi-portfolio sync) ── */

export async function mapTransactionsToPortfolio(
  userId: string,
  transactionIds: string[],
  portfolioId: string,
): Promise<void> {
  if (transactionIds.length === 0) return;
  const client = await ensureInitialized();
  const BATCH = 50;
  for (let i = 0; i < transactionIds.length; i += BATCH) {
    const batch = transactionIds.slice(i, i + BATCH);
    await client.batch(
      batch.map((txId) => ({
        sql: `INSERT OR IGNORE INTO transaction_portfolio_map (transaction_id, portfolio_id, user_id) VALUES (?, ?, ?)`,
        args: [txId, portfolioId, userId],
      })),
      "write",
    );
  }
}

export async function mapTransactionsBySourceRef(
  userId: string,
  sourceRefs: string[],
  portfolioId: string,
): Promise<void> {
  if (sourceRefs.length === 0) return;
  const client = await ensureInitialized();
  const BATCH = 50;
  for (let i = 0; i < sourceRefs.length; i += BATCH) {
    const batch = sourceRefs.slice(i, i + BATCH);
    const placeholders = batch.map(() => "?").join(",");
    const rows = await client.execute({
      sql: `SELECT id FROM transactions WHERE user_id = ? AND source_ref IN (${placeholders})`,
      args: [userId, ...batch],
    });
    const txIds = rows.rows.map((r) => str(r.id));
    if (txIds.length > 0) {
      await mapTransactionsToPortfolio(userId, txIds, portfolioId);
    }
  }
}

export async function removeTransactionPortfolioMappings(
  userId: string,
  portfolioId: string,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "DELETE FROM transaction_portfolio_map WHERE user_id = ? AND portfolio_id = ?",
    args: [userId, portfolioId],
  });
}

/**
 * Returns the set of distinct UPPER(ticker) values for buy transactions already
 * stored. Used by the bulk import route to enforce the holdings limit across
 * chunked imports where the holdings table hasn't been rebuilt yet.
 */
export async function listDistinctBuyTickers(
  userId: string,
  portfolioId?: string,
): Promise<Set<string>> {
  const client = await ensureInitialized();
  const resolved = await resolvePortfolioId(userId, portfolioId);
  const result = await client.execute({
    sql: `SELECT DISTINCT UPPER(ticker) AS t
          FROM transactions
          WHERE user_id = ? AND portfolio_id = ? AND type = 'buy' AND ticker != ''`,
    args: [userId, resolved],
  });
  return new Set(result.rows.map((r) => str(r.t)));
}
