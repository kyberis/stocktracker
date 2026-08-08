import { ensureInitialized } from "./client";

export const SCREENING_RESEARCH_SCHEMA_VERSION = "v1";
/** Cross-user research cache TTL (7 days). */
export const SCREENING_RESEARCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ScreeningResearchCacheRow {
  cacheKey: string;
  ticker: string;
  schemaVersion: string;
  payloadJson: string;
  model: string;
  creditsUsed: number;
  generatedAt: string;
  expiresAt: string;
  updatedAt: string;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function rowToCache(row: Record<string, unknown>): ScreeningResearchCacheRow {
  return {
    cacheKey: str(row.cache_key),
    ticker: str(row.ticker),
    schemaVersion: str(row.schema_version) || SCREENING_RESEARCH_SCHEMA_VERSION,
    payloadJson: str(row.payload_json),
    model: str(row.model) || "mini",
    creditsUsed: Number(row.credits_used) || 0,
    generatedAt: str(row.generated_at),
    expiresAt: str(row.expires_at),
    updatedAt: str(row.updated_at),
  };
}

export function screeningResearchCacheKey(
  ticker: string,
  schemaVersion = SCREENING_RESEARCH_SCHEMA_VERSION,
): string {
  return `research:${ticker.toUpperCase()}:${schemaVersion}`;
}

export async function getScreeningResearchCache(
  ticker: string,
  schemaVersion = SCREENING_RESEARCH_SCHEMA_VERSION,
): Promise<ScreeningResearchCacheRow | null> {
  const client = await ensureInitialized();
  const cacheKey = screeningResearchCacheKey(ticker, schemaVersion);
  const result = await client.execute({
    sql: `SELECT cache_key, ticker, schema_version, payload_json, model, credits_used,
                 generated_at, expires_at, updated_at
          FROM screening_research_cache
          WHERE cache_key = ?
          LIMIT 1`,
    args: [cacheKey],
  });
  if (result.rows.length === 0) return null;
  const row = rowToCache(result.rows[0] as Record<string, unknown>);
  if (row.expiresAt && row.expiresAt < new Date().toISOString()) return null;
  return row;
}

export async function hasFreshScreeningResearchCache(
  ticker: string,
): Promise<boolean> {
  const row = await getScreeningResearchCache(ticker);
  return row != null;
}

export async function upsertScreeningResearchCache(args: {
  ticker: string;
  payload: unknown;
  model?: string;
  creditsUsed?: number;
  schemaVersion?: string;
  ttlMs?: number;
}): Promise<void> {
  const client = await ensureInitialized();
  const schemaVersion = args.schemaVersion ?? SCREENING_RESEARCH_SCHEMA_VERSION;
  const cacheKey = screeningResearchCacheKey(args.ticker, schemaVersion);
  const now = new Date();
  const generatedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + (args.ttlMs ?? SCREENING_RESEARCH_TTL_MS),
  ).toISOString();
  await client.execute({
    sql: `INSERT INTO screening_research_cache
            (cache_key, ticker, schema_version, payload_json, model, credits_used,
             generated_at, expires_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(cache_key) DO UPDATE SET
            payload_json = excluded.payload_json,
            model = excluded.model,
            credits_used = excluded.credits_used,
            generated_at = excluded.generated_at,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at`,
    args: [
      cacheKey,
      args.ticker.toUpperCase(),
      schemaVersion,
      JSON.stringify(args.payload).slice(0, 100_000),
      args.model ?? "mini",
      Math.max(0, args.creditsUsed ?? 0),
      generatedAt,
      expiresAt,
      generatedAt,
    ],
  });
}
