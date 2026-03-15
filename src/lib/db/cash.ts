import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";
import type { CashEntry, ManualAssetType } from "@/lib/types";
import { resolvePortfolioId } from "./portfolios";

function parseAssetType(raw: unknown): ManualAssetType {
  const s = String(raw || "cash");
  if (s === "real_estate" || s === "savings" || s === "pension") return s;
  return "cash";
}

function rowToCashEntry(row: Record<string, unknown>): CashEntry {
  return {
    id: str(row.id),
    name: str(row.name),
    amountEUR: num(row.amount_eur),
    type: parseAssetType(row.type),
    source: str(row.source) || "manual",
    displayCurrency: str(row.display_currency) || "EUR",
    displayAmount: num(row.display_amount),
    notes: str(row.notes),
    valuationDate: str(row.valuation_date),
  };
}

const CASH_ENTRY_COLS = "id, name, amount_eur, type, source, display_currency, display_amount, notes, valuation_date";

export async function listCashEntries(userId: string, portfolioId?: string): Promise<CashEntry[]> {
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const result = await client.execute({
    sql: `SELECT ${CASH_ENTRY_COLS}
          FROM cash_entries WHERE user_id = ?${portfolioFilter} ORDER BY type ASC, created_at ASC`,
    args: [userId, ...portfolioArgs],
  });
  return result.rows.map((row) => rowToCashEntry(row as Record<string, unknown>));
}

export async function addCashEntry(
  userId: string,
  entry: Omit<CashEntry, "id">,
  portfolioId?: string
): Promise<CashEntry> {
  const client = await ensureInitialized();
  const resolved = await resolvePortfolioId(userId, portfolioId);
  const id = randomUUID();
  const type = entry.type ?? "cash";
  const source = entry.source ?? "manual";
  const displayCurrency = entry.displayCurrency ?? "EUR";
  const displayAmount = entry.displayAmount ?? entry.amountEUR;
  const notes = entry.notes ?? "";
  const valuationDate = entry.valuationDate ?? "";

  const result = await client.execute({
    sql: `INSERT INTO cash_entries (id, user_id, name, amount_eur, type, source, display_currency, display_amount, notes, valuation_date, portfolio_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, name, portfolio_id, source) DO UPDATE SET
            amount_eur = excluded.amount_eur,
            type = excluded.type,
            display_currency = excluded.display_currency,
            display_amount = excluded.display_amount,
            notes = excluded.notes,
            valuation_date = excluded.valuation_date,
            updated_at = datetime('now')
          RETURNING id`,
    args: [id, userId, entry.name, entry.amountEUR, type, source, displayCurrency, displayAmount, notes, valuationDate, resolved],
  });
  const returnedId = result.rows.length > 0 ? str(result.rows[0].id) : id;
  return {
    id: returnedId,
    name: entry.name,
    amountEUR: entry.amountEUR,
    type,
    source,
    displayCurrency,
    displayAmount,
    notes,
    valuationDate,
  };
}

export async function updateCashEntry(
  userId: string,
  cashId: string,
  updates: Partial<Omit<CashEntry, "id">>
): Promise<CashEntry | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT ${CASH_ENTRY_COLS}
          FROM cash_entries WHERE id = ? AND user_id = ?`,
    args: [cashId, userId],
  });
  if (result.rows.length === 0) return null;
  const current = rowToCashEntry(result.rows[0] as Record<string, unknown>);
  const nextType = updates.type ?? current.type ?? "cash";
  const nextDisplayCurrency = updates.displayCurrency ?? current.displayCurrency ?? "EUR";
  const nextDisplayAmount = updates.displayAmount ?? current.displayAmount ?? current.amountEUR;
  const nextNotes = updates.notes ?? current.notes ?? "";
  const nextValuationDate = updates.valuationDate ?? current.valuationDate ?? "";
  const next: CashEntry = {
    id: cashId,
    name: updates.name ?? current.name,
    amountEUR: updates.amountEUR ?? current.amountEUR,
    type: nextType,
    displayCurrency: nextDisplayCurrency,
    displayAmount: nextDisplayAmount,
    notes: nextNotes,
    valuationDate: nextValuationDate,
  };
  await client.execute({
    sql: `UPDATE cash_entries
          SET name = ?, amount_eur = ?, type = ?, display_currency = ?,
              display_amount = ?, notes = ?, valuation_date = ?, updated_at = datetime('now')
          WHERE id = ? AND user_id = ?`,
    args: [next.name, next.amountEUR, nextType, nextDisplayCurrency,
           nextDisplayAmount, nextNotes, nextValuationDate, cashId, userId],
  });
  return next;
}

export async function removeCashEntry(userId: string, cashId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM cash_entries WHERE id = ? AND user_id = ?",
    args: [cashId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function removeCashEntriesBySource(
  userId: string,
  source: string,
  portfolioId?: string,
): Promise<number> {
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const result = await client.execute({
    sql: `DELETE FROM cash_entries WHERE user_id = ? AND source = ?${portfolioFilter}`,
    args: [userId, source, ...portfolioArgs],
  });
  return result.rowsAffected ?? 0;
}

/**
 * Delete snaptrade cash entries only for the given broker name prefixes.
 * Each cash entry name looks like "INTERACTIVE BROKERS – USD", so we match
 * using `name LIKE '<prefix>%'` for each fetched broker.
 * Entries from brokers NOT in the list (e.g. disabled ones) are preserved.
 */
export async function removeCashEntriesBySourceAndBrokers(
  userId: string,
  source: string,
  brokerPrefixes: string[],
  portfolioId?: string,
): Promise<number> {
  if (brokerPrefixes.length === 0) return 0;
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const likeClauses = brokerPrefixes.map(() => "name LIKE ?").join(" OR ");
  const likeArgs = brokerPrefixes.map((p) => `${p}%`);
  const result = await client.execute({
    sql: `DELETE FROM cash_entries WHERE user_id = ? AND source = ?${portfolioFilter} AND (${likeClauses})`,
    args: [userId, source, ...portfolioArgs, ...likeArgs],
  });
  return result.rowsAffected ?? 0;
}

export async function getManualAssetCount(userId: string, portfolioId?: string): Promise<number> {
  const client = await ensureInitialized();
  const portfolioFilter = portfolioId ? " AND portfolio_id = ?" : "";
  const portfolioArgs = portfolioId ? [portfolioId] : [];
  const result = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM cash_entries
          WHERE user_id = ? AND type != 'cash'${portfolioFilter}`,
    args: [userId, ...portfolioArgs],
  });
  return Number(result.rows[0]?.cnt) || 0;
}
