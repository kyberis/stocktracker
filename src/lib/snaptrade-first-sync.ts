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

/** Delay before re-fetching when SnapTrade triggers an async broker pull. */
export const SNAPTRADE_OAUTH_RETRY_DELAY_MS = 30_000;

const OAUTH_PENDING_KEY = "snaptrade_oauth_pending";

export function markSnapTradeOAuthPending(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OAUTH_PENDING_KEY, "1");
  } catch {
    // private browsing or quota exceeded
  }
}

export function consumeSnapTradeOAuthPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(OAUTH_PENDING_KEY) !== "1") return false;
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
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
