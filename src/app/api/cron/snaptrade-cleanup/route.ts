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
 * Cron: deregister SnapTrade users whose Pro subscription lapsed 1+ hour ago.
 * Removes the $2/connected-user/month cost from SnapTrade.
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
