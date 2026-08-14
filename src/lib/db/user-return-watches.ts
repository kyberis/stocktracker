import { randomUUID } from "crypto";

import { ensureInitialized } from "./client";
import { str } from "./helpers";

export type UserReturnWatch = {
  id: string;
  userId: string;
  reason: string;
  emailSentAt: string;
  notifiedAt: string;
  createdAt: string;
};

/**
 * Open watches where the user has been active at/after the support email was sent.
 */
export async function listDueUserReturnWatches(limit = 50): Promise<UserReturnWatch[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT w.*
          FROM user_return_watches w
          JOIN users u ON u.id = w.user_id
          WHERE w.notified_at IS NULL
            AND u.last_active_at IS NOT NULL
            AND u.last_active_at != ''
            AND u.last_active_at >= w.email_sent_at
          ORDER BY u.last_active_at ASC
          LIMIT ?`,
    args: [limit],
  });
  return result.rows.map((r) => ({
    id: str(r.id),
    userId: str(r.user_id),
    reason: str(r.reason),
    emailSentAt: str(r.email_sent_at),
    notifiedAt: str(r.notified_at),
    createdAt: str(r.created_at),
  }));
}

/** Atomically claim a watch for notification. Returns false if already claimed. */
export async function claimUserReturnWatch(watchId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE user_return_watches
          SET notified_at = datetime('now')
          WHERE id = ? AND notified_at IS NULL`,
    args: [watchId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

/**
 * If this user has an open return-watch and is now active after the email,
 * claim it and return the watch (caller enqueues ProdOps).
 */
export async function claimDueWatchForUser(userId: string): Promise<UserReturnWatch | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT w.*
          FROM user_return_watches w
          JOIN users u ON u.id = w.user_id
          WHERE w.user_id = ?
            AND w.notified_at IS NULL
            AND u.last_active_at IS NOT NULL
            AND u.last_active_at != ''
            AND u.last_active_at >= w.email_sent_at
          LIMIT 1`,
    args: [userId],
  });
  const row = result.rows[0];
  if (!row) return null;
  const watch: UserReturnWatch = {
    id: str(row.id),
    userId: str(row.user_id),
    reason: str(row.reason),
    emailSentAt: str(row.email_sent_at),
    notifiedAt: str(row.notified_at),
    createdAt: str(row.created_at),
  };
  const claimed = await claimUserReturnWatch(watch.id);
  return claimed ? watch : null;
}

export async function ensureUserReturnWatch(input: {
  userId: string;
  reason?: string;
  emailSentAt: string;
}): Promise<string> {
  const client = await ensureInitialized();
  const reason = input.reason || "holdings_restore_support_email";
  const id = randomUUID();
  await client.execute({
    sql: `INSERT OR IGNORE INTO user_return_watches (id, user_id, reason, email_sent_at)
          VALUES (?, ?, ?, ?)`,
    args: [id, input.userId, reason, input.emailSentAt],
  });
  const existing = await client.execute({
    sql: `SELECT id FROM user_return_watches WHERE user_id = ? AND reason = ? LIMIT 1`,
    args: [input.userId, reason],
  });
  return str(existing.rows[0]?.id || id);
}
