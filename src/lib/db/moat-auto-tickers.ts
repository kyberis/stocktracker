import { ensureInitialized } from "./client";
import { str } from "./helpers";

export interface MoatAutoTicker {
  symbol: string;
  addedBy: string;
  addedAt: string;
}

export async function listMoatAutoTickers(): Promise<MoatAutoTicker[]> {
  const client = await ensureInitialized();
  const result = await client.execute(
    "SELECT symbol, added_by, added_at FROM moat_auto_tickers ORDER BY added_at DESC"
  );
  return result.rows.map((row) => ({
    symbol: str(row.symbol),
    addedBy: str(row.added_by),
    addedAt: str(row.added_at),
  }));
}

export async function addMoatAutoTickers(
  symbols: string[],
  addedBy: string,
): Promise<number> {
  const client = await ensureInitialized();
  let added = 0;
  for (const symbol of symbols) {
    const upper = symbol.trim().toUpperCase();
    if (!upper) continue;
    await client.execute({
      sql: "INSERT OR IGNORE INTO moat_auto_tickers (symbol, added_by) VALUES (?, ?)",
      args: [upper, addedBy],
    });
    added++;
  }
  return added;
}

export async function removeMoatAutoTicker(symbol: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "DELETE FROM moat_auto_tickers WHERE symbol = ?",
    args: [symbol.trim().toUpperCase()],
  });
}
