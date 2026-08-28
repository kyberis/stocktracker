import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";
import type { AgentBoardAgent, AgentBoardKind, AgentBoardMessage } from "@/lib/agent-board/types";

function rowToMessage(row: Record<string, unknown>): AgentBoardMessage {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    agent: str(row.agent) as AgentBoardAgent,
    kind: str(row.kind) as AgentBoardKind,
    contextKey: str(row.context_key),
    body: str(row.body),
    chipLabel: str(row.chip_label),
    chipPrompt: str(row.chip_prompt),
    priority: Number(row.priority) || 3,
    readAt: str(row.read_at) || null,
    dismissedAt: str(row.dismissed_at) || null,
    createdAt: str(row.created_at),
    expiresAt: str(row.expires_at) || null,
  };
}

export async function listAgentBoardMessages(
  userId: string,
  limit = 20,
): Promise<AgentBoardMessage[]> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `SELECT * FROM agent_board_messages
          WHERE user_id = ?
            AND dismissed_at = ''
            AND (expires_at = '' OR expires_at > ?)
          ORDER BY priority ASC, created_at DESC
          LIMIT ?`,
    args: [userId, now, limit],
  });
  return result.rows.map((r) => rowToMessage(r as Record<string, unknown>));
}

export async function listAgentBoardMessagesForComposer(
  userId: string,
  limit = 15,
): Promise<AgentBoardMessage[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM agent_board_messages
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows.map((r) => rowToMessage(r as Record<string, unknown>));
}

export async function countAgentBoardMessagesToday(userId: string): Promise<number> {
  const client = await ensureInitialized();
  const today = new Date().toISOString().slice(0, 10);
  const result = await client.execute({
    sql: `SELECT COUNT(*) AS c FROM agent_board_messages
          WHERE user_id = ? AND created_at >= ?`,
    args: [userId, today],
  });
  return Number(result.rows[0]?.c ?? 0);
}

export async function hasAgentBoardContextKey(userId: string, contextKey: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT 1 FROM agent_board_messages WHERE user_id = ? AND context_key = ? LIMIT 1",
    args: [userId, contextKey],
  });
  return result.rows.length > 0;
}

export async function insertAgentBoardMessage(args: {
  userId: string;
  agent: AgentBoardAgent;
  kind: AgentBoardKind;
  contextKey: string;
  body: string;
  chipLabel?: string;
  chipPrompt?: string;
  priority?: number;
  expiresAt?: string;
  signalsJson?: string;
}): Promise<AgentBoardMessage | null> {
  const client = await ensureInitialized();
  const id = randomUUID();
  try {
    await client.execute({
      sql: `INSERT INTO agent_board_messages (
              id, user_id, agent, kind, context_key, body, chip_label, chip_prompt,
              priority, expires_at, signals_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        args.userId,
        args.agent,
        args.kind,
        args.contextKey,
        args.body.slice(0, 600),
        args.chipLabel?.slice(0, 120) ?? "",
        args.chipPrompt?.slice(0, 500) ?? "",
        args.priority ?? 3,
        args.expiresAt ?? "",
        args.signalsJson ?? "{}",
      ],
    });
  } catch {
    return null;
  }
  const result = await client.execute({
    sql: "SELECT * FROM agent_board_messages WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? rowToMessage(row) : null;
}

export async function markAgentBoardMessageRead(userId: string, messageId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `UPDATE agent_board_messages SET read_at = ?
          WHERE id = ? AND user_id = ? AND read_at = ''`,
    args: [now, messageId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function dismissAgentBoardMessage(userId: string, messageId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `UPDATE agent_board_messages SET dismissed_at = ?
          WHERE id = ? AND user_id = ? AND dismissed_at = ''`,
    args: [now, messageId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function purgeExpiredAgentBoardMessages(): Promise<number> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `DELETE FROM agent_board_messages
          WHERE expires_at != '' AND expires_at < ?`,
    args: [now],
  });
  return result.rowsAffected ?? 0;
}

export async function listAgentBoardCronCandidates(
  activeWithinDays = 7,
): Promise<Array<{ userId: string; email: string }>> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT us.user_id AS user_id, u.email AS email
          FROM user_settings us
          INNER JOIN users u ON u.id = us.user_id
          WHERE us.agent_board_enabled = 1
            AND u.last_active_at != ''
            AND datetime(u.last_active_at) >= datetime('now', ?)
          ORDER BY us.user_id`,
    args: [`-${activeWithinDays} days`],
  });
  return result.rows.map((r) => ({
    userId: str(r.user_id),
    email: str(r.email),
  }));
}
