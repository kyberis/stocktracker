import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ensureInitialized } from "@/lib/db/client";
import { generateId } from "@/lib/utils";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

/**
 * POST /api/portfolio/snapshot
 * Upserts today's portfolio snapshot. Called from GrowthTab after portfolio loads.
 * Body: { totalValueEUR: number, totalInvestedEUR?: number, portfolioId?: string }
 */
export const POST = withMetrics("/api/portfolio/snapshot", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  let totalValueEUR: number;
  let totalInvestedEUR: number;
  let portfolioId: string;
  try {
    const body = await req.json();
    totalValueEUR = Number(body.totalValueEUR);
    totalInvestedEUR = Number(body.totalInvestedEUR) || 0;
    portfolioId = body.portfolioId || "";
    if (!Number.isFinite(totalValueEUR) || totalValueEUR < 0) {
      return NextResponse.json({ error: "Invalid totalValueEUR" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  /** 15-minute UTC buckets so repeated writes while the dashboard is open create distinct rows. */
  const now = new Date();
  const floored = new Date(now);
  floored.setUTCMinutes(Math.floor(floored.getUTCMinutes() / 15) * 15, 0, 0);
  const dateBucket =
    floored.toISOString().slice(0, 16).replace("T", " ") + ":00";
  const client = await ensureInitialized();

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
