import { claimDueWatchForUser, listDueUserReturnWatches, claimUserReturnWatch } from "@/lib/db/user-return-watches";
import { enqueueProdOpsSupportUserReturnedEvent } from "@/lib/prodops";

/**
 * Near-realtime path from updateLastActive: notify once when a watched user returns.
 */
export async function notifyIfWatchedUserReturned(userId: string): Promise<boolean> {
  const watch = await claimDueWatchForUser(userId);
  if (!watch) return false;
  try {
    await enqueueProdOpsSupportUserReturnedEvent({
      userId: watch.userId,
      reason: watch.reason,
      emailSentAt: watch.emailSentAt,
    });
    return true;
  } catch (err) {
    console.warn("[user-return-watch] enqueue failed after claim:", err);
    return true;
  }
}

/** Cron path: scan open watches due for notification. */
export async function processDueUserReturnWatches(limit = 50): Promise<{
  checked: number;
  notified: number;
}> {
  const due = await listDueUserReturnWatches(limit);
  let notified = 0;
  for (const watch of due) {
    const claimed = await claimUserReturnWatch(watch.id);
    if (!claimed) continue;
    try {
      await enqueueProdOpsSupportUserReturnedEvent({
        userId: watch.userId,
        reason: watch.reason,
        emailSentAt: watch.emailSentAt,
      });
      notified++;
    } catch (err) {
      console.warn("[user-return-watch] cron enqueue failed:", watch.id, err);
    }
  }
  return { checked: due.length, notified };
}
