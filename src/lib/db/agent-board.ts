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
    priority: Number(row.priority) || 3,
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

export async function existingAgentBoardContextKeys(
  userId: string,
  contextKeys: string[],
): Promise<Set<string>> {
  if (contextKeys.length === 0) return new Set();
  const client = await ensureInitialized();
  const placeholders = contextKeys.map(() => "?").join(",");
  const result = await client.execute({
    sql: `SELECT context_key FROM agent_board_messages
          WHERE user_id = ? AND context_key IN (${placeholders})`,
    args: [userId, ...contextKeys],
  });
  return new Set(result.rows.map((r) => str(r.context_key)));
}

export async function insertAgentBoardMessage(args: {
  userId: string;
  agent: AgentBoardAgent;
  kind: AgentBoardKind;
  contextKey: string;
  body: string;
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
            ) VALUES (?, ?, ?, ?, ?, ?, '', '', ?, ?, ?)`,
      args: [
        id,
        args.userId,
        args.agent,
        args.kind,
        args.contextKey,
        args.body.slice(0, 600),
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
