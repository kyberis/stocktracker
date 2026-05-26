import { randomUUID } from "crypto";

import type { ProdOpsEventType, ProdOpsOutboxEvent } from "@/lib/types";

import { ensureInitialized } from "./client";
import { num, str } from "./helpers";

export interface CreateProdOpsEventInput {
  eventType: ProdOpsEventType;
  userId: string;
  dedupeKey: string;
  summary: string;
  adminUrl: string;
  payload: Record<string, unknown>;
  sourceApp?: "trefolio";
}

function mapRow(row: import("@libsql/client").Row): ProdOpsOutboxEvent {
  return {
    id: str(row.id),
    eventType: str(row.event_type) as ProdOpsEventType,
    userId: str(row.user_id),
    dedupeKey: str(row.dedupe_key),
    sourceApp: (str(row.source_app) || "trefolio") as "trefolio",
    summary: str(row.summary),
    adminUrl: str(row.admin_url),
    payloadJson: str(row.payload_json),
    status: (str(row.status) || "pending") as ProdOpsOutboxEvent["status"],
    attempts: num(row.attempts),
    nextAttemptAt: str(row.next_attempt_at),
    lastAttemptedAt: str(row.last_attempted_at),
    lastError: str(row.last_error),
    sentAt: str(row.sent_at),
    createdAt: str(row.created_at),
  };
}

export async function getProdOpsEventById(id: string): Promise<ProdOpsOutboxEvent | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, event_type, user_id, dedupe_key, source_app, summary, admin_url,
                 payload_json, status, attempts, next_attempt_at, last_attempted_at,
                 last_error, sent_at, created_at
          FROM ops_event_outbox
          WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function getProdOpsEventByDedupeKey(dedupeKey: string): Promise<ProdOpsOutboxEvent | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, event_type, user_id, dedupe_key, source_app, summary, admin_url,
                 payload_json, status, attempts, next_attempt_at, last_attempted_at,
                 last_error, sent_at, created_at
          FROM ops_event_outbox
          WHERE dedupe_key = ?`,
    args: [dedupeKey],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function createProdOpsEvent(input: CreateProdOpsEventInput): Promise<ProdOpsOutboxEvent> {
  const existing = await getProdOpsEventByDedupeKey(input.dedupeKey);
  if (existing) return existing;

  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO ops_event_outbox (
            id, event_type, user_id, dedupe_key, source_app, summary, admin_url, payload_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.eventType,
      input.userId,
      input.dedupeKey,
      input.sourceApp || "trefolio",
      input.summary,
      input.adminUrl,
      JSON.stringify(input.payload),
    ],
  });

  return {
    id,
    eventType: input.eventType,
    userId: input.userId,
    dedupeKey: input.dedupeKey,
    sourceApp: input.sourceApp || "trefolio",
    summary: input.summary,
    adminUrl: input.adminUrl,
    payloadJson: JSON.stringify(input.payload),
    status: "pending",
    attempts: 0,
    nextAttemptAt: new Date().toISOString(),
    lastAttemptedAt: "",
    lastError: "",
    sentAt: "",
    createdAt: new Date().toISOString(),
  };
}

export async function listProdOpsEventsReady(limit: number): Promise<ProdOpsOutboxEvent[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, event_type, user_id, dedupe_key, source_app, summary, admin_url,
                 payload_json, status, attempts, next_attempt_at, last_attempted_at,
                 last_error, sent_at, created_at
          FROM ops_event_outbox
          WHERE status = 'pending'
            AND datetime(next_attempt_at) <= datetime('now')
          ORDER BY created_at ASC
          LIMIT ?`,
    args: [limit],
  });
  return result.rows.map(mapRow);
}

export async function markProdOpsEventSent(id: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE ops_event_outbox
          SET status = 'sent',
              attempts = attempts + 1,
              last_attempted_at = datetime('now'),
              last_error = '',
              sent_at = datetime('now')
          WHERE id = ?`,
    args: [id],
  });
}

export async function scheduleProdOpsEventRetry(
  id: string,
  errorMessage: string,
  nextAttemptAt: string,
  dead = false,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE ops_event_outbox
          SET status = ?,
              attempts = attempts + 1,
              last_attempted_at = datetime('now'),
              last_error = ?,
              next_attempt_at = ?
          WHERE id = ?`,
    args: [dead ? "dead" : "pending", errorMessage.slice(0, 1000), nextAttemptAt, id],
  });
}

export async function markProdOpsEventDropped(id: string, reason: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE ops_event_outbox
          SET status = 'dropped',
              last_attempted_at = datetime('now'),
              last_error = ?
          WHERE id = ?`,
    args: [reason.slice(0, 1000), id],
  });
}

export async function listRecentProdOpsEvents(limit = 20): Promise<ProdOpsOutboxEvent[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, event_type, user_id, dedupe_key, source_app, summary, admin_url,
                 payload_json, status, attempts, next_attempt_at, last_attempted_at,
                 last_error, sent_at, created_at
          FROM ops_event_outbox
          ORDER BY created_at DESC
          LIMIT ?`,
    args: [limit],
  });
  return result.rows.map(mapRow);
}
