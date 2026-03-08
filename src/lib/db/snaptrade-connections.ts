import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";
import { encrypt, decrypt } from "@/lib/crypto";

export interface SnapTradeConnection {
  id: string;
  userId: string;
  snapTradeUserId: string;
  label: string;
  lastSyncedAt: string;
  createdAt: string;
}

export async function getSnapTradeConnection(userId: string): Promise<SnapTradeConnection | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT id, user_id, snaptrade_user_id, label, last_synced_at, created_at FROM snaptrade_connections WHERE user_id = ? LIMIT 1",
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: str(r.id),
    userId: str(r.user_id),
    snapTradeUserId: str(r.snaptrade_user_id),
    label: str(r.label),
    lastSyncedAt: str(r.last_synced_at),
    createdAt: str(r.created_at),
  };
}

export async function getSnapTradeConnectionSecret(userId: string): Promise<string | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT user_secret_encrypted FROM snaptrade_connections WHERE user_id = ? LIMIT 1",
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  return decrypt(str(result.rows[0].user_secret_encrypted));
}

export async function saveSnapTradeConnection(
  userId: string,
  snapTradeUserId: string,
  userSecret: string,
  label?: string,
): Promise<SnapTradeConnection> {
  const client = await ensureInitialized();
  const existing = await getSnapTradeConnection(userId);

  if (existing) {
    await client.execute({
      sql: "UPDATE snaptrade_connections SET snaptrade_user_id = ?, user_secret_encrypted = ?, label = ? WHERE user_id = ?",
      args: [snapTradeUserId, encrypt(userSecret), label || "", userId],
    });
    return { ...existing, snapTradeUserId, label: label || "" };
  }

  const id = randomUUID();
  await client.execute({
    sql: "INSERT INTO snaptrade_connections (id, user_id, snaptrade_user_id, user_secret_encrypted, label) VALUES (?, ?, ?, ?, ?)",
    args: [id, userId, snapTradeUserId, encrypt(userSecret), label || ""],
  });
  return { id, userId, snapTradeUserId, label: label || "", lastSyncedAt: "", createdAt: new Date().toISOString() };
}

export async function updateSnapTradeLastSynced(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE snaptrade_connections SET last_synced_at = datetime('now') WHERE user_id = ?",
    args: [userId],
  });
}

export async function deleteSnapTradeConnection(userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM snaptrade_connections WHERE user_id = ?",
    args: [userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}
