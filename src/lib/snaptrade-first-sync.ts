import {
  findUserById,
  getUserSettings,
  countHoldings,
  createNotification,
  trackEvent,
  claimFirstSyncNotification,
  listPushSubscriptions,
} from "@/lib/db";
import { sendFirstSyncCompleteEmail, getEmailLocale } from "@/lib/email";
import { firstSyncCompleteStrings } from "@/lib/email-i18n/first-sync-strings";
import { firstSyncCompleteNotification } from "@/lib/notification-templates";
import { sendPushNotification } from "@/lib/web-push";

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
 * Sends email, in-app, and browser push once when a sync run creates the
 * user's first holdings (0 → N). Safe to call from cron or manual fetch.
 */
export async function maybeNotifyFirstSyncHoldings(
  userId: string,
  hadHoldingsBefore: number,
): Promise<void> {
  const holdingsAfter = await countHoldings(userId);
  if (!shouldNotifyFirstSync({ hadHoldingsBefore, holdingsAfter })) return;
  const claimed = await claimFirstSyncNotification(userId);
  if (!claimed) return;
  await sendFirstSyncCompleteHoldingsNotification(userId);
}

/**
 * Sends the one-time "your portfolio is ready" nudge (email + in-app + push).
 * Callers must have already claimed via claimFirstSyncNotification.
 */
export async function sendFirstSyncCompleteHoldingsNotification(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user || !user.email) return;

  const [settings, holdingsCount] = await Promise.all([
    getUserSettings(userId),
    countHoldings(userId),
  ]);
  const locale = getEmailLocale(settings.language);

  const strings = firstSyncCompleteStrings[locale] ?? firstSyncCompleteStrings.en;
  const pushBody = strings.bodyTemplate.replace("{{count}}", String(holdingsCount));

  const results = await Promise.allSettled([
    sendFirstSyncCompleteEmail(user.email, { positionCount: holdingsCount }, locale, userId),
    createNotification(userId, firstSyncCompleteNotification(holdingsCount)),
    sendFirstSyncPush(userId, strings.heading, pushBody),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(`[snaptrade-first-sync] notification failed for user ${userId}:`, result.reason);
    }
  }

  trackEvent(userId, "first_sync_notification_sent", { channel: "email+inapp+push" });
}

async function sendFirstSyncPush(userId: string, title: string, body: string): Promise<void> {
  const subs = await listPushSubscriptions(userId);
  if (subs.length === 0) return;
  await Promise.allSettled(
    subs.map((sub) =>
      sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        { title, body, url: "/" },
      ),
    ),
  );
}
