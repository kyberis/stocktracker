import { NextRequest } from "next/server";
import {
  getSnapTradeConnectionsPendingDeletion,
  getConnectionsAllDisabledOver24h,
  listIdleSnapTradeConnections,
  deleteSnapTradeConnection,
  detachSnapTradeHoldings,
  removeAllBrokerPortfolioMappings,
  trackEvent,
  pruneOldSnapTradeLogs,
} from "@/lib/db";
import { deleteUser } from "@/lib/snaptrade-client";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron (daily 23:30 UTC) — three cleanup paths:
 *
 * Path 1: Downgraded to Folio (free) — delete connections whose
 *         pending_delete_at has passed (end-of-month scheduling).
 *
 * Path 2: Paid users (Trefolio) with ALL broker connections
 *         disabled for >24 h — the credentials are stale and will keep
 *         incurring the $2/connected-user/month SnapTrade charge.
 *
 * Path 3: Users idle >30 days — drop seats that the hourly sync already skips.
 */
const runJob = withCronLogging("snaptrade-cleanup", async () => {
  let deletedDowngrade = 0;
  let deletedStale = 0;
  let deletedIdle = 0;

  async function disconnect(
    userId: string,
    snapTradeUserId: string,
    reason: string,
  ): Promise<void> {
    await detachSnapTradeHoldings(userId);
    try {
      await deleteUser(snapTradeUserId);
    } catch (err) {
      console.error(
        `[snaptrade-cleanup] failed to deregister ${snapTradeUserId} (${reason}):`,
        err instanceof Error ? err.message : err,
      );
    }
    await deleteSnapTradeConnection(userId);
    await removeAllBrokerPortfolioMappings(userId);
    trackEvent(userId, "snaptrade_auto_disconnected", { reason });
  }

  // Path 1: scheduled end-of-month deletions (downgrade to free)
  const pending = await getSnapTradeConnectionsPendingDeletion();
  for (const conn of pending) {
    await disconnect(conn.userId, conn.snapTradeUserId, "downgrade");
    deletedDowngrade++;
  }

  // Path 2: paid users with all brokers disabled for >24 h
  const stale = await getConnectionsAllDisabledOver24h();
  for (const conn of stale) {
    await disconnect(conn.userId, conn.snapTradeUserId, "all_disabled_24h");
    deletedStale++;
  }

  // Path 3: idle users (no activity in SNAPTRADE_CRON_ACTIVE_DAYS)
  const idle = await listIdleSnapTradeConnections();
  for (const conn of idle) {
    await disconnect(conn.userId, conn.snapTradeUserId, "idle_inactive");
    deletedIdle++;
  }

  // Prune SnapTrade API logs older than 30 days
  const prunedLogs = await pruneOldSnapTradeLogs(30);

  return {
    deletedDowngrade,
    deletedStale,
    deletedIdle,
    deleted: deletedDowngrade + deletedStale + deletedIdle,
    prunedLogs,
  };
});

function authorize(req: NextRequest) {
  return verifyCronAuth("snaptrade-cleanup", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runJob();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runJob();
}
