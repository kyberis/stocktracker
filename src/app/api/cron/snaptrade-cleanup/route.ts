import { NextResponse } from "next/server";
import {
  getSnapTradeConnectionsPendingDeletion,
  deleteSnapTradeConnection,
  trackEvent,
} from "@/lib/db";
import { deleteUser } from "@/lib/snaptrade-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Cron (daily 23:30 UTC): deregister SnapTrade users scheduled for end-of-month
 * deletion after a downgrade. Runs daily; only deletes connections whose
 * pending_delete_at has passed. Prevents the $2/connected-user/month SnapTrade
 * charge from rolling into the next billing cycle.
 */
export async function GET() {
  const pending = await getSnapTradeConnectionsPendingDeletion();
  if (pending.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  let deleted = 0;
  for (const conn of pending) {
    try {
      await deleteUser(conn.snapTradeUserId);
    } catch (err) {
      console.error(
        `[snaptrade-cleanup] Failed to deregister SnapTrade user ${conn.snapTradeUserId}:`,
        err instanceof Error ? err.message : err,
      );
    }
    await deleteSnapTradeConnection(conn.userId);
    trackEvent(conn.userId, "snaptrade_auto_disconnected", { reason: "downgrade" });
    deleted++;
  }

  return NextResponse.json({ deleted });
}
