import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";

const TOKEN_TTL_DAYS = 365;

export async function generateUnsubscribeToken(userId: string): Promise<string> {
  const client = await ensureInitialized();
  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await client.execute({
    sql: `INSERT INTO unsubscribe_tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    args: [token, userId, now.toISOString(), expiresAt.toISOString()],
  });

  return token;
}

/**
 * Validates an unsubscribe token. Returns the userId if valid, null otherwise.
 * Marks the token as used on first call; subsequent calls still return the
 * userId so the unsubscribe action remains idempotent.
 */
export async function consumeUnsubscribeToken(token: string): Promise<string | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT user_id, expires_at FROM unsubscribe_tokens WHERE token = ?",
    args: [token],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const expiresAt = new Date(str(row.expires_at));
  if (expiresAt < new Date()) return null;

  await client.execute({
    sql: "UPDATE unsubscribe_tokens SET used_at = COALESCE(used_at, ?) WHERE token = ?",
    args: [new Date().toISOString(), token],
  });

  return str(row.user_id);
}

export async function purgeExpiredUnsubscribeTokens(): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM unsubscribe_tokens WHERE expires_at < datetime('now')",
  });
  return result.rowsAffected;
}

export interface UnsubscribeEvent {
  token: string;
  userId: string;
  usedAt: string;
  createdAt: string;
  username: string;
  email: string;
  displayName: string;
  plan: string;
  emailNotificationsEnabled: boolean;
}

export async function listUnsubscribeEvents(
  limit = 50,
  offset = 0,
): Promise<{ events: UnsubscribeEvent[]; total: number }> {
  const client = await ensureInitialized();

  const countResult = await client.execute(
    "SELECT COUNT(*) AS cnt FROM unsubscribe_tokens WHERE used_at IS NOT NULL"
  );
  const total = Number(countResult.rows[0]?.cnt ?? 0);

  const result = await client.execute({
    sql: `SELECT
            t.token, t.user_id, t.used_at, t.created_at,
            u.username, u.email, u.display_name, u.plan,
            COALESCE(s.email_notifications_enabled, 1) AS email_enabled
          FROM unsubscribe_tokens t
          LEFT JOIN users u ON u.id = t.user_id
          LEFT JOIN user_settings s ON s.user_id = t.user_id
          WHERE t.used_at IS NOT NULL
          ORDER BY t.used_at DESC
          LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });

  const events: UnsubscribeEvent[] = result.rows.map((row) => ({
    token: str(row.token),
    userId: str(row.user_id),
    usedAt: str(row.used_at),
    createdAt: str(row.created_at),
    username: str(row.username),
    email: str(row.email),
    displayName: str(row.display_name),
    plan: str(row.plan) || "free",
    emailNotificationsEnabled: Number(row.email_enabled) !== 0,
  }));

  return { events, total };
}
