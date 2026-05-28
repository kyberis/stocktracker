import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import type { AidFinPulseSummary, AidSocialPostRow } from "@/lib/types";

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function rowToPost(row: Record<string, unknown>): AidSocialPostRow {
  return {
    id: str(row.id),
    handle: str(row.handle),
    postKey: str(row.post_key),
    sourceUrl: str(row.source_url),
    publishedAt: str(row.published_at),
    headline: str(row.headline),
    summaryJson: str(row.summary_json),
    tickersJson: str(row.tickers_json),
    tagsJson: str(row.tags_json),
    fetchedAt: str(row.fetched_at),
    expiresAt: str(row.expires_at),
  };
}

export function parseFinPulseSummary(json: string): AidFinPulseSummary | null {
  try {
    const parsed = JSON.parse(json) as AidFinPulseSummary;
    if (!parsed?.headline || !Array.isArray(parsed.bullets)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getAidSocialPost(
  handle: string,
  postKey: string,
): Promise<AidSocialPostRow | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, handle, post_key, source_url, published_at, headline, summary_json, tickers_json, tags_json, fetched_at, expires_at
          FROM aid_social_posts WHERE handle = ? AND post_key = ? LIMIT 1`,
    args: [handle.toLowerCase(), postKey],
  });
  if (result.rows.length === 0) return null;
  const row = rowToPost(result.rows[0] as Record<string, unknown>);
  if (row.expiresAt && row.expiresAt < new Date().toISOString()) return null;
  return row;
}

export async function listAidSocialPosts(limit = 40): Promise<AidSocialPostRow[]> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `SELECT id, handle, post_key, source_url, published_at, headline, summary_json, tickers_json, tags_json, fetched_at, expires_at
          FROM aid_social_posts
          WHERE expires_at = '' OR expires_at > ?
          ORDER BY fetched_at DESC
          LIMIT ?`,
    args: [now, limit],
  });
  return result.rows.map((r) => rowToPost(r as Record<string, unknown>));
}

export async function listAidSocialPostsSince(sinceIso: string, limit = 40): Promise<AidSocialPostRow[]> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `SELECT id, handle, post_key, source_url, published_at, headline, summary_json, tickers_json, tags_json, fetched_at, expires_at
          FROM aid_social_posts
          WHERE fetched_at > ? AND (expires_at = '' OR expires_at > ?)
          ORDER BY fetched_at DESC
          LIMIT ?`,
    args: [sinceIso, now, limit],
  });
  return result.rows.map((r) => rowToPost(r as Record<string, unknown>));
}

export async function upsertAidSocialPost(args: {
  handle: string;
  postKey: string;
  sourceUrl: string;
  publishedAt: string;
  headline: string;
  summary: AidFinPulseSummary;
  tickers: string[];
  tags: string[];
  expiresAt: string;
}): Promise<AidSocialPostRow> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const handle = args.handle.toLowerCase().replace(/^@/, "");
  await client.execute({
    sql: `INSERT INTO aid_social_posts (id, handle, post_key, source_url, published_at, headline, summary_json, tickers_json, tags_json, fetched_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
          ON CONFLICT(handle, post_key) DO UPDATE SET
            source_url = excluded.source_url,
            published_at = excluded.published_at,
            headline = excluded.headline,
            summary_json = excluded.summary_json,
            tickers_json = excluded.tickers_json,
            tags_json = excluded.tags_json,
            fetched_at = datetime('now'),
            expires_at = excluded.expires_at`,
    args: [
      id,
      handle,
      args.postKey,
      args.sourceUrl,
      args.publishedAt,
      args.headline,
      JSON.stringify(args.summary),
      JSON.stringify(args.tickers),
      JSON.stringify(args.tags),
      args.expiresAt,
    ],
  });
  const saved = await getAidSocialPost(handle, args.postKey);
  if (!saved) throw new Error("aid_social_posts upsert failed");
  return saved;
}
