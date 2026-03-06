import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num, holdingAssetType, txType, normalizeTickerForExchange } from "./helpers";
import type { Transaction } from "@/lib/types";

export async function listTransactions(userId: string, holdingId?: string): Promise<Transaction[]> {
  const client = await ensureInitialized();
  const sql = holdingId
    ? "SELECT * FROM transactions WHERE user_id = ? AND holding_id = ? ORDER BY date DESC, created_at DESC"
    : "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC";
  const args = holdingId ? [userId, holdingId] : [userId];
  const result = await client.execute({ sql, args });
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
    createdAt: str(r.created_at),
  }));
}

async function findHoldingForTicker(
  client: Awaited<ReturnType<typeof ensureInitialized>>,
  userId: string,
  ticker: string,
  exchange: string,
): Promise<{ id: string; shares: number; purchasePrice: number } | null> {
  let result = await client.execute({
    sql: "SELECT id, shares, purchase_price FROM holdings WHERE user_id = ? AND UPPER(ticker) = ? AND UPPER(exchange) = ?",
    args: [userId, ticker, exchange],
  });

  if (result.rows.length === 0 && exchange === "") {
    result = await client.execute({
      sql: "SELECT id, shares, purchase_price FROM holdings WHERE user_id = ? AND UPPER(ticker) = ?",
      args: [userId, ticker],
    });
  }
  if (result.rows.length === 0) return null;

  if (result.rows.length > 1) {
    const keep = result.rows[0];
    let mergedShares = num(keep.shares);
    let mergedCost = mergedShares * num(keep.purchase_price);
    for (let i = 1; i < result.rows.length; i++) {
      const dup = result.rows[i];
      const dupShares = num(dup.shares);
      mergedShares += dupShares;
      mergedCost += dupShares * num(dup.purchase_price);
      await client.execute({
        sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
        args: [str(dup.id), userId],
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
  tx: { ticker: string; exchange: string; name: string; isin: string; assetType: string; type: string; shares: number; totalAmount: number; fees: number; taxes: number; currency: string; displayCurrency?: string; accountId?: string }
): Promise<void> {
  if (tx.type !== "buy" && tx.type !== "sell") return;

  const client = await ensureInitialized();
  const ticker = tx.ticker.toUpperCase();
  const exchange = (tx.exchange || "").toUpperCase();
  const existing = await findHoldingForTicker(client, userId, ticker, exchange);

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
    } else {
      const id = randomUUID();
      const price = tx.shares > 0 ? (tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0)) / tx.shares : 0;
      await client.execute({
        sql: `INSERT INTO holdings (id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, account_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        args: [id, userId, tx.name || ticker, ticker, tx.isin || "", tx.assetType || "stock", tx.shares, price, tx.displayCurrency || tx.currency || "EUR", exchange, tx.accountId || ""],
      });
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
    }
  }
}

export async function addTransaction(userId: string, tx: Omit<Transaction, "id" | "createdAt">): Promise<Transaction> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const total = tx.totalAmount || tx.shares * tx.pricePerShare;
  const exchange = (tx.exchange || "").toUpperCase();
  const ticker = normalizeTickerForExchange(tx.ticker, exchange);
  await client.execute({
    sql: `INSERT INTO transactions (
            id, user_id, holding_id, ticker, name, exchange, isin, asset_type, account_id,
            type, date, shares, price_per_share, total_amount, fees, taxes, currency, display_currency, exchange_rate_eur, notes, source_ref
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      tx.holdingId || "",
      ticker,
      tx.name || "",
      exchange,
      tx.isin || "",
      tx.assetType || "stock",
      tx.accountId || "",
      tx.type,
      tx.date,
      tx.shares,
      tx.pricePerShare,
      total,
      tx.fees || 0,
      tx.taxes || 0,
      tx.currency || "EUR",
      tx.displayCurrency || tx.currency || "EUR",
      tx.exchangeRateEur ?? null,
      tx.notes || "",
      tx.sourceRef || "",
    ],
  });
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

  await syncHoldingForTransaction(userId, {
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
  });

  return created;
}

export async function deleteTransaction(userId: string, txId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "DELETE FROM transactions WHERE id = ? AND user_id = ?", args: [txId, userId] });
  return (result.rowsAffected ?? 0) > 0;
}

export async function deleteTransactionsForPosition(
  userId: string,
  ticker: string,
  exchange: string
): Promise<number> {
  const client = await ensureInitialized();
  const normalizedTicker = normalizeTickerForExchange(ticker, exchange);
  const result = await client.execute({
    sql: "DELETE FROM transactions WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)",
    args: [userId, normalizedTicker, exchange],
  });
  return Number(result.rowsAffected ?? 0);
}

export async function deleteAllTransactions(userId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM transactions WHERE user_id = ?",
    args: [userId],
  });
  return Number(result.rowsAffected ?? 0);
}

export async function listTransactionSourceRefs(userId: string): Promise<Set<string>> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT source_ref FROM transactions WHERE user_id = ? AND source_ref != ''",
    args: [userId],
  });
  return new Set(result.rows.map((r) => str(r.source_ref)));
}
