import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ensureInitialized } from "@/lib/db/client";
import { canAccessFeature } from "@/lib/subscription";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/portfolio/history", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "1m";
  const portfolioId = url.searchParams.get("portfolioId") || "";

  const plan = (session.plan ?? "free") as "free" | "starter" | "pro";
  const isPro = plan === "pro";
  const canViewFull = canAccessFeature("portfolio-history-full", {
    plan,
    aiCallsThisMonth: 0,
  }).allowed;

  const client = await ensureInitialized();

  let sql: string;
  let args: (string | number)[];

  const paidRanges = new Set(["all", "1y", "6m", "3m", "ytd"]);
  const freeRanges = new Set(["1m", "1w"]);

  if (paidRanges.has(range)) {
    if (!canViewFull) {
      sql = `SELECT date, total_value_eur as value
             FROM portfolio_snapshots
             WHERE user_id = ? AND portfolio_id = ? AND date >= date('now', '-30 days')
             ORDER BY date ASC`;
      args = [session.userId, portfolioId];
    } else if (range === "ytd") {
      const year = new Date().getFullYear();
      sql = `SELECT date, total_value_eur as value
             FROM portfolio_snapshots
             WHERE user_id = ? AND portfolio_id = ? AND date >= ?
             ORDER BY date ASC`;
      args = [session.userId, portfolioId, `${year}-01-01`];
    } else {
      const dayMap: Record<string, string> = {
        all: "-100 years",
        "1y": "-1 year",
        "6m": "-6 months",
        "3m": "-3 months",
      };
      sql = `SELECT date, total_value_eur as value
             FROM portfolio_snapshots
             WHERE user_id = ? AND portfolio_id = ? AND date >= date('now', ?)
             ORDER BY date ASC`;
      args = [session.userId, portfolioId, dayMap[range]];
    }
  } else if (range === "1w") {
    sql = `SELECT date, total_value_eur as value
           FROM portfolio_snapshots
           WHERE user_id = ? AND portfolio_id = ? AND date >= date('now', '-7 days')
           ORDER BY date ASC`;
    args = [session.userId, portfolioId];
  } else {
    sql = `SELECT date, total_value_eur as value
           FROM portfolio_snapshots
           WHERE user_id = ? AND portfolio_id = ? AND date >= date('now', '-30 days')
           ORDER BY date ASC`;
    args = [session.userId, portfolioId];
  }

  const result = await client.execute({ sql, args });
  const points = result.rows.map((row) => ({
    date: row.date as string,
    value: row.value as number,
  }));

  return NextResponse.json({
    points,
    isPro,
    canViewFull,
  });
});
