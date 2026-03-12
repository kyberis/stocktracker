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

/* ── Deferred deletion on downgrade ── */

/**
 * Returns the last day of the current UTC month at 23:00 UTC.
 * SnapTrade bills per-connected-user per month, so we keep the connection
 * alive until end-of-month to get value from the month already paid for,
 * then disconnect before the next billing cycle.
 */
function endOfMonthUTC(): Date {
  const now = new Date();
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 0, 0));
  return lastDay.getTime() <= now.getTime() ? now : lastDay;
}

export async function scheduleSnapTradeDeletion(userId: string): Promise<void> {
  const client = await ensureInitialized();
  const deleteAt = endOfMonthUTC().toISOString();
  await client.execute({
    sql: "UPDATE snaptrade_connections SET pending_delete_at = ? WHERE user_id = ? AND pending_delete_at = ''",
    args: [deleteAt, userId],
  });
}

export async function clearSnapTradeDeletion(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE snaptrade_connections SET pending_delete_at = '' WHERE user_id = ?",
    args: [userId],
  });
}

export interface PendingSnapTradeDeletion {
  userId: string;
  snapTradeUserId: string;
}

export async function getSnapTradeConnectionsPendingDeletion(): Promise<PendingSnapTradeDeletion[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT user_id, snaptrade_user_id FROM snaptrade_connections WHERE pending_delete_at != '' AND pending_delete_at <= datetime('now')",
    args: [],
  });
  return result.rows.map((r) => ({
    userId: str(r.user_id),
    snapTradeUserId: str(r.snaptrade_user_id),
  }));
}

/* ── All-disabled tracking for stale connection cleanup ── */

export async function setAllDisabledSince(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE snaptrade_connections SET all_disabled_since = datetime('now') WHERE user_id = ? AND all_disabled_since = ''",
    args: [userId],
  });
}

export async function clearAllDisabledSince(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE snaptrade_connections SET all_disabled_since = '' WHERE user_id = ?",
    args: [userId],
  });
}

export async function getConnectionsAllDisabledOver24h(): Promise<PendingSnapTradeDeletion[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT user_id, snaptrade_user_id FROM snaptrade_connections WHERE all_disabled_since != '' AND all_disabled_since <= datetime('now', '-1 day') AND pending_delete_at = ''",
    args: [],
  });
  return result.rows.map((r) => ({
    userId: str(r.user_id),
    snapTradeUserId: str(r.snaptrade_user_id),
  }));
}

/* ── Needs-attention flag for surfacing credential issues on dashboard ── */

export async function setSnapTradeNeedsAttention(userId: string, needsAttention: boolean): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE snaptrade_connections SET needs_attention = ? WHERE user_id = ?",
    args: [needsAttention ? 1 : 0, userId],
  });
}

export async function getSnapTradeNeedsAttention(userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT needs_attention FROM snaptrade_connections WHERE user_id = ? LIMIT 1",
    args: [userId],
  });
  if (result.rows.length === 0) return false;
  return Number(result.rows[0].needs_attention) === 1;
}

export interface ActiveSnapTradeUser {
  userId: string;
  snapTradeUserId: string;
}

export async function listActiveSnapTradeConnections(): Promise<ActiveSnapTradeUser[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT user_id, snaptrade_user_id FROM snaptrade_connections WHERE pending_delete_at = '' OR pending_delete_at > datetime('now')",
    args: [],
  });
  return result.rows.map((r) => ({
    userId: str(r.user_id),
    snapTradeUserId: str(r.snaptrade_user_id),
  }));
}

/* ── Per-broker sync tracking ── */

export interface SnapTradeBrokerSync {
  brokerageAuthorizationId: string;
  brokerageName: string;
  lastImportedAt: string;
  connectedAt: string;
  transactionCount: number;
}

export async function getSnapTradeBrokerSyncs(userId: string): Promise<SnapTradeBrokerSync[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT s.brokerage_authorization_id, s.brokerage_name, s.last_imported_at, s.created_at,
            COUNT(t.id) as tx_count
          FROM snaptrade_broker_syncs s
          LEFT JOIN transactions t ON t.user_id = s.user_id AND t.broker_name = s.brokerage_name
          WHERE s.user_id = ?
          GROUP BY s.brokerage_authorization_id`,
    args: [userId],
  });
  return result.rows.map((r) => ({
    brokerageAuthorizationId: str(r.brokerage_authorization_id),
    brokerageName: str(r.brokerage_name),
    lastImportedAt: str(r.last_imported_at),
    connectedAt: str(r.created_at),
    transactionCount: Number(r.tx_count) || 0,
  }));
}

export async function upsertSnapTradeBrokerSync(
  userId: string,
  brokerageAuthorizationId: string,
  brokerageName: string,
): Promise<void> {
  const client = await ensureInitialized();
  const existing = await client.execute({
    sql: "SELECT id FROM snaptrade_broker_syncs WHERE user_id = ? AND brokerage_authorization_id = ?",
    args: [userId, brokerageAuthorizationId],
  });
  if (existing.rows.length > 0) {
    await client.execute({
      sql: "UPDATE snaptrade_broker_syncs SET last_imported_at = datetime('now'), brokerage_name = ? WHERE user_id = ? AND brokerage_authorization_id = ?",
      args: [brokerageName, userId, brokerageAuthorizationId],
    });
  } else {
    await client.execute({
      sql: "INSERT INTO snaptrade_broker_syncs (id, user_id, brokerage_authorization_id, brokerage_name, last_imported_at) VALUES (?, ?, ?, ?, datetime('now'))",
      args: [randomUUID(), userId, brokerageAuthorizationId, brokerageName],
    });
  }
}
