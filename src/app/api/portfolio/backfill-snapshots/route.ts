import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ensureInitialized } from "@/lib/db/client";
import { str, num } from "@/lib/db/helpers";
import { withMetrics } from "@/lib/with-metrics";
import { runBackfillForUser } from "@/lib/backfill-snapshots";
import { acquireBackfillLock, releaseBackfillLock } from "@/lib/backfill-snapshots-lock";
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

  const [txResult, snapResult, userResult, missingInvestedResult, missingAssetTypeResult] = await Promise.all([
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
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM portfolio_snapshots
            WHERE user_id = ? AND total_value_eur > 0
              AND stock_value_eur = 0 AND etf_value_eur = 0 AND crypto_value_eur = 0`,
      args: [session.userId],
    }),
  ]);

  const earliestTx = str(txResult.rows[0]?.earliest) || null;
  const earliestSnapshot = str(snapResult.rows[0]?.earliest) || null;
  const snapshotCount = num(snapResult.rows[0]?.cnt);
  const backfilledAt = str(userResult.rows[0]?.snapshots_backfilled_at) || null;
  const missingInvestedCount = num(missingInvestedResult.rows[0]?.cnt);
  const missingAssetTypeCount = num(missingAssetTypeResult.rows[0]?.cnt);

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
  const needsAssetTypeBackfill = missingAssetTypeCount > 0;
  const needsBackfill = needsGapBackfill || needsInvestedBackfill || needsAssetTypeBackfill;

  const reason = needsAssetTypeBackfill
    ? "missing_asset_type_data"
    : needsInvestedBackfill
      ? "missing_invested_data"
      : undefined;

  return NextResponse.json({
    needsBackfill,
    reason,
    earliestTx,
    earliestSnapshot,
    snapshotCount,
    backfilledAt,
  });
});

/**
 * POST /api/portfolio/backfill-snapshots
 * Rebuilds daily historical snapshots from transactions + Yahoo price data.
 * Only deletes daily (non-intraday) rows so cron/client 5-min snapshots
 * survive even if the backfill times out partway through.
 */
export const POST = withMetrics("/api/portfolio/backfill-snapshots", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  if (!acquireBackfillLock(session.userId)) {
    return NextResponse.json({ inProgress: true }, { status: 409 });
  }

  try {
    const client = await ensureInitialized();

    // Only wipe daily (date-only) rows — intraday snapshots from the cron and
  // client sync are preserved. The history API already prefers intraday over
  // daily when both exist for the same calendar day, so there's no conflict.
  await client.execute({
    sql: `DELETE FROM portfolio_snapshots
          WHERE user_id = ? AND date NOT LIKE '% %' AND date NOT LIKE '%T%'`,
    args: [session.userId],
  });

  const result = await runBackfillForUser(session.userId);

  // Sync invested capital and per-asset-type values from the nearest daily
  // backfill row onto every intraday snapshot. Uses the most recent daily row
  // on-or-before the intraday date. Fixes stale invested/per-type values from
  // past cron writes or pre-migration snapshots.
  // Scalar subqueries return NULL when no daily row exists (e.g. backfill wrote
  // zero rows). COALESCE preserves NOT NULL columns and avoids SQLITE_CONSTRAINT.
  const syncResult = await client.execute({
    sql: `UPDATE portfolio_snapshots
          SET total_invested_eur = COALESCE((
            SELECT d.total_invested_eur
            FROM portfolio_snapshots d
            WHERE d.user_id = portfolio_snapshots.user_id
              AND d.portfolio_id = portfolio_snapshots.portfolio_id
              AND d.date NOT LIKE '% %'
              AND d.date NOT LIKE '%T%'
              AND d.date <= substr(portfolio_snapshots.date, 1, 10)
            ORDER BY d.date DESC
            LIMIT 1
          ), portfolio_snapshots.total_invested_eur, 0),
          stock_value_eur = CASE
            WHEN stock_value_eur = 0 AND etf_value_eur = 0 AND crypto_value_eur = 0 THEN COALESCE((
              SELECT d.stock_value_eur
              FROM portfolio_snapshots d
              WHERE d.user_id = portfolio_snapshots.user_id
                AND d.portfolio_id = portfolio_snapshots.portfolio_id
                AND d.date NOT LIKE '% %'
                AND d.date NOT LIKE '%T%'
                AND d.date <= substr(portfolio_snapshots.date, 1, 10)
                AND (d.stock_value_eur > 0 OR d.etf_value_eur > 0 OR d.crypto_value_eur > 0)
              ORDER BY d.date DESC
              LIMIT 1
            ), portfolio_snapshots.stock_value_eur, 0)
            ELSE stock_value_eur
          END,
          etf_value_eur = CASE
            WHEN stock_value_eur = 0 AND etf_value_eur = 0 AND crypto_value_eur = 0 THEN COALESCE((
              SELECT d.etf_value_eur
              FROM portfolio_snapshots d
              WHERE d.user_id = portfolio_snapshots.user_id
                AND d.portfolio_id = portfolio_snapshots.portfolio_id
                AND d.date NOT LIKE '% %'
                AND d.date NOT LIKE '%T%'
                AND d.date <= substr(portfolio_snapshots.date, 1, 10)
                AND (d.stock_value_eur > 0 OR d.etf_value_eur > 0 OR d.crypto_value_eur > 0)
              ORDER BY d.date DESC
              LIMIT 1
            ), portfolio_snapshots.etf_value_eur, 0)
            ELSE etf_value_eur
          END,
          crypto_value_eur = CASE
            WHEN stock_value_eur = 0 AND etf_value_eur = 0 AND crypto_value_eur = 0 THEN COALESCE((
              SELECT d.crypto_value_eur
              FROM portfolio_snapshots d
              WHERE d.user_id = portfolio_snapshots.user_id
                AND d.portfolio_id = portfolio_snapshots.portfolio_id
                AND d.date NOT LIKE '% %'
                AND d.date NOT LIKE '%T%'
                AND d.date <= substr(portfolio_snapshots.date, 1, 10)
                AND (d.stock_value_eur > 0 OR d.etf_value_eur > 0 OR d.crypto_value_eur > 0)
              ORDER BY d.date DESC
              LIMIT 1
            ), portfolio_snapshots.crypto_value_eur, 0)
            ELSE crypto_value_eur
          END
          WHERE user_id = ?
            AND date LIKE '% %'`,
    args: [session.userId],
  });
  const intradaySynced = syncResult.rowsAffected ?? 0;

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
      intradaySynced,
      message: "No transactions found",
    });
  }

  return NextResponse.json({ ...result, liveSnapshots, intradaySynced });
  } finally {
    releaseBackfillLock(session.userId);
  }
});
