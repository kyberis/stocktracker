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
