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
