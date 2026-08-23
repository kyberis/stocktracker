import { ensureInitialized } from "@/lib/db/client";
import { str, type DbUser, type UserPlan } from "@/lib/db/helpers";
import {
  updateUserSubscription,
  getUserSettings,
  updateUserSettings,
  createNotification,
  isFeatureEnabled,
} from "@/lib/db";
import { canAccessTheme, effectivePlan } from "@/lib/subscription";
import { planExpiredNotification } from "@/lib/notification-templates";
import { sendTrialExpiredEmail, getEmailLocale } from "@/lib/email";
import { computeTrialGrowth } from "@/lib/trial-growth";

export type TrialExpirationUser = Pick<
  DbUser,
  | "id"
  | "email"
  | "display_name"
  | "trial_activated_at"
  | "plan"
  | "plan_expires_at"
  | "trial_expired_notified"
>;

export type ExpireTrialResult = {
  expired: boolean;
  plan: UserPlan;
};

function parseExpiresAtMs(planExpiresAt: string): number {
  const direct = Date.parse(planExpiresAt);
  if (!Number.isNaN(direct)) return direct;
  const iso = planExpiresAt.includes("T") ? planExpiresAt : `${planExpiresAt.replace(" ", "T")}Z`;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

export function isDueTrialExpirationCandidate(user: TrialExpirationUser): boolean {
  if (!user.trial_activated_at.trim()) return false;
  if (user.plan !== "pro") return false;
  if (!user.plan_expires_at.trim()) return false;
  if (user.trial_expired_notified === 1) return false;
  const expiresMs = parseExpiresAtMs(user.plan_expires_at);
  if (Number.isNaN(expiresMs)) return true;
  return expiresMs < Date.now();
}

export async function expireDueTrialUser(user: TrialExpirationUser): Promise<ExpireTrialResult> {
  const userId = user.id;
  await updateUserSubscription(userId, { plan: "free", planExpiresAt: "" });
  const settings = await getUserSettings(userId);
  if (!canAccessTheme(settings.dashboardTheme, "free")) {
    await updateUserSettings(userId, { dashboardTheme: "default" });
  }
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET trial_expired_notified = 1 WHERE id = ?",
    args: [userId],
  });
  await createNotification(userId, planExpiredNotification());

  const trialStart = str(user.trial_activated_at).slice(0, 10);
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
  await sendTrialExpiredEmail(str(user.email), str(user.display_name), locale, userId, growthPct);
  return { expired: true, plan: "free" };
}

export async function runTrialExpirationJob(): Promise<Record<string, unknown>> {
  if (!(await isFeatureEnabled("pro_trial_enabled"))) {
    return { skipped: true, reason: "pro_trial_enabled flag is off" };
  }
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT u.id, u.email, u.display_name, u.trial_activated_at, u.plan_expires_at
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
      await expireDueTrialUser({
        id: userId,
        email: str(row.email),
        display_name: str(row.display_name),
        trial_activated_at: str(row.trial_activated_at),
        plan: "pro",
        plan_expires_at: str(row.plan_expires_at),
        trial_expired_notified: 0,
      });
      expired++;
    } catch (err) {
      console.error(`[cron:trial-expiration] user ${userId}:`, err);
      errors++;
    }
  }

  return { expired, errors };
}

/**
 * Persist a due trial downgrade on login so the session cookie is free
 * without waiting for the daily cron. No-ops when the user is not a
 * due-trial candidate so the hot path stays cheap.
 */
export async function maybeExpireTrialOnLogin(user: TrialExpirationUser): Promise<ExpireTrialResult> {
  const effective = effectivePlan(user.plan, user.plan_expires_at);
  if (!isDueTrialExpirationCandidate(user)) {
    return { expired: false, plan: effective };
  }
  try {
    if (!(await isFeatureEnabled("pro_trial_enabled"))) {
      return { expired: false, plan: effective };
    }
    return await expireDueTrialUser(user);
  } catch (err) {
    console.error("[trial-expiration] login check failed", err);
    return { expired: false, plan: effective };
  }
}
