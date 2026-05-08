import { NextRequest } from "next/server";
import { ensureInitialized } from "@/lib/db/client";
import { str } from "@/lib/db/helpers";
import { updateUserSubscription, getUserSettings, updateUserSettings, createNotification, isFeatureEnabled } from "@/lib/db";
import { canAccessTheme } from "@/lib/subscription";
import { planExpiredNotification } from "@/lib/notification-templates";
import { sendTrialExpiredEmail, getEmailLocale } from "@/lib/email";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { computeTrialGrowth } from "@/lib/trial-growth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runTrialExpiration = withCronLogging("trial-expiration", async () => {
  if (!(await isFeatureEnabled("pro_trial_enabled"))) {
    return { skipped: true, reason: "pro_trial_enabled flag is off" };
  }
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT u.id, u.email, u.display_name, u.experience_level, u.trial_activated_at
FROM users u
WHERE u.trial_activated_at != ''
  AND u.plan = 'pro'
  AND u.plan_expires_at != ''
  AND u.plan_expires_at < datetime('now')
  AND u.trial_expired_notified = 0
LIMIT 50`,
    args: [],
  });

  let expired = 0;
  let errors = 0;

  for (const row of result.rows) {
    const userId = str(row.id);
    try {
      await updateUserSubscription(userId, { plan: "free", planExpiresAt: "" });
      const settings = await getUserSettings(userId);
      if (!canAccessTheme(settings.dashboardTheme, "free")) {
        await updateUserSettings(userId, { dashboardTheme: "default" });
      }
      await client.execute({
        sql: "UPDATE users SET trial_expired_notified = 1 WHERE id = ?",
        args: [userId],
      });
      await createNotification(userId, planExpiredNotification());

      const trialStart = str(row.trial_activated_at).slice(0, 10);
      const [startSnap, endSnap] = await Promise.all([
        client.execute({
          sql: "SELECT total_value_eur FROM portfolio_snapshots WHERE user_id = ? AND portfolio_id = '' AND date >= ? ORDER BY date ASC LIMIT 1",
          args: [userId, trialStart],
        }),
        client.execute({
          sql: "SELECT total_value_eur FROM portfolio_snapshots WHERE user_id = ? AND portfolio_id = '' ORDER BY date DESC LIMIT 1",
          args: [userId],
        }),
      ]);
      const startVal = startSnap.rows[0]?.total_value_eur as number | undefined;
      const endVal = endSnap.rows[0]?.total_value_eur as number | undefined;
      const growthPct = computeTrialGrowth(startVal, endVal);

      const locale = getEmailLocale(settings.language || "en");
      await sendTrialExpiredEmail(str(row.email), str(row.display_name), locale, userId, growthPct);
      expired++;
    } catch (err) {
      console.error(`[cron:trial-expiration] user ${userId}:`, err);
      errors++;
    }
  }

  return { expired, errors };
});

function authorize(req: NextRequest) {
  return verifyCronAuth("trial-expiration", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runTrialExpiration();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runTrialExpiration();
}
