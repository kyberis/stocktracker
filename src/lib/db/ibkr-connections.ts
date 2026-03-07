import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";
import { encrypt, decrypt } from "@/lib/crypto";

export interface IbkrConnection {
  id: string;
  userId: string;
  queryId: string;
  label: string;
  lastSyncedAt: string;
  createdAt: string;
}

export async function getIbkrConnection(userId: string): Promise<IbkrConnection | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT id, user_id, query_id, label, last_synced_at, created_at FROM ibkr_connections WHERE user_id = ? LIMIT 1",
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: str(r.id),
    userId: str(r.user_id),
    queryId: str(r.query_id),
    label: str(r.label),
    lastSyncedAt: str(r.last_synced_at),
    createdAt: str(r.created_at),
  };
}

export async function getIbkrConnectionToken(userId: string): Promise<string | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT token_encrypted FROM ibkr_connections WHERE user_id = ? LIMIT 1",
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  return decrypt(str(result.rows[0].token_encrypted));
}

export async function saveIbkrConnection(
  userId: string,
  token: string,
  queryId: string,
  label?: string,
): Promise<IbkrConnection> {
  const client = await ensureInitialized();
  const existing = await getIbkrConnection(userId);

  if (existing) {
    await client.execute({
      sql: "UPDATE ibkr_connections SET token_encrypted = ?, query_id = ?, label = ? WHERE user_id = ?",
      args: [encrypt(token), queryId, label || "", userId],
    });
    return { ...existing, queryId, label: label || "" };
  }

  const id = randomUUID();
  await client.execute({
    sql: "INSERT INTO ibkr_connections (id, user_id, token_encrypted, query_id, label) VALUES (?, ?, ?, ?, ?)",
    args: [id, userId, encrypt(token), queryId, label || ""],
  });
  return { id, userId, queryId, label: label || "", lastSyncedAt: "", createdAt: new Date().toISOString() };
}

export async function updateIbkrLastSynced(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE ibkr_connections SET last_synced_at = datetime('now') WHERE user_id = ?",
    args: [userId],
  });
}

export async function deleteIbkrConnection(userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM ibkr_connections WHERE user_id = ?",
    args: [userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}
