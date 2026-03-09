import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";
import type { CashEntry } from "@/lib/types";

export async function listCashEntries(userId: string, portfolioId?: string): Promise<CashEntry[]> {
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const result = await client.execute({
    sql: `SELECT id, name, amount_eur
          FROM cash_entries WHERE user_id = ?${portfolioFilter} ORDER BY created_at ASC`,
    args: [userId, ...portfolioArgs],
  });
  return result.rows.map((row) => ({
    id: str(row.id),
    name: str(row.name),
    amountEUR: num(row.amount_eur),
  }));
}

export async function addCashEntry(
  userId: string,
  entry: Omit<CashEntry, "id">,
  portfolioId?: string
): Promise<CashEntry> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO cash_entries (id, user_id, name, amount_eur, portfolio_id)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, userId, entry.name, entry.amountEUR, portfolioId || ""],
  });
  return { ...entry, id };
}

export async function updateCashEntry(
  userId: string,
  cashId: string,
  updates: Partial<Omit<CashEntry, "id">>
): Promise<CashEntry | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, name, amount_eur
          FROM cash_entries WHERE id = ? AND user_id = ?`,
    args: [cashId, userId],
  });
  if (result.rows.length === 0) return null;
  const current = result.rows[0];
  const next = {
    name: updates.name ?? str(current.name),
    amountEUR: updates.amountEUR ?? num(current.amount_eur),
  };
  await client.execute({
    sql: `UPDATE cash_entries
          SET name = ?, amount_eur = ?, updated_at = datetime('now')
          WHERE id = ? AND user_id = ?`,
    args: [next.name, next.amountEUR, cashId, userId],
  });
  return { id: cashId, ...next };
}

export async function removeCashEntry(userId: string, cashId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM cash_entries WHERE id = ? AND user_id = ?",
    args: [cashId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}
