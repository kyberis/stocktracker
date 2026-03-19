import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ensureInitialized } from "@/lib/db/client";
import { str, num } from "@/lib/db/helpers";
import { withMetrics } from "@/lib/with-metrics";
import { runBackfillForUser } from "@/lib/backfill-snapshots";
import { materializeCurrentSnapshotsForUser } from "@/lib/cron-portfolio-snapshots";

export const dynamic = "force-dynamic";
/** Historical replay + Yahoo can exceed 60s for large histories */
export const maxDuration = 300;

/**
 * GET /api/portfolio/backfill-snapshots?check=true
 * Lightweight check: do we need to backfill?
 */
export const GET = withMetrics("/api/portfolio/backfill-snapshots", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const client = await ensureInitialized();

  const [txResult, snapResult, userResult, missingInvestedResult] = await Promise.all([
    client.execute({
      sql: "SELECT MIN(date) as earliest FROM transactions WHERE user_id = ? AND type IN ('buy','sell')",
      args: [session.userId],
    }),
    client.execute({
      sql: "SELECT MIN(date) as earliest, COUNT(*) as cnt FROM portfolio_snapshots WHERE user_id = ?",
      args: [session.userId],
    }),
    client.execute({
      sql: "SELECT snapshots_backfilled_at FROM users WHERE id = ?",
      args: [session.userId],
    }),
    client.execute({
      sql: "SELECT COUNT(*) as cnt FROM portfolio_snapshots WHERE user_id = ? AND total_value_eur > 0 AND total_invested_eur = 0",
      args: [session.userId],
    }),
  ]);

  const earliestTx = str(txResult.rows[0]?.earliest) || null;
  const earliestSnapshot = str(snapResult.rows[0]?.earliest) || null;
  const snapshotCount = num(snapResult.rows[0]?.cnt);
  const backfilledAt = str(userResult.rows[0]?.snapshots_backfilled_at) || null;
  const missingInvestedCount = num(missingInvestedResult.rows[0]?.cnt);

  if (!earliestTx) {
    return NextResponse.json({ needsBackfill: false, reason: "no_transactions" });
  }

  const txDate = new Date(earliestTx);
  const snapDate = earliestSnapshot ? new Date(earliestSnapshot) : null;
  const gapDays = snapDate
    ? Math.floor((snapDate.getTime() - txDate.getTime()) / 86400000)
    : Infinity;

  const needsGapBackfill = gapDays > 7 && (!backfilledAt || backfilledAt < earliestTx);
  const needsInvestedBackfill = missingInvestedCount > 0;
  const needsBackfill = needsGapBackfill || needsInvestedBackfill;

  return NextResponse.json({
    needsBackfill,
    reason: needsInvestedBackfill ? "missing_invested_data" : undefined,
    earliestTx,
    earliestSnapshot,
    snapshotCount,
    backfilledAt,
  });
});

/**
 * POST /api/portfolio/backfill-snapshots
 * Reconstructs historical portfolio value from transactions + Yahoo price data,
 * then repairs any intraday snapshots whose invested capital diverges from the
 * backfill's historical-rate values.
 */
export const POST = withMetrics("/api/portfolio/backfill-snapshots", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const result = await runBackfillForUser(session.userId);

  // Repair intraday (15-min) snapshots: carry forward invested capital from the
  // nearest preceding daily snapshot written by the backfill so the invested line
  // stays flat between real transactions. Intraday rows have a space in the date
  // column (e.g. "2026-03-19 22:15:00") vs daily rows ("2026-03-19").
  const client = await ensureInitialized();
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
    args: [session.userId],
  });

  let liveSnapshots = 0;
  try {
    const live = await materializeCurrentSnapshotsForUser(session.userId);
    liveSnapshots = live.snapshots;
  } catch (e) {
    console.warn("[backfill-snapshots] materializeCurrentSnapshotsForUser failed:", e);
  }

  if (result.snapshotsCreated === 0) {
    return NextResponse.json({
      snapshotsCreated: 0,
      liveSnapshots,
      message: "No transactions found",
    });
  }

  return NextResponse.json({ ...result, liveSnapshots });
});
