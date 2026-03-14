import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listGoals, listGoalsForPortfolio, getGoalForPortfolio, createGoal, updateGoal, upsertGoal, deleteGoal } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import type { GoalType, GoalMilestone } from "@/lib/types";

const VALID_GOAL_TYPES = new Set<GoalType>(["retirement", "fire", "house", "education", "emergency_fund", "vacation", "custom"]);

const DEFAULT_MILESTONES: GoalMilestone[] = [
  { percent: 25, label: "25%", reachedAt: null },
  { percent: 50, label: "50%", reachedAt: null },
  { percent: 75, label: "75%", reachedAt: null },
  { percent: 100, label: "100%", reachedAt: null },
];

export const GET = withMetrics("/api/goals", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const portfolioId = req.nextUrl.searchParams.get("portfolioId");
  const goalId = req.nextUrl.searchParams.get("id");

  if (goalId) {
    const { getGoalById } = await import("@/lib/db");
    const goal = await getGoalById(session.userId, goalId);
    return NextResponse.json({ goal: goal ?? null });
  }

  if (portfolioId !== null) {
    const goals = await listGoalsForPortfolio(session.userId, portfolioId);
    // Backward compat: also return first goal as `goal`
    return NextResponse.json({ goals, goal: goals[0] ?? null });
  }

  const goals = await listGoals(session.userId);
  return NextResponse.json({ goals });
});

export const POST = withMetrics("/api/goals", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const portfolioId = typeof body.portfolioId === "string" ? body.portfolioId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "My Goal";
  const goalType = typeof body.goalType === "string" && VALID_GOAL_TYPES.has(body.goalType as GoalType) ? (body.goalType as GoalType) : "custom";
  const targetAmount = typeof body.targetAmount === "number" ? body.targetAmount : 0;
  const currency = typeof body.currency === "string" ? body.currency : "EUR";
  const growthRate = typeof body.growthRate === "number" ? body.growthRate : 7;
  const yearlyContribution = typeof body.yearlyContribution === "number" ? body.yearlyContribution : 0;
  const monthlyContribution = typeof body.monthlyContribution === "number" ? body.monthlyContribution : 0;
  const contributionMode = body.contributionMode === "yearly" ? "yearly" as const : "monthly" as const;
  const reinvestDividends = body.reinvestDividends !== false;
  const horizon = typeof body.horizon === "number" ? body.horizon : 20;
  const targetDate = typeof body.targetDate === "string" ? body.targetDate : null;
  const priority = typeof body.priority === "number" ? body.priority : 0;
  const milestones: GoalMilestone[] = Array.isArray(body.milestones) ? body.milestones : DEFAULT_MILESTONES;
  const notes = typeof body.notes === "string" ? body.notes : "";
  const icon = typeof body.icon === "string" ? body.icon : "";
  const color = typeof body.color === "string" ? body.color : "";

  if (targetAmount <= 0) {
    return NextResponse.json({ error: "Target amount must be positive" }, { status: 400 });
  }

  // If `id` is provided, update existing goal
  if (typeof body.id === "string" && body.id) {
    const updated = await updateGoal(session.userId, body.id, {
      portfolioId, name, goalType, targetAmount, currency, growthRate,
      yearlyContribution, monthlyContribution, contributionMode,
      reinvestDividends, horizon, targetDate, priority, milestones,
      notes, icon, color,
    });
    if (!updated) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    return NextResponse.json({ goal: updated });
  }

  // Legacy compat: if no goalType supplied and no id, use upsert behavior
  if (!body.goalType && !body.id) {
    const goal = await upsertGoal(session.userId, {
      portfolioId, name, goalType, targetAmount, currency, growthRate,
      yearlyContribution, monthlyContribution, contributionMode,
      reinvestDividends, horizon, targetDate, priority, milestones,
      notes, icon, color,
    });
    return NextResponse.json({ goal });
  }

  const goal = await createGoal(session.userId, {
    portfolioId, name, goalType, targetAmount, currency, growthRate,
    yearlyContribution, monthlyContribution, contributionMode,
    reinvestDividends, horizon, targetDate, priority, milestones,
    notes, icon, color,
  });

  return NextResponse.json({ goal });
});

export const DELETE = withMetrics("/api/goals", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const goalId = req.nextUrl.searchParams.get("id");
  if (!goalId) {
    return NextResponse.json({ error: "Missing goal id" }, { status: 400 });
  }

  const deleted = await deleteGoal(session.userId, goalId);
  return NextResponse.json({ deleted });
});
