import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";
import type { Goal, GoalMilestone, GoalType } from "@/lib/types";

const VALID_GOAL_TYPES = new Set<GoalType>(["retirement", "fire", "house", "education", "emergency_fund", "vacation", "custom"]);

function parseMilestones(raw: unknown): GoalMilestone[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m: unknown) => typeof m === "object" && m !== null && "percent" in m
    ) as GoalMilestone[];
  } catch {
    return [];
  }
}

function rowToGoal(r: Record<string, unknown>): Goal {
  const rawType = str(r.goal_type);
  return {
    id: str(r.id),
    userId: str(r.user_id),
    portfolioId: str(r.portfolio_id),
    name: str(r.name),
    goalType: VALID_GOAL_TYPES.has(rawType as GoalType) ? (rawType as GoalType) : "custom",
    targetAmount: num(r.target_amount),
    currency: str(r.currency),
    growthRate: num(r.growth_rate),
    yearlyContribution: num(r.yearly_contribution),
    monthlyContribution: num(r.monthly_contribution),
    contributionMode: str(r.contribution_mode) === "yearly" ? "yearly" : "monthly",
    reinvestDividends: num(r.reinvest_dividends) === 1,
    horizon: num(r.horizon),
    targetDate: r.target_date ? str(r.target_date) : null,
    priority: num(r.priority),
    milestones: parseMilestones(r.milestones),
    notes: str(r.notes),
    icon: str(r.icon),
    color: str(r.color),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export async function listGoals(userId: string): Promise<Goal[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM goals WHERE user_id = ? ORDER BY priority DESC, created_at ASC",
    args: [userId],
  });
  return result.rows.map((r) => rowToGoal(r as unknown as Record<string, unknown>));
}

export async function listGoalsForPortfolio(userId: string, portfolioId: string): Promise<Goal[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM goals WHERE user_id = ? AND portfolio_id = ? ORDER BY priority DESC, created_at ASC",
    args: [userId, portfolioId],
  });
  return result.rows.map((r) => rowToGoal(r as unknown as Record<string, unknown>));
}

export async function getGoalById(userId: string, goalId: string): Promise<Goal | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM goals WHERE id = ? AND user_id = ? LIMIT 1",
    args: [goalId, userId],
  });
  if (result.rows.length === 0) return null;
  return rowToGoal(result.rows[0] as unknown as Record<string, unknown>);
}

/** @deprecated Use listGoalsForPortfolio instead — kept for backward compat with dashboard projection */
export async function getGoalForPortfolio(userId: string, portfolioId: string): Promise<Goal | null> {
  const goals = await listGoalsForPortfolio(userId, portfolioId);
  return goals[0] ?? null;
}

export type GoalInput = Omit<Goal, "id" | "userId" | "createdAt" | "updatedAt">;

export async function createGoal(userId: string, goal: GoalInput): Promise<Goal> {
  const client = await ensureInitialized();
  const id = randomUUID();

  await client.execute({
    sql: `INSERT INTO goals (id, user_id, portfolio_id, name, goal_type, target_amount, currency,
          growth_rate, yearly_contribution, monthly_contribution, contribution_mode,
          reinvest_dividends, horizon, target_date, priority, milestones, notes, icon, color)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, userId, goal.portfolioId, goal.name, goal.goalType,
      goal.targetAmount, goal.currency, goal.growthRate,
      goal.yearlyContribution, goal.monthlyContribution, goal.contributionMode,
      goal.reinvestDividends ? 1 : 0, goal.horizon,
      goal.targetDate ?? null, goal.priority,
      JSON.stringify(goal.milestones), goal.notes, goal.icon, goal.color,
    ],
  });

  return (await getGoalById(userId, id))!;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  updates: Partial<GoalInput>
): Promise<Goal | null> {
  const client = await ensureInitialized();

  const setClauses: string[] = [];
  const args: (string | number | null)[] = [];

  const fieldMap: Record<string, { col: string; transform?: (v: unknown) => string | number | null }> = {
    name: { col: "name" },
    goalType: { col: "goal_type" },
    targetAmount: { col: "target_amount" },
    currency: { col: "currency" },
    growthRate: { col: "growth_rate" },
    yearlyContribution: { col: "yearly_contribution" },
    monthlyContribution: { col: "monthly_contribution" },
    contributionMode: { col: "contribution_mode" },
    reinvestDividends: { col: "reinvest_dividends", transform: (v) => (v ? 1 : 0) as number },
    horizon: { col: "horizon" },
    targetDate: { col: "target_date" },
    priority: { col: "priority" },
    milestones: { col: "milestones", transform: (v) => JSON.stringify(v) as string },
    notes: { col: "notes" },
    icon: { col: "icon" },
    color: { col: "color" },
  };

  for (const [key, mapping] of Object.entries(fieldMap)) {
    if (key in updates) {
      setClauses.push(`${mapping.col} = ?`);
      const raw = (updates as Record<string, unknown>)[key];
      args.push(mapping.transform ? mapping.transform(raw) : raw as string | number | null);
    }
  }

  if (setClauses.length === 0) return getGoalById(userId, goalId);

  setClauses.push("updated_at = datetime('now')");
  args.push(goalId as string, userId as string);

  await client.execute({
    sql: `UPDATE goals SET ${setClauses.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });

  return getGoalById(userId, goalId);
}

/** Backward-compat upsert: creates or updates the first goal for a portfolio */
export async function upsertGoal(
  userId: string,
  goal: Omit<Goal, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<Goal> {
  const existing = await getGoalForPortfolio(userId, goal.portfolioId);
  if (existing) {
    return (await updateGoal(userId, existing.id, goal))!;
  }
  return createGoal(userId, goal);
}

export async function deleteGoal(userId: string, goalId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM goals WHERE id = ? AND user_id = ?",
    args: [goalId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}
