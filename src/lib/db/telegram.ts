import { randomUUID, randomBytes } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";

/** One-time deep-link token (TTL 15 min) used to bind a Telegram chat to a user. */
export interface TelegramLinkToken {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

/** Permanent link between a Telegram chat and a trefolio user. */
export interface TelegramChatLink {
  chatId: string;
  userId: string;
  languageCode: string;
  linkedAt: string;
  lastSeenAt: string;
  lastActivePortfolioId: string;
}

export type TelegramProposalStatus = "pending" | "confirmed" | "cancelled" | "expired";

/** A Warren write proposal awaiting a Confirm/Cancel tap from the Telegram user. */
export interface TelegramProposalRecord {
  id: string;
  chatId: string;
  userId: string;
  kind: string;
  dataJson: string;
  summary: string;
  createdAt: string;
  expiresAt: string;
  status: TelegramProposalStatus;
}

export type TelegramMessageRole = "user" | "assistant";

export interface TelegramMessageRow {
  id: string;
  chatId: string;
  role: TelegramMessageRole;
  content: string;
  createdAt: string;
}

const LINK_TOKEN_TTL_MS = 15 * 60_000; // 15 min
const PROPOSAL_TTL_MS = 30 * 60_000; // 30 min
const MAX_HISTORY_MESSAGES = 20;

/**
 * Generate a fresh one-time link token (URL-safe). The user_id can be looked up
 * in `consumeLinkToken` exactly once.
 */
export async function createLinkToken(userId: string): Promise<TelegramLinkToken> {
  const client = await ensureInitialized();
  const token = randomBytes(18).toString("base64url");
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS).toISOString();
  // Wipe any prior pending tokens for this user so only one is valid at a time.
  await client.execute({
    sql: "DELETE FROM telegram_link_tokens WHERE user_id = ?",
    args: [userId],
  });
  await client.execute({
    sql: "INSERT INTO telegram_link_tokens (token, user_id, expires_at) VALUES (?, ?, ?)",
    args: [token, userId, expiresAt],
  });
  return { token, userId, createdAt: new Date().toISOString(), expiresAt };
}

/**
 * Validate and consume a token. Returns the user_id once; subsequent calls
 * with the same token return null (token is deleted on use).
 */
export async function consumeLinkToken(token: string): Promise<string | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT user_id, expires_at FROM telegram_link_tokens WHERE token = ?",
    args: [token],
  });
  const row = result.rows[0];
  if (!row) return null;
  await client.execute({
    sql: "DELETE FROM telegram_link_tokens WHERE token = ?",
    args: [token],
  });
  const expiresAt = str(row.expires_at);
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return null;
  return str(row.user_id);
}

export async function purgeExpiredLinkTokens(): Promise<void> {
  const client = await ensureInitialized();
  await client.execute("DELETE FROM telegram_link_tokens WHERE expires_at < datetime('now')");
}

/** Persist a Telegram chat <-> user binding. Idempotent on chat_id and user_id. */
export async function linkChat(input: {
  chatId: string;
  userId: string;
  languageCode?: string;
}): Promise<void> {
  const client = await ensureInitialized();
  // Each user has at most one linked chat — if there was a previous one, replace.
  await client.execute({
    sql: "DELETE FROM telegram_chats WHERE user_id = ? AND chat_id != ?",
    args: [input.userId, input.chatId],
  });
  await client.execute({
    sql: `INSERT INTO telegram_chats (chat_id, user_id, language_code, last_seen_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(chat_id) DO UPDATE SET
            user_id = excluded.user_id,
            language_code = excluded.language_code,
            last_seen_at = datetime('now')`,
    args: [input.chatId, input.userId, input.languageCode || ""],
  });
  // Mirror the chat id into user_settings so the alert dispatcher (which
  // reads telegram_chat_id from user_settings) also knows about the chat.
  // Without this, users connecting from "Profile → Connect Telegram" can chat
  // with Warren but never receive price alerts on Telegram.
  await client.execute({
    sql: "UPDATE user_settings SET telegram_chat_id = '', telegram_link_token = '', telegram_link_expires_at = '' WHERE telegram_chat_id = ? AND user_id != ?",
    args: [input.chatId, input.userId],
  });
  await client.execute({
    sql: "UPDATE user_settings SET telegram_chat_id = ?, telegram_link_token = '', telegram_link_expires_at = '' WHERE user_id = ?",
    args: [input.chatId, input.userId],
  });
}

export async function unlinkChat(chatId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "DELETE FROM telegram_chats WHERE chat_id = ?",
    args: [chatId],
  });
  await client.execute({
    sql: "DELETE FROM telegram_messages WHERE chat_id = ?",
    args: [chatId],
  });
  await client.execute({
    sql: "DELETE FROM telegram_proposals WHERE chat_id = ?",
    args: [chatId],
  });
  // Clear the alert-dispatcher mirror so price alerts stop targeting this chat.
  await client.execute({
    sql: "UPDATE user_settings SET telegram_chat_id = '', telegram_link_token = '', telegram_link_expires_at = '' WHERE telegram_chat_id = ?",
    args: [chatId],
  });
}

export async function unlinkChatByUser(userId: string): Promise<void> {
  const client = await ensureInitialized();
  const r = await client.execute({
    sql: "SELECT chat_id FROM telegram_chats WHERE user_id = ?",
    args: [userId],
  });
  for (const row of r.rows) {
    await unlinkChat(str(row.chat_id));
  }
}

export async function getChatLinkByChatId(chatId: string): Promise<TelegramChatLink | null> {
  const client = await ensureInitialized();
  const r = await client.execute({
    sql: "SELECT * FROM telegram_chats WHERE chat_id = ?",
    args: [chatId],
  });
  const row = r.rows[0];
  if (!row) return null;
  return rowToChatLink(row);
}

export async function getChatLinkByUserId(userId: string): Promise<TelegramChatLink | null> {
  const client = await ensureInitialized();
  const r = await client.execute({
    sql: "SELECT * FROM telegram_chats WHERE user_id = ? LIMIT 1",
    args: [userId],
  });
  const row = r.rows[0];
  if (!row) return null;
  return rowToChatLink(row);
}

export async function touchChatLastSeen(chatId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE telegram_chats SET last_seen_at = datetime('now') WHERE chat_id = ?",
    args: [chatId],
  });
}

export async function setChatActivePortfolio(chatId: string, portfolioId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE telegram_chats SET last_active_portfolio_id = ? WHERE chat_id = ?",
    args: [portfolioId, chatId],
  });
}

export async function setChatLanguage(chatId: string, languageCode: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE telegram_chats SET language_code = ? WHERE chat_id = ?",
    args: [languageCode, chatId],
  });
}

/** Persist a Warren proposal so the Confirm/Cancel callback can recover it. */
export async function savePendingProposal(input: {
  chatId: string;
  userId: string;
  kind: string;
  data: unknown;
  summary?: string;
}): Promise<TelegramProposalRecord> {
  const client = await ensureInitialized();
  const id = randomBytes(8).toString("base64url"); // 11 chars — fits Telegram's 64-byte callback_data budget
  const expiresAt = new Date(Date.now() + PROPOSAL_TTL_MS).toISOString();
  const dataJson = JSON.stringify(input.data ?? {});
  const summary = (input.summary || "").slice(0, 500);
  await client.execute({
    sql: `INSERT INTO telegram_proposals (id, chat_id, user_id, kind, data_json, summary, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, input.chatId, input.userId, input.kind, dataJson, summary, expiresAt],
  });
  return {
    id,
    chatId: input.chatId,
    userId: input.userId,
    kind: input.kind,
    dataJson,
    summary,
    createdAt: new Date().toISOString(),
    expiresAt,
    status: "pending",
  };
}

export async function getPendingProposal(id: string): Promise<TelegramProposalRecord | null> {
  const client = await ensureInitialized();
  const r = await client.execute({
    sql: "SELECT * FROM telegram_proposals WHERE id = ?",
    args: [id],
  });
  const row = r.rows[0];
  if (!row) return null;
  return rowToProposal(row);
}

export async function updateProposalStatus(
  id: string,
  status: TelegramProposalStatus,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE telegram_proposals SET status = ? WHERE id = ?",
    args: [status, id],
  });
}

export async function purgeExpiredProposals(): Promise<void> {
  const client = await ensureInitialized();
  await client.execute("DELETE FROM telegram_proposals WHERE expires_at < datetime('now')");
}

/** Append a message to the rolling history for this chat, keeping the latest N. */
export async function appendChatMessage(input: {
  chatId: string;
  role: TelegramMessageRole;
  content: string;
}): Promise<void> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const trimmed = (input.content || "").slice(0, 4000);
  await client.execute({
    sql: "INSERT INTO telegram_messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)",
    args: [id, input.chatId, input.role, trimmed],
  });
  // Trim history to MAX_HISTORY_MESSAGES newest entries.
  await client.execute({
    sql: `DELETE FROM telegram_messages
          WHERE chat_id = ?
            AND id NOT IN (
              SELECT id FROM telegram_messages
              WHERE chat_id = ?
              ORDER BY created_at DESC, id DESC
              LIMIT ?
            )`,
    args: [input.chatId, input.chatId, MAX_HISTORY_MESSAGES],
  });
}

export async function loadChatMessages(
  chatId: string,
  limit = MAX_HISTORY_MESSAGES,
): Promise<TelegramMessageRow[]> {
  const client = await ensureInitialized();
  const r = await client.execute({
    sql: `SELECT id, chat_id, role, content, created_at
          FROM telegram_messages
          WHERE chat_id = ?
          ORDER BY created_at ASC, id ASC
          LIMIT ?`,
    args: [chatId, limit],
  });
  return r.rows.map((row) => ({
    id: str(row.id),
    chatId: str(row.chat_id),
    role: (str(row.role) === "assistant" ? "assistant" : "user") as TelegramMessageRole,
    content: str(row.content),
    createdAt: str(row.created_at),
  }));
}

export async function clearChatHistory(chatId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "DELETE FROM telegram_messages WHERE chat_id = ?",
    args: [chatId],
  });
}

function rowToChatLink(row: Record<string, unknown>): TelegramChatLink {
  return {
    chatId: str(row.chat_id),
    userId: str(row.user_id),
    languageCode: str(row.language_code),
    linkedAt: str(row.linked_at),
    lastSeenAt: str(row.last_seen_at),
    lastActivePortfolioId: str(row.last_active_portfolio_id),
  };
}

function rowToProposal(row: Record<string, unknown>): TelegramProposalRecord {
  const status = str(row.status) as TelegramProposalStatus;
  return {
    id: str(row.id),
    chatId: str(row.chat_id),
    userId: str(row.user_id),
    kind: str(row.kind),
    dataJson: str(row.data_json),
    summary: str(row.summary),
    createdAt: str(row.created_at),
    expiresAt: str(row.expires_at),
    status: ["pending", "confirmed", "cancelled", "expired"].includes(status)
      ? status
      : "pending",
  };
}
