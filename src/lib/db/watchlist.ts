import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, normalizeTickerForExchange } from "./helpers";
import type { WatchlistItem } from "@/lib/types";

export async function listWatchlist(userId: string): Promise<WatchlistItem[]> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC", args: [userId] });
  return result.rows.map((r) => ({ id: str(r.id), ticker: str(r.ticker), name: str(r.name), exchange: str(r.exchange), addedAt: str(r.added_at) }));
}

export async function addWatchlistItem(userId: string, item: Omit<WatchlistItem, "id" | "addedAt">): Promise<WatchlistItem> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const ticker = normalizeTickerForExchange(item.ticker, item.exchange);
  await client.execute({
    sql: "INSERT OR IGNORE INTO watchlist (id, user_id, ticker, name, exchange) VALUES (?, ?, ?, ?, ?)",
    args: [id, userId, ticker, item.name, item.exchange],
  });
  return { id, ticker, name: item.name, exchange: item.exchange, addedAt: new Date().toISOString() };
}

export async function removeWatchlistItem(userId: string, itemId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "DELETE FROM watchlist WHERE id = ? AND user_id = ?", args: [itemId, userId] });
  return (result.rowsAffected ?? 0) > 0;
}
