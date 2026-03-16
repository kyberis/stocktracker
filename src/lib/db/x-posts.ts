import { randomUUID } from "crypto";
import type { InValue } from "@libsql/client";
import { ensureInitialized } from "./client";
import { str } from "./helpers";

export type XPostStatus = "pending" | "posted" | "failed" | "cancelled";

export interface ScheduledXPost {
  id: string;
  content: string;
  imageUrl: string;
  hashtags: string;
  scheduledAt: string;
  status: XPostStatus;
  postedAt: string;
  xPostId: string;
  errorMessage: string;
  createdAt: string;
}

export interface CreateXPostInput {
  content: string;
  imageUrl?: string;
  hashtags?: string;
  scheduledAt: string;
}

function rowToPost(row: Record<string, unknown>): ScheduledXPost {
  return {
    id: str(row.id),
    content: str(row.content),
    imageUrl: str(row.image_url),
    hashtags: str(row.hashtags),
    scheduledAt: str(row.scheduled_at),
    status: str(row.status) as XPostStatus,
    postedAt: str(row.posted_at),
    xPostId: str(row.x_post_id),
    errorMessage: str(row.error_message),
    createdAt: str(row.created_at),
  };
}

const COLS = "id, content, image_url, hashtags, scheduled_at, status, posted_at, x_post_id, error_message, created_at";

export async function listXPosts(): Promise<ScheduledXPost[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT ${COLS} FROM scheduled_x_posts ORDER BY scheduled_at ASC`,
    args: [],
  });
  return result.rows.map((r) => rowToPost(r as unknown as Record<string, unknown>));
}

export async function listDueXPosts(): Promise<ScheduledXPost[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT ${COLS} FROM scheduled_x_posts WHERE status = 'pending' AND scheduled_at <= datetime('now') ORDER BY scheduled_at ASC`,
    args: [],
  });
  return result.rows.map((r) => rowToPost(r as unknown as Record<string, unknown>));
}

export async function createXPost(input: CreateXPostInput): Promise<ScheduledXPost> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO scheduled_x_posts (id, content, image_url, hashtags, scheduled_at) VALUES (?, ?, ?, ?, ?)`,
    args: [id, input.content, input.imageUrl || "", input.hashtags || "", input.scheduledAt],
  });
  return {
    id,
    content: input.content,
    imageUrl: input.imageUrl || "",
    hashtags: input.hashtags || "",
    scheduledAt: input.scheduledAt,
    status: "pending",
    postedAt: "",
    xPostId: "",
    errorMessage: "",
    createdAt: new Date().toISOString(),
  };
}

export async function updateXPostStatus(
  id: string,
  status: XPostStatus,
  extra?: { xPostId?: string; errorMessage?: string },
): Promise<void> {
  const client = await ensureInitialized();
  const postedAt = status === "posted" ? new Date().toISOString() : "";
  await client.execute({
    sql: `UPDATE scheduled_x_posts SET status = ?, posted_at = CASE WHEN ? != '' THEN ? ELSE posted_at END, x_post_id = CASE WHEN ? != '' THEN ? ELSE x_post_id END, error_message = ? WHERE id = ?`,
    args: [status, postedAt, postedAt, extra?.xPostId || "", extra?.xPostId || "", extra?.errorMessage || "", id],
  });
}

export async function updateXPost(id: string, updates: Partial<CreateXPostInput>): Promise<void> {
  const client = await ensureInitialized();
  const sets: string[] = [];
  const args: InValue[] = [];

  if (updates.content !== undefined) { sets.push("content = ?"); args.push(updates.content); }
  if (updates.imageUrl !== undefined) { sets.push("image_url = ?"); args.push(updates.imageUrl); }
  if (updates.hashtags !== undefined) { sets.push("hashtags = ?"); args.push(updates.hashtags); }
  if (updates.scheduledAt !== undefined) { sets.push("scheduled_at = ?"); args.push(updates.scheduledAt); }

  if (sets.length === 0) return;
  args.push(id);
  await client.execute({
    sql: `UPDATE scheduled_x_posts SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteXPost(id: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({ sql: "DELETE FROM scheduled_x_posts WHERE id = ?", args: [id] });
}
