import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";
import type { AgentMissionStep, AgentMissionStepStatus, AgentMissionStatus } from "@/lib/ai/office/types";
import type { AgentMissionRecord } from "@/lib/ai/office/types";

function parseSteps(raw: string): AgentMissionStep[] {
  try {
    const parsed = JSON.parse(raw) as AgentMissionStep[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToMission(r: Record<string, unknown>): AgentMissionRecord {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    title: str(r.title),
    description: str(r.description),
    status: str(r.status) as AgentMissionStatus,
    steps: parseSteps(str(r.steps_json)),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export async function listActiveAgentMissions(userId: string): Promise<AgentMissionRecord[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM agent_missions WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC`,
    args: [userId],
  });
  return result.rows.map((r) => rowToMission(r as Record<string, unknown>));
}

export async function getAgentMissionById(
  userId: string,
  missionId: string,
): Promise<AgentMissionRecord | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM agent_missions WHERE user_id = ? AND id = ? LIMIT 1",
    args: [userId, missionId],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? rowToMission(row) : null;
}

export async function createAgentMission(
  userId: string,
  input: { title: string; description: string; steps: AgentMissionStep[] },
): Promise<AgentMissionRecord> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO agent_missions (id, user_id, title, description, status, steps_json)
          VALUES (?, ?, ?, ?, 'active', ?)`,
    args: [id, userId, input.title, input.description, JSON.stringify(input.steps)],
  });
  const row = await getAgentMissionById(userId, id);
  if (!row) throw new Error("createAgentMission: row missing");
  return row;
}

export async function updateAgentMissionSteps(
  userId: string,
  missionId: string,
  steps: AgentMissionStep[],
  status: AgentMissionStatus,
): Promise<AgentMissionRecord | null> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE agent_missions SET steps_json = ?, status = ?, updated_at = datetime('now')
          WHERE user_id = ? AND id = ?`,
    args: [JSON.stringify(steps), status, userId, missionId],
  });
  return getAgentMissionById(userId, missionId);
}

export interface OfficeMessageRow {
  id: string;
  userId: string;
  role: string;
  content: string;
  createdAt: string;
}

export async function listOfficeMessages(userId: string, limit = 80): Promise<OfficeMessageRow[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM agent_office_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: str(row.id),
      userId: str(row.user_id),
      role: str(row.role),
      content: str(row.content),
      createdAt: str(row.created_at),
    };
  });
}

export async function appendOfficeMessage(
  userId: string,
  role: string,
  content: string,
): Promise<OfficeMessageRow> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO agent_office_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)`,
    args: [id, userId, role, content.slice(0, 12_000)],
  });
  return { id, userId, role, content, createdAt: new Date().toISOString() };
}

export async function clearOfficeSession(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "DELETE FROM agent_office_messages WHERE user_id = ?",
    args: [userId],
  });
}
