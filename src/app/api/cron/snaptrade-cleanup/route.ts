import {
  getSnapTradeConnectionsPendingDeletion,
  getConnectionsAllDisabledOver24h,
  deleteSnapTradeConnection,
  detachSnapTradeHoldings,
  trackEvent,
  pruneOldSnapTradeLogs,
} from "@/lib/db";
import { deleteUser } from "@/lib/snaptrade-client";
import { withCronLogging } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Cron (daily 23:30 UTC) — two cleanup paths:
 *
 * Path 1: Downgraded to Folio (free) — delete connections whose
 *         pending_delete_at has passed (end-of-month scheduling).
 *
 * Path 2: Paid users (Bifolio / Trefolio) with ALL broker connections
 *         disabled for >24 h — the credentials are stale and will keep
 *         incurring the $2/connected-user/month SnapTrade charge.
 */
export const GET = withCronLogging("snaptrade-cleanup", async () => {
  let deletedDowngrade = 0;
  let deletedStale = 0;

  // Path 1: scheduled end-of-month deletions (downgrade to free)
  const pending = await getSnapTradeConnectionsPendingDeletion();
  for (const conn of pending) {
    await detachSnapTradeHoldings(conn.userId);
    try {
      await deleteUser(conn.snapTradeUserId);
    } catch (err) {
      console.error(
        `[snaptrade-cleanup] Path 1 — failed to deregister ${conn.snapTradeUserId}:`,
        err instanceof Error ? err.message : err,
      );
    }
    await deleteSnapTradeConnection(conn.userId);
    trackEvent(conn.userId, "snaptrade_auto_disconnected", { reason: "downgrade" });
    deletedDowngrade++;
  }

  // Path 2: paid users with all brokers disabled for >24 h
  const stale = await getConnectionsAllDisabledOver24h();
  for (const conn of stale) {
    await detachSnapTradeHoldings(conn.userId);
    try {
      await deleteUser(conn.snapTradeUserId);
    } catch (err) {
      console.error(
        `[snaptrade-cleanup] Path 2 — failed to deregister ${conn.snapTradeUserId}:`,
        err instanceof Error ? err.message : err,
      );
    }
    await deleteSnapTradeConnection(conn.userId);
    trackEvent(conn.userId, "snaptrade_auto_disconnected", { reason: "all_disabled_24h" });
    deletedStale++;
  }

  // Prune SnapTrade API logs older than 30 days
  const prunedLogs = await pruneOldSnapTradeLogs(30);

  return {
    deletedDowngrade,
    deletedStale,
    deleted: deletedDowngrade + deletedStale,
    prunedLogs,
  };
});
