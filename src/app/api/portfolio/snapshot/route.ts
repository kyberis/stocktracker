import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ensureInitialized } from "@/lib/db/client";
import { generateId } from "@/lib/utils";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

/**
 * POST /api/portfolio/snapshot
 * Upserts today's portfolio snapshot. Called from the dashboard while the app is open.
 * Body: { totalValueEUR: number, totalInvestedEUR?: number, portfolioId?: string }
 *
 * Invested capital is **carried forward** from the most recent existing snapshot so the
 * chart line stays flat between real transactions. Only the backfill pipeline (which
 * replays transactions with historical FX rates) writes new invested values.
 */
export const POST = withMetrics("/api/portfolio/snapshot", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  let totalValueEUR: number;
  let callerInvestedEUR: number;
  let portfolioId: string;
  try {
    const body = await req.json();
    totalValueEUR = Number(body.totalValueEUR);
    callerInvestedEUR = Number(body.totalInvestedEUR) || 0;
    portfolioId = body.portfolioId || "";
    if (!Number.isFinite(totalValueEUR) || totalValueEUR < 0) {
      return NextResponse.json({ error: "Invalid totalValueEUR" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  /** 5-minute UTC buckets so repeated writes while the dashboard is open create distinct rows. */
  const now = new Date();
  const floored = new Date(now);
  floored.setUTCMinutes(Math.floor(floored.getUTCMinutes() / 5) * 5, 0, 0);
  const dateBucket =
    floored.toISOString().slice(0, 16).replace("T", " ") + ":00";
  const client = await ensureInitialized();

  // Prefer invested capital from the most recent DAILY snapshot (written by the
  // backfill with correct historical FX rates). Only fall back to the most recent
  // intraday snapshot or the caller's value when no daily row exists yet.
  const dailyResult = await client.execute({
    sql: `SELECT total_invested_eur FROM portfolio_snapshots
          WHERE user_id = ? AND portfolio_id = ? AND date NOT LIKE '% %'
          ORDER BY date DESC LIMIT 1`,
    args: [session.userId, portfolioId],
  });
  let prevInvested = dailyResult.rows.length > 0 ? Number(dailyResult.rows[0].total_invested_eur) : 0;
  if (prevInvested <= 0) {
    const anyResult = await client.execute({
      sql: `SELECT total_invested_eur FROM portfolio_snapshots
            WHERE user_id = ? AND portfolio_id = ?
            ORDER BY date DESC LIMIT 1`,
      args: [session.userId, portfolioId],
    });
    prevInvested = anyResult.rows.length > 0 ? Number(anyResult.rows[0].total_invested_eur) : 0;
  }
  const totalInvestedEUR = prevInvested > 0 ? prevInvested : callerInvestedEUR;

  await client.execute({
    sql: `INSERT INTO portfolio_snapshots (id, user_id, portfolio_id, date, total_value_eur, total_invested_eur)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, portfolio_id, date) DO UPDATE SET
            total_value_eur = excluded.total_value_eur,
            total_invested_eur = excluded.total_invested_eur`,
    args: [generateId(), session.userId, portfolioId, dateBucket, totalValueEUR, totalInvestedEUR],
  });

  return NextResponse.json({ ok: true, date: dateBucket, totalValueEUR, totalInvestedEUR });
});
