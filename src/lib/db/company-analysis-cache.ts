import { ensureInitialized } from "./client";

export interface CompanyAnalysisCacheRow {
  cacheKey: string;
  ticker: string;
  kind: "report" | "narrative";
  language: string;
  payloadJson: string;
  generatedAt: string;
  expiresAt: string;
  lastGapRetryAt: string | null;
  updatedAt: string;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function rowToCache(row: Record<string, unknown>): CompanyAnalysisCacheRow {
  return {
    cacheKey: str(row.cache_key),
    ticker: str(row.ticker),
    kind: str(row.kind) === "narrative" ? "narrative" : "report",
    language: str(row.language),
    payloadJson: str(row.payload_json),
    generatedAt: str(row.generated_at),
    expiresAt: str(row.expires_at),
    lastGapRetryAt: row.last_gap_retry_at ? str(row.last_gap_retry_at) : null,
    updatedAt: str(row.updated_at),
  };
}

export function companyAnalysisReportCacheKey(
  ticker: string,
  instrumentKind: "equity" | "etf" = "equity",
): string {
  const t = ticker.toUpperCase();
  return instrumentKind === "etf" ? `report:etf:${t}` : `report:${t}`;
}

export function companyAnalysisNarrativeCacheKey(
  ticker: string,
  language: string,
  instrumentKind: "equity" | "etf" = "equity",
): string {
  const t = ticker.toUpperCase();
  const lang = (language || "en").toLowerCase();
  return instrumentKind === "etf"
    ? `narrative:etf:${t}:${lang}`
    : `narrative:${t}:${lang}`;
}

export async function getCompanyAnalysisDbCache(
  cacheKey: string,
): Promise<CompanyAnalysisCacheRow | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT cache_key, ticker, kind, language, payload_json, generated_at, expires_at, last_gap_retry_at, updated_at
          FROM company_analysis_cache
          WHERE cache_key = ?
          LIMIT 1`,
    args: [cacheKey],
  });
  if (result.rows.length === 0) return null;
  const row = rowToCache(result.rows[0] as Record<string, unknown>);
  if (row.expiresAt && row.expiresAt < new Date().toISOString()) return null;
  return row;
}

export async function upsertCompanyAnalysisDbCache(args: {
  cacheKey: string;
  ticker: string;
  kind: "report" | "narrative";
  language?: string;
  payload: unknown;
  generatedAt: string;
  expiresAt: string;
  lastGapRetryAt?: string | null;
}): Promise<void> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO company_analysis_cache
            (cache_key, ticker, kind, language, payload_json, generated_at, expires_at, last_gap_retry_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(cache_key) DO UPDATE SET
            payload_json = excluded.payload_json,
            generated_at = excluded.generated_at,
            expires_at = excluded.expires_at,
            last_gap_retry_at = excluded.last_gap_retry_at,
            updated_at = excluded.updated_at`,
    args: [
      args.cacheKey,
      args.ticker.toUpperCase(),
      args.kind,
      args.language ?? "",
      JSON.stringify(args.payload),
      args.generatedAt,
      args.expiresAt,
      args.lastGapRetryAt ?? null,
      now,
    ],
  });
}

export async function deleteCompanyAnalysisDbCache(cacheKey: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `DELETE FROM company_analysis_cache WHERE cache_key = ?`,
    args: [cacheKey],
  });
}

/** Drop all cached report + narrative rows for a ticker (any language). */
export async function deleteCompanyAnalysisDbCacheForTicker(ticker: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `DELETE FROM company_analysis_cache WHERE ticker = ?`,
    args: [ticker.toUpperCase()],
  });
}

export interface CachedCompanyAnalysisTicker {
  ticker: string;
  updatedAt: string;
}

/**
 * Tickers with a non-expired report cache row, newest first.
 * Used by sitemap so crawlers only discover URLs that already have SSR content.
 */
export async function listCachedCompanyAnalysisTickers(args?: {
  limit?: number;
}): Promise<CachedCompanyAnalysisTicker[]> {
  const limit = Math.min(Math.max(args?.limit ?? 500, 1), 1000);
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `SELECT ticker, updated_at
          FROM company_analysis_cache
          WHERE kind = 'report'
            AND expires_at > ?
          ORDER BY updated_at DESC
          LIMIT ?`,
    args: [now, limit],
  });
  return result.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      ticker: str(r.ticker).toUpperCase(),
      updatedAt: str(r.updated_at),
    };
  });
}
