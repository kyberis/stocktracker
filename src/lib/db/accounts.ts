import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";
import type { Account } from "@/lib/types";

export async function listAccounts(userId: string): Promise<Account[]> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC", args: [userId] });
  return result.rows.map((r) => ({ id: str(r.id), name: str(r.name), broker: str(r.broker), currency: str(r.currency), createdAt: str(r.created_at) }));
}

export async function addAccount(userId: string, acct: Omit<Account, "id" | "createdAt">): Promise<Account> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: "INSERT INTO accounts (id, user_id, name, broker, currency) VALUES (?, ?, ?, ?, ?)",
    args: [id, userId, acct.name, acct.broker || "", acct.currency || "EUR"],
  });
  return { id, name: acct.name, broker: acct.broker || "", currency: acct.currency || "EUR", createdAt: new Date().toISOString() };
}

export async function findAccountByBroker(userId: string, brokerId: string): Promise<Account | null> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "SELECT * FROM accounts WHERE user_id = ? AND broker = ? LIMIT 1", args: [userId, brokerId] });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return { id: str(r.id), name: str(r.name), broker: str(r.broker), currency: str(r.currency), createdAt: str(r.created_at) };
}

export async function findOrCreateBrokerAccount(userId: string, brokerId: string, brokerLabel: string): Promise<Account> {
  const existing = await findAccountByBroker(userId, brokerId);
  if (existing) return existing;
  return addAccount(userId, { name: brokerLabel, broker: brokerId, currency: "EUR" });
}

export async function deleteAccount(userId: string, accountId: string): Promise<boolean> {
  const client = await ensureInitialized();
  await client.execute({ sql: "UPDATE holdings SET account_id = '' WHERE user_id = ? AND account_id = ?", args: [userId, accountId] });
  const result = await client.execute({ sql: "DELETE FROM accounts WHERE id = ? AND user_id = ?", args: [accountId, userId] });
  return (result.rowsAffected ?? 0) > 0;
}
