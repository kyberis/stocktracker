import { ensureInitialized } from "./client";
import { str } from "./helpers";
import { generateId } from "@/lib/utils";

export type DreamTeamAgent = "warren" | "clara" | "will";
export type ThreadStatus = "active" | "minimized" | "closed" | "archived";
export type MessageRole = "user" | "assistant" | "system";

export interface DreamTeamThread {
  id: string;
  userId: string;
  agent: DreamTeamAgent;
  topic: string;
  status: ThreadStatus;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface DreamTeamMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  agent: DreamTeamAgent | null;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DreamTeamSchedule {
  id: string;
  userId: string;
  agent: DreamTeamAgent;
  prompt: string;
  cronExpr: string;
  timezone: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  createdAt: string;
}

export interface DreamTeamCrossCall {
  id: string;
  sourceMessageId: string;
  fromAgent: string;
  toAgent: string;
  query: string;
  response: string | null;
  status: "pending" | "completed" | "failed";
  durationMs: number | null;
  createdAt: string;
}

function parseAgent(val: unknown): DreamTeamAgent {
  const s = String(val || "warren");
  if (s === "clara" || s === "will") return s;
  return "warren";
}

function parseThreadStatus(val: unknown): ThreadStatus {
  const s = String(val || "active");
  if (s === "minimized" || s === "closed" || s === "archived") return s;
  return "active";
}

function parseRole(val: unknown): MessageRole {
  const s = String(val || "user");
  if (s === "assistant" || s === "system") return s;
  return "user";
}

function parseMetadata(val: unknown): Record<string, unknown> {
  if (val == null || val === "") return {};
  try {
    const parsed = JSON.parse(String(val));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function mapThread(r: Record<string, unknown>): DreamTeamThread {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    agent: parseAgent(r.agent),
    topic: str(r.topic),
    status: parseThreadStatus(r.status),
    messageCount: Number(r.message_count) || 0,
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
    lastMessage: r.last_message ? str(r.last_message) : undefined,
    lastMessageAt: r.last_message_at ? str(r.last_message_at) : undefined,
  };
}

function mapMessage(r: Record<string, unknown>): DreamTeamMessage {
  return {
    id: str(r.id),
    threadId: str(r.thread_id),
    role: parseRole(r.role),
    agent: r.agent ? parseAgent(r.agent) : null,
    content: str(r.content),
    metadata: parseMetadata(r.metadata),
    createdAt: str(r.created_at),
  };
}

function mapSchedule(r: Record<string, unknown>): DreamTeamSchedule {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    agent: parseAgent(r.agent),
    prompt: str(r.prompt),
    cronExpr: str(r.cron_expr),
    timezone: str(r.timezone),
    enabled: Number(r.enabled) === 1,
    lastRunAt: r.last_run_at ? str(r.last_run_at) : null,
    nextRunAt: str(r.next_run_at),
    createdAt: str(r.created_at),
  };
}

function mapCrossCall(r: Record<string, unknown>): DreamTeamCrossCall {
  return {
    id: str(r.id),
    sourceMessageId: str(r.source_message_id),
    fromAgent: str(r.from_agent),
    toAgent: str(r.to_agent),
    query: str(r.query),
    response: r.response ? str(r.response) : null,
    status: (["pending", "completed", "failed"] as const).includes(
      str(r.status) as "pending" | "completed" | "failed",
    )
      ? (str(r.status) as "pending" | "completed" | "failed")
      : "pending",
    durationMs: r.duration_ms != null ? Number(r.duration_ms) : null,
    createdAt: str(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

export async function listThreads(
  userId: string,
  status?: ThreadStatus,
): Promise<DreamTeamThread[]> {
  const client = await ensureInitialized();

  const where = status
    ? "WHERE t.user_id = ? AND t.status = ?"
    : "WHERE t.user_id = ?";
  const args = status ? [userId, status] : [userId];

  const result = await client.execute({
    sql: `SELECT t.*,
                 lm.content AS last_message,
                 lm.created_at AS last_message_at
          FROM dream_team_threads t
          LEFT JOIN dream_team_messages lm ON lm.id = (
            SELECT id FROM dream_team_messages
            WHERE thread_id = t.id
            ORDER BY created_at DESC LIMIT 1
          )
          ${where}
          ORDER BY t.updated_at DESC`,
    args,
  });
  return result.rows.map((r) => mapThread(r as Record<string, unknown>));
}

export async function createThread(
  userId: string,
  agent: DreamTeamAgent,
  topic: string,
): Promise<DreamTeamThread> {
  const client = await ensureInitialized();
  const id = generateId();
  await client.execute({
    sql: `INSERT INTO dream_team_threads (id, user_id, agent, topic) VALUES (?, ?, ?, ?)`,
    args: [id, userId, agent, topic],
  });
  return {
    id,
    userId,
    agent,
    topic,
    status: "active",
    messageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getThread(
  threadId: string,
  userId: string,
): Promise<DreamTeamThread | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT t.*,
                 lm.content AS last_message,
                 lm.created_at AS last_message_at
          FROM dream_team_threads t
          LEFT JOIN dream_team_messages lm ON lm.id = (
            SELECT id FROM dream_team_messages
            WHERE thread_id = t.id
            ORDER BY created_at DESC LIMIT 1
          )
          WHERE t.id = ? AND t.user_id = ?`,
    args: [threadId, userId],
  });
  if (result.rows.length === 0) return null;
  return mapThread(result.rows[0] as Record<string, unknown>);
}

export async function updateThreadStatus(
  threadId: string,
  userId: string,
  status: ThreadStatus,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE dream_team_threads SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
    args: [status, threadId, userId],
  });
}

export async function updateThreadTopic(
  threadId: string,
  topic: string,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE dream_team_threads SET topic = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [topic, threadId],
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function listMessages(
  threadId: string,
  limit?: number,
): Promise<DreamTeamMessage[]> {
  const client = await ensureInitialized();
  const sql = limit
    ? `SELECT * FROM dream_team_messages WHERE thread_id = ? ORDER BY created_at ASC LIMIT ?`
    : `SELECT * FROM dream_team_messages WHERE thread_id = ? ORDER BY created_at ASC`;
  const args = limit ? [threadId, limit] : [threadId];
  const result = await client.execute({ sql, args });
  return result.rows.map((r) => mapMessage(r as Record<string, unknown>));
}

export async function addMessage(
  threadId: string,
  role: MessageRole,
  content: string,
  agent?: DreamTeamAgent,
  metadata?: Record<string, unknown>,
): Promise<DreamTeamMessage> {
  const client = await ensureInitialized();
  const id = generateId();
  const metaJson = JSON.stringify(metadata ?? {});

  await client.execute({
    sql: `INSERT INTO dream_team_messages (id, thread_id, role, agent, content, metadata) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, threadId, role, agent ?? null, content, metaJson],
  });
  await client.execute({
    sql: `UPDATE dream_team_threads SET message_count = message_count + 1, updated_at = datetime('now') WHERE id = ?`,
    args: [threadId],
  });

  return {
    id,
    threadId,
    role,
    agent: agent ?? null,
    content,
    metadata: metadata ?? {},
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export async function listSchedules(
  userId: string,
): Promise<DreamTeamSchedule[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM dream_team_schedules WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows.map((r) => mapSchedule(r as Record<string, unknown>));
}

export async function createSchedule(
  userId: string,
  agent: DreamTeamAgent,
  prompt: string,
  cronExpr: string,
  timezone: string,
  nextRunAt: string,
): Promise<DreamTeamSchedule> {
  const client = await ensureInitialized();
  const id = generateId();
  await client.execute({
    sql: `INSERT INTO dream_team_schedules (id, user_id, agent, prompt, cron_expr, timezone, next_run_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, agent, prompt, cronExpr, timezone, nextRunAt],
  });
  return {
    id,
    userId,
    agent,
    prompt,
    cronExpr,
    timezone,
    enabled: true,
    lastRunAt: null,
    nextRunAt,
    createdAt: new Date().toISOString(),
  };
}

export async function updateSchedule(
  scheduleId: string,
  userId: string,
  updates: Partial<
    Pick<DreamTeamSchedule, "enabled" | "prompt" | "cronExpr" | "timezone" | "nextRunAt">
  >,
): Promise<void> {
  const client = await ensureInitialized();
  const sets: string[] = [];
  const args: (string | number)[] = [];

  if (updates.enabled !== undefined) {
    sets.push("enabled = ?");
    args.push(updates.enabled ? 1 : 0);
  }
  if (updates.prompt !== undefined) {
    sets.push("prompt = ?");
    args.push(updates.prompt);
  }
  if (updates.cronExpr !== undefined) {
    sets.push("cron_expr = ?");
    args.push(updates.cronExpr);
  }
  if (updates.timezone !== undefined) {
    sets.push("timezone = ?");
    args.push(updates.timezone);
  }
  if (updates.nextRunAt !== undefined) {
    sets.push("next_run_at = ?");
    args.push(updates.nextRunAt);
  }

  if (sets.length === 0) return;
  args.push(scheduleId, userId);

  await client.execute({
    sql: `UPDATE dream_team_schedules SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function deleteSchedule(
  scheduleId: string,
  userId: string,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `DELETE FROM dream_team_schedules WHERE id = ? AND user_id = ?`,
    args: [scheduleId, userId],
  });
}

export async function getDueSchedules(
  now: string,
): Promise<(DreamTeamSchedule & { userId: string })[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM dream_team_schedules WHERE enabled = 1 AND next_run_at <= ?`,
    args: [now],
  });
  return result.rows.map((r) => mapSchedule(r as Record<string, unknown>) as DreamTeamSchedule & { userId: string });
}

export async function markScheduleRun(
  scheduleId: string,
  nextRunAt: string,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE dream_team_schedules SET last_run_at = datetime('now'), next_run_at = ? WHERE id = ?`,
    args: [nextRunAt, scheduleId],
  });
}

// ---------------------------------------------------------------------------
// Cross-calls
// ---------------------------------------------------------------------------

export async function addCrossCall(
  sourceMessageId: string,
  fromAgent: string,
  toAgent: string,
  query: string,
): Promise<string> {
  const client = await ensureInitialized();
  const id = generateId();
  await client.execute({
    sql: `INSERT INTO dream_team_cross_calls (id, source_message_id, from_agent, to_agent, query) VALUES (?, ?, ?, ?, ?)`,
    args: [id, sourceMessageId, fromAgent, toAgent, query],
  });
  return id;
}

export async function completeCrossCall(
  crossCallId: string,
  response: string,
  durationMs: number,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE dream_team_cross_calls SET status = 'completed', response = ?, duration_ms = ? WHERE id = ?`,
    args: [response, durationMs, crossCallId],
  });
}

export async function failCrossCall(
  crossCallId: string,
  durationMs: number,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE dream_team_cross_calls SET status = 'failed', duration_ms = ? WHERE id = ?`,
    args: [durationMs, crossCallId],
  });
}
