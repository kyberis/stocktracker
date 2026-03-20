import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { findUserById } from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import { runBackfillForUser } from "@/lib/backfill-snapshots";
import { materializeCurrentSnapshotsForUser } from "@/lib/cron-portfolio-snapshots";
import { withMetrics } from "@/lib/with-metrics";

export const maxDuration = 300;

/**
 * POST /api/admin/backfill-snapshots
 * Full snapshot rebuild for a specific user: historical backfill, stale-data
 * cleanup, intraday invested-capital repair, and live snapshot materialization.
 * Body: { userId: string }
 */
export const POST = withMetrics("/api/admin/backfill-snapshots", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let userId: string;
  try {
    const body = await req.json();
    userId = body.userId;
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const result = await runBackfillForUser(userId);

  const client = await ensureInitialized();

  const todayStr = new Date().toISOString().slice(0, 10);
  await client.execute({
    sql: `DELETE FROM portfolio_snapshots WHERE user_id = ? AND date = ?`,
    args: [userId, todayStr],
  });

  await client.execute({
    sql: `UPDATE portfolio_snapshots
          SET total_invested_eur = (
            SELECT ps2.total_invested_eur
            FROM portfolio_snapshots ps2
            WHERE ps2.user_id = portfolio_snapshots.user_id
              AND ps2.portfolio_id = portfolio_snapshots.portfolio_id
              AND ps2.date <= substr(portfolio_snapshots.date, 1, 10)
              AND ps2.date NOT LIKE '% %'
            ORDER BY ps2.date DESC
            LIMIT 1
          )
          WHERE user_id = ?
            AND date LIKE '% %'
            AND EXISTS (
              SELECT 1 FROM portfolio_snapshots ps3
              WHERE ps3.user_id = portfolio_snapshots.user_id
                AND ps3.portfolio_id = portfolio_snapshots.portfolio_id
                AND ps3.date <= substr(portfolio_snapshots.date, 1, 10)
                AND ps3.date NOT LIKE '% %'
            )`,
    args: [userId],
  });

  let liveSnapshots = 0;
  try {
    const live = await materializeCurrentSnapshotsForUser(userId);
    liveSnapshots = live.snapshots;
  } catch (e) {
    console.warn("[admin/backfill-snapshots] materializeCurrentSnapshotsForUser failed:", e);
  }

  return NextResponse.json({ ok: true, userId, ...result, liveSnapshots });
});
