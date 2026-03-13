import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listGoals, getGoalForPortfolio, upsertGoal, deleteGoal } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/goals", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const portfolioId = req.nextUrl.searchParams.get("portfolioId");

  if (portfolioId) {
    const goal = await getGoalForPortfolio(session.userId, portfolioId);
    return NextResponse.json({ goal });
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
  const targetAmount = typeof body.targetAmount === "number" ? body.targetAmount : 0;
  const currency = typeof body.currency === "string" ? body.currency : "EUR";
  const growthRate = typeof body.growthRate === "number" ? body.growthRate : 7;
  const yearlyContribution = typeof body.yearlyContribution === "number" ? body.yearlyContribution : 0;
  const contributionMode = body.contributionMode === "yearly" ? "yearly" as const : "monthly" as const;
  const reinvestDividends = body.reinvestDividends !== false;
  const horizon = typeof body.horizon === "number" ? body.horizon : 20;

  if (targetAmount <= 0) {
    return NextResponse.json({ error: "Target amount must be positive" }, { status: 400 });
  }

  const goal = await upsertGoal(session.userId, {
    portfolioId,
    name,
    targetAmount,
    currency,
    growthRate,
    yearlyContribution,
    contributionMode,
    reinvestDividends,
    horizon,
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
