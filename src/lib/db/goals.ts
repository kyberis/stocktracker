import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";
import type { Goal } from "@/lib/types";

function rowToGoal(r: Record<string, unknown>): Goal {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    portfolioId: str(r.portfolio_id),
    name: str(r.name),
    targetAmount: num(r.target_amount),
    currency: str(r.currency),
    growthRate: num(r.growth_rate),
    yearlyContribution: num(r.yearly_contribution),
    contributionMode: str(r.contribution_mode) === "yearly" ? "yearly" : "monthly",
    reinvestDividends: num(r.reinvest_dividends) === 1,
    horizon: num(r.horizon),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export async function listGoals(userId: string): Promise<Goal[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return result.rows.map((r) => rowToGoal(r as unknown as Record<string, unknown>));
}

export async function getGoalForPortfolio(userId: string, portfolioId: string): Promise<Goal | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM goals WHERE user_id = ? AND portfolio_id = ? LIMIT 1",
    args: [userId, portfolioId],
  });
  if (result.rows.length === 0) return null;
  return rowToGoal(result.rows[0] as unknown as Record<string, unknown>);
}

export async function upsertGoal(
  userId: string,
  goal: Omit<Goal, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<Goal> {
  const client = await ensureInitialized();

  const existing = await client.execute({
    sql: "SELECT id FROM goals WHERE user_id = ? AND portfolio_id = ?",
    args: [userId, goal.portfolioId],
  });

  const id = existing.rows.length > 0 ? str((existing.rows[0] as unknown as Record<string, unknown>).id) : randomUUID();

  if (existing.rows.length > 0) {
    await client.execute({
      sql: `UPDATE goals SET name = ?, target_amount = ?, currency = ?, growth_rate = ?,
            yearly_contribution = ?, contribution_mode = ?, reinvest_dividends = ?,
            horizon = ?, updated_at = datetime('now')
            WHERE id = ? AND user_id = ?`,
      args: [
        goal.name, goal.targetAmount, goal.currency, goal.growthRate,
        goal.yearlyContribution, goal.contributionMode, goal.reinvestDividends ? 1 : 0,
        goal.horizon, id, userId,
      ],
    });
  } else {
    await client.execute({
      sql: `INSERT INTO goals (id, user_id, portfolio_id, name, target_amount, currency,
            growth_rate, yearly_contribution, contribution_mode, reinvest_dividends, horizon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, goal.portfolioId, goal.name, goal.targetAmount, goal.currency,
        goal.growthRate, goal.yearlyContribution, goal.contributionMode,
        goal.reinvestDividends ? 1 : 0, goal.horizon,
      ],
    });
  }

  return (await getGoalForPortfolio(userId, goal.portfolioId))!;
}

export async function deleteGoal(userId: string, goalId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM goals WHERE id = ? AND user_id = ?",
    args: [goalId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}
