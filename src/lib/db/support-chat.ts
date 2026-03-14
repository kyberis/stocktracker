import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

export type SupportChatStatus = "active" | "resolved" | "escalated";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SupportChatConversation {
  id: string;
  userId: string;
  username: string;
  email: string;
  plan: string;
  messages: ChatMessage[];
  status: SupportChatStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SupportChatListItem {
  id: string;
  userId: string;
  username: string;
  email: string;
  plan: string;
  status: SupportChatStatus;
  messageCount: number;
  firstMessage: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

function parseStatus(val: unknown): SupportChatStatus {
  const s = String(val || "active");
  if (s === "resolved" || s === "escalated") return s;
  return "active";
}

function parseMessages(val: unknown): ChatMessage[] {
  try {
    const parsed = JSON.parse(String(val || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createSupportChatConversation(
  id: string,
  userId: string,
  initialMessages: ChatMessage[]
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT INTO support_chat_conversations (id, user_id, messages)
          VALUES (?, ?, ?)`,
    args: [id, userId, JSON.stringify(initialMessages)],
  });
}

export async function appendSupportChatMessages(
  id: string,
  newMessages: ChatMessage[]
): Promise<void> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT messages FROM support_chat_conversations WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return;

  const existing = parseMessages(result.rows[0].messages);
  const updated = [...existing, ...newMessages];
  await client.execute({
    sql: `UPDATE support_chat_conversations
          SET messages = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [JSON.stringify(updated), id],
  });
}

export async function updateSupportChatStatus(
  id: string,
  status: SupportChatStatus
): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE support_chat_conversations
          SET status = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [status, id],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function getSupportChatConversation(
  id: string
): Promise<SupportChatConversation | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT c.*, u.username, u.email, u.plan
          FROM support_chat_conversations c
          JOIN users u ON u.id = c.user_id
          WHERE c.id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: str(r.id),
    userId: str(r.user_id),
    username: str(r.username),
    email: str(r.email),
    plan: str(r.plan),
    messages: parseMessages(r.messages),
    status: parseStatus(r.status),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export interface ListSupportChatOptions {
  status?: SupportChatStatus | "all";
  userId?: string;
  limit?: number;
  offset?: number;
}

export async function listSupportChatConversations(
  options: ListSupportChatOptions = {}
): Promise<{ conversations: SupportChatListItem[]; total: number }> {
  const client = await ensureInitialized();
  const { status = "all", userId, limit = 20, offset = 0 } = options;

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (status !== "all") {
    conditions.push("c.status = ?");
    args.push(status);
  }
  if (userId) {
    conditions.push("c.user_id = ?");
    args.push(userId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM support_chat_conversations c ${where}`,
    args,
  });
  const total = num(countResult.rows[0]?.cnt);

  const rows = await client.execute({
    sql: `SELECT c.*, u.username, u.email, u.plan
          FROM support_chat_conversations c
          JOIN users u ON u.id = c.user_id
          ${where}
          ORDER BY c.updated_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  const conversations: SupportChatListItem[] = rows.rows.map((r) => {
    const messages = parseMessages(r.messages);
    const firstUserMsg = messages.find((m) => m.role === "user");
    const lastMsg = messages[messages.length - 1];
    return {
      id: str(r.id),
      userId: str(r.user_id),
      username: str(r.username),
      email: str(r.email),
      plan: str(r.plan),
      status: parseStatus(r.status),
      messageCount: messages.length,
      firstMessage: firstUserMsg?.content.slice(0, 200) || "",
      lastMessage: lastMsg?.content.slice(0, 200) || "",
      createdAt: str(r.created_at),
      updatedAt: str(r.updated_at),
    };
  });

  return { conversations, total };
}

export async function purgeSupportChatConversations(
  retentionDays: number
): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `DELETE FROM support_chat_conversations
          WHERE created_at < datetime('now', ? || ' days')`,
    args: [`-${retentionDays}`],
  });
  return result.rowsAffected ?? 0;
}
