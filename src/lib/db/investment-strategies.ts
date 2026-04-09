import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";
import type { InvestmentStrategy } from "@/lib/types";

function rowToStrategy(r: Record<string, unknown>): InvestmentStrategy {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    ticker: str(r.ticker),
    exchange: str(r.exchange),
    name: str(r.name),
    purchasePrice: num(r.purchase_price),
    currency: str(r.currency),
    targetPrice: num(r.target_price),
    stopLossPrice: num(r.stop_loss_price),
    targetAlertId: str(r.target_alert_id),
    stopAlertId: str(r.stop_alert_id),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export async function listInvestmentStrategies(userId: string): Promise<InvestmentStrategy[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM investment_strategies WHERE user_id = ? ORDER BY updated_at DESC",
    args: [userId],
  });
  return result.rows.map((r) => rowToStrategy(r as unknown as Record<string, unknown>));
}

export async function getInvestmentStrategyByTickerExchange(
  userId: string,
  ticker: string,
  exchange: string
): Promise<InvestmentStrategy | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM investment_strategies
          WHERE user_id = ? AND ticker = ? AND exchange = ?`,
    args: [userId, ticker.toUpperCase(), exchange.toUpperCase()],
  });
  const row = result.rows[0] as unknown as Record<string, unknown> | undefined;
  return row ? rowToStrategy(row) : null;
}

export interface UpsertInvestmentStrategyInput {
  ticker: string;
  exchange: string;
  name: string;
  purchasePrice: number;
  currency: string;
  targetPrice: number;
  stopLossPrice: number;
  targetAlertId: string;
  stopAlertId: string;
}

export async function upsertInvestmentStrategy(
  userId: string,
  input: UpsertInvestmentStrategyInput
): Promise<InvestmentStrategy> {
  const client = await ensureInitialized();
  const ticker = input.ticker.toUpperCase();
  const exchange = input.exchange.toUpperCase();
  const existing = await getInvestmentStrategyByTickerExchange(userId, ticker, exchange);
  const id = existing?.id ?? randomUUID();
  const createdAt = existing?.createdAt ?? new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO investment_strategies (
            id, user_id, ticker, exchange, name, purchase_price, currency,
            target_price, stop_loss_price, target_alert_id, stop_alert_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(user_id, ticker, exchange) DO UPDATE SET
            name = excluded.name,
            purchase_price = excluded.purchase_price,
            currency = excluded.currency,
            target_price = excluded.target_price,
            stop_loss_price = excluded.stop_loss_price,
            target_alert_id = excluded.target_alert_id,
            stop_alert_id = excluded.stop_alert_id,
            updated_at = datetime('now')`,
    args: [
      id,
      userId,
      ticker,
      exchange,
      input.name,
      input.purchasePrice,
      input.currency,
      input.targetPrice,
      input.stopLossPrice,
      input.targetAlertId,
      input.stopAlertId,
      createdAt,
    ],
  });

  const row = await getInvestmentStrategyByTickerExchange(userId, ticker, exchange);
  if (!row) throw new Error("upsertInvestmentStrategy: row missing after write");
  return row;
}

export async function deleteInvestmentStrategy(userId: string, strategyId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM investment_strategies WHERE id = ? AND user_id = ?",
    args: [strategyId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}
