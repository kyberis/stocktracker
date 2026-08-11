import { findUserById, getUserSettings, countHoldings, createNotification, trackEvent } from "@/lib/db";
import { sendFirstSyncCompleteEmail, getEmailLocale } from "@/lib/email";
import { firstSyncCompleteNotification } from "@/lib/notification-templates";

/**
 * True exactly on the 0 -> N holdings transition for a single sync run.
 * Extracted as a pure predicate so the cron's branching logic is testable
 * without mocking the ~20 DB imports that surround it in the cron itself.
 */
export function shouldNotifyFirstSync(input: {
  hadHoldingsBefore: number;
  holdingsAfter: number;
}): boolean {
  return input.hadHoldingsBefore === 0 && input.holdingsAfter > 0;
}

/**
 * Sends the one-time "your portfolio is ready" nudge (email + in-app) the
 * first time a newly-connected broker sync produces holdings. Callers must
 * have already claimed the notification via claimFirstSyncNotification so
 * this never double-sends. Fire-and-forget from the caller's perspective —
 * failures are logged, not thrown, so they never block the sync cron.
 */
export async function sendFirstSyncCompleteHoldingsNotification(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user || !user.email) return;

  const [settings, holdingsCount] = await Promise.all([
    getUserSettings(userId),
    countHoldings(userId),
  ]);
  const locale = getEmailLocale(settings.language);

  const results = await Promise.allSettled([
    sendFirstSyncCompleteEmail(user.email, { positionCount: holdingsCount }, locale, userId),
    createNotification(userId, firstSyncCompleteNotification(holdingsCount)),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(`[snaptrade-first-sync] notification failed for user ${userId}:`, result.reason);
    }
  }

  trackEvent(userId, "first_sync_notification_sent", { channel: "email+inapp" });
}
