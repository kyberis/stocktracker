import { ensureInitialized } from "./client";

export type FundamentalsCacheType =
  | "overview"
  | "income"
  | "balance"
  | "cashflow"
  | "earnings";
export type FundamentalsCacheProvider = "fmp" | "yahoo";

export interface FundamentalsCacheRow {
  symbol: string;
  type: FundamentalsCacheType;
  dataJson: string;
  provider: FundamentalsCacheProvider;
  createdAt: string;
  updatedAt: string;
}

export async function getFundamentalsCache(
  symbol: string,
  type: FundamentalsCacheType
): Promise<FundamentalsCacheRow | null> {
  const client = await ensureInitialized();
  const sym = symbol.trim().toUpperCase();
  const result = await client.execute({
    sql: `SELECT symbol, type, data_json, provider, created_at, updated_at
          FROM fundamentals_cache
          WHERE symbol = ? AND type = ?`,
    args: [sym, type],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    symbol: String(row.symbol),
    type: type,
    dataJson: String(row.data_json),
    provider: String(row.provider) as FundamentalsCacheProvider,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/** Lookup cached fundamentals rows for a set of symbols (one type, case-insensitive). */
export async function getFundamentalsCacheBySymbols(
  symbols: readonly string[],
  type: FundamentalsCacheType,
): Promise<Map<string, FundamentalsCacheRow>> {
  const out = new Map<string, FundamentalsCacheRow>();
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (unique.length === 0) return out;

  const client = await ensureInitialized();
  const CHUNK = 80;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    const result = await client.execute({
      sql: `SELECT symbol, type, data_json, provider, created_at, updated_at
            FROM fundamentals_cache
            WHERE type = ? AND UPPER(symbol) IN (${placeholders})`,
      args: [type, ...chunk],
    });
    for (const row of result.rows) {
      const sym = String(row.symbol).toUpperCase();
      out.set(sym, {
        symbol: sym,
        type,
        dataJson: String(row.data_json),
        provider: String(row.provider) as FundamentalsCacheProvider,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      });
    }
  }
  return out;
}

export async function upsertFundamentalsCache(
  symbol: string,
  type: FundamentalsCacheType,
  data: unknown,
  provider: FundamentalsCacheProvider
): Promise<void> {
  const client = await ensureInitialized();
  const sym = symbol.trim().toUpperCase();
  const dataJson = JSON.stringify(data);
  await client.execute({
    sql: `INSERT INTO fundamentals_cache (symbol, type, data_json, provider, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(symbol, type) DO UPDATE SET
            data_json = excluded.data_json,
            provider = excluded.provider,
            updated_at = datetime('now')`,
    args: [sym, type, dataJson, provider],
  });
}

export async function deleteFundamentalsCache(
  symbol?: string,
  type?: FundamentalsCacheType
): Promise<number> {
  const client = await ensureInitialized();
  if (!symbol && !type) {
    const result = await client.execute("DELETE FROM fundamentals_cache");
    return result.rowsAffected ?? 0;
  }
  if (symbol && type) {
    const result = await client.execute({
      sql: "DELETE FROM fundamentals_cache WHERE symbol = ? AND type = ?",
      args: [symbol.trim().toUpperCase(), type],
    });
    return result.rowsAffected ?? 0;
  }
  if (symbol) {
    const result = await client.execute({
      sql: "DELETE FROM fundamentals_cache WHERE symbol = ?",
      args: [symbol.trim().toUpperCase()],
    });
    return result.rowsAffected ?? 0;
  }
  const result = await client.execute({
    sql: "DELETE FROM fundamentals_cache WHERE type = ?",
    args: [type!],
  });
  return result.rowsAffected ?? 0;
}
