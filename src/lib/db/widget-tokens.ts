import { randomUUID, randomBytes, createHash } from "crypto";
import { encrypt, decrypt } from "@/lib/crypto";
import { ensureInitialized } from "./client";
import { rowToDbUser, type DbUser } from "./helpers";

export type WidgetTokenListItem = {
  id: string;
  prefix: string;
  createdAt: string;
  revokedAt: string;
  copyable: boolean;
};

function hashWidgetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function widgetTokenPrefix(token: string): string {
  if (token.length <= 16) return token;
  return `${token.slice(0, 12)}…${token.slice(-4)}`;
}

async function syncLegacyWidgetTokenHash(userId: string): Promise<void> {
  const client = await ensureInitialized();
  const latest = await client.execute({
    sql: `SELECT token_hash FROM widget_tokens
          WHERE user_id = ? AND revoked_at = ''
          ORDER BY created_at DESC
          LIMIT 1`,
    args: [userId],
  });
  const hash = latest.rows.length > 0 ? String(latest.rows[0].token_hash) : "";
  await client.execute({
    sql: "UPDATE users SET widget_token_hash = ? WHERE id = ?",
    args: [hash, userId],
  });
}

export async function generateWidgetToken(userId: string): Promise<string> {
  const client = await ensureInitialized();
  const token = `tfw_${randomBytes(24).toString("hex")}`;
  const hash = hashWidgetToken(token);
  const id = randomUUID();

  await client.execute({
    sql: `INSERT INTO widget_tokens
          (id, user_id, token_hash, token_encrypted, token_prefix, created_at, revoked_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), '')`,
    args: [id, userId, hash, encrypt(token), widgetTokenPrefix(token)],
  });
  await syncLegacyWidgetTokenHash(userId);
  return token;
}

export async function listWidgetTokens(userId: string): Promise<WidgetTokenListItem[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, token_prefix, created_at, revoked_at, token_encrypted
          FROM widget_tokens
          WHERE user_id = ?
          ORDER BY created_at DESC`,
    args: [userId],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    prefix: String(row.token_prefix),
    createdAt: String(row.created_at),
    revokedAt: String(row.revoked_at ?? ""),
    copyable: !!String(row.token_encrypted ?? ""),
  }));
}

export async function getLatestValidWidgetToken(userId: string): Promise<string | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT token_encrypted FROM widget_tokens
          WHERE user_id = ? AND revoked_at = '' AND token_encrypted != ''
          ORDER BY created_at DESC
          LIMIT 1`,
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  const encrypted = String(result.rows[0].token_encrypted ?? "");
  if (!encrypted) return null;
  try {
    return decrypt(encrypted);
  } catch {
    return null;
  }
}

export async function userHasActiveWidgetToken(userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT 1 FROM widget_tokens
          WHERE user_id = ? AND revoked_at = ''
          LIMIT 1`,
    args: [userId],
  });
  return result.rows.length > 0;
}

export async function revokeWidgetToken(userId: string, tokenId?: string): Promise<void> {
  const client = await ensureInitialized();
  if (tokenId) {
    await client.execute({
      sql: `UPDATE widget_tokens SET revoked_at = datetime('now')
            WHERE id = ? AND user_id = ? AND revoked_at = ''`,
      args: [tokenId, userId],
    });
  } else {
    await client.execute({
      sql: `UPDATE widget_tokens SET revoked_at = datetime('now')
            WHERE user_id = ? AND revoked_at = ''`,
      args: [userId],
    });
  }
  await syncLegacyWidgetTokenHash(userId);
}

export async function findUserByWidgetToken(token: string): Promise<DbUser | null> {
  const normalized = token?.trim() ?? "";
  if (!normalized || !normalized.startsWith("tfw_")) return null;

  const client = await ensureInitialized();
  const hash = hashWidgetToken(normalized);

  const fromTable = await client.execute({
    sql: `SELECT u.* FROM users u
          INNER JOIN widget_tokens wt ON wt.user_id = u.id
          WHERE wt.token_hash = ? AND wt.revoked_at = ''
          LIMIT 1`,
    args: [hash],
  });
  if (fromTable.rows.length > 0) {
    return rowToDbUser(fromTable.rows[0]);
  }

  const legacy = await client.execute({
    sql: "SELECT * FROM users WHERE widget_token_hash = ?",
    args: [hash],
  });
  if (legacy.rows.length === 0) return null;
  return rowToDbUser(legacy.rows[0]);
}
