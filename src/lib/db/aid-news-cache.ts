import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import type { AidDigestSummary, AidNewsCacheRow } from "@/lib/types";

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function rowToCache(row: Record<string, unknown>): AidNewsCacheRow {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    ticker: str(row.ticker),
    eventKey: str(row.event_key),
    headline: str(row.headline),
    summaryJson: str(row.summary_json),
    sourcesJson: str(row.sources_json),
    usedWeb: Number(row.used_web) === 1,
    fetchedAt: str(row.fetched_at),
    expiresAt: str(row.expires_at),
  };
}

export async function getAidNewsCacheEntry(
  userId: string,
  ticker: string,
  eventKey: string,
): Promise<AidNewsCacheRow | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, user_id, ticker, event_key, headline, summary_json, sources_json, used_web, fetched_at, expires_at
          FROM aid_news_cache
          WHERE user_id = ? AND ticker = ? AND event_key = ?
          LIMIT 1`,
    args: [userId, ticker, eventKey],
  });
  if (result.rows.length === 0) return null;
  const row = rowToCache(result.rows[0] as Record<string, unknown>);
  if (row.expiresAt && row.expiresAt < new Date().toISOString()) return null;
  return row;
}

export async function listAidNewsCacheForUser(
  userId: string,
  limit = 50,
): Promise<AidNewsCacheRow[]> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `SELECT id, user_id, ticker, event_key, headline, summary_json, sources_json, used_web, fetched_at, expires_at
          FROM aid_news_cache
          WHERE user_id = ? AND (expires_at = '' OR expires_at > ?)
          ORDER BY fetched_at DESC
          LIMIT ?`,
    args: [userId, now, limit],
  });
  return result.rows.map((r) => rowToCache(r as Record<string, unknown>));
}

export async function upsertAidNewsCache(args: {
  userId: string;
  ticker: string;
  eventKey: string;
  headline: string;
  summary: AidDigestSummary;
  sources?: string[];
  usedWeb?: boolean;
  expiresAt: string;
}): Promise<AidNewsCacheRow> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const summaryJson = JSON.stringify(args.summary);
  const sourcesJson = JSON.stringify(args.sources ?? []);
  const usedWeb = args.usedWeb ? 1 : 0;

  await client.execute({
    sql: `INSERT INTO aid_news_cache (id, user_id, ticker, event_key, headline, summary_json, sources_json, used_web, fetched_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
          ON CONFLICT(user_id, ticker, event_key) DO UPDATE SET
            headline = excluded.headline,
            summary_json = excluded.summary_json,
            sources_json = excluded.sources_json,
            used_web = excluded.used_web,
            fetched_at = datetime('now'),
            expires_at = excluded.expires_at`,
    args: [
      id,
      args.userId,
      args.ticker,
      args.eventKey,
      args.headline,
      summaryJson,
      sourcesJson,
      usedWeb,
      args.expiresAt,
    ],
  });

  const saved = await getAidNewsCacheEntry(args.userId, args.ticker, args.eventKey);
  if (!saved) throw new Error("aid_news_cache upsert failed");
  return saved;
}

export function parseAidDigestSummary(json: string): AidDigestSummary | null {
  try {
    const parsed = JSON.parse(json) as AidDigestSummary;
    if (!parsed || typeof parsed.headline !== "string" || !Array.isArray(parsed.bullets)) return null;
    return parsed;
  } catch {
    return null;
  }
}
