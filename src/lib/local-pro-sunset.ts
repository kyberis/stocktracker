import { ensureInitialized } from "@/lib/db/client";
import { str } from "@/lib/db/helpers";
import { updateUserSubscription } from "@/lib/db/users";
import { effectivePlan } from "@/lib/subscription";
import { parseSubscriptionPlan } from "@/lib/plan-rank";
import { syncLocalPlanToIdp } from "@/lib/idp/sync-plan";

export const LOCAL_PRO_SUNSET_DAYS = 7;
export const LOCAL_PRO_SUNSET_MS = LOCAL_PRO_SUNSET_DAYS * 24 * 60 * 60 * 1000;

export type LocalProSunsetRow = {
  userId: string;
  email: string;
  displayName: string;
  plan: string;
  planExpiresAt: string;
  stripeSubscriptionId: string;
  planSunsetNotifiedAt: string;
};

export function isStripeManaged(stripeSubscriptionId: string): boolean {
  return stripeSubscriptionId.trim().length > 0;
}

export function isLocalProSunsetCandidate(row: {
  plan: string;
  planExpiresAt: string;
  stripeSubscriptionId: string;
}): boolean {
  if (isStripeManaged(row.stripeSubscriptionId)) return false;
  const plan = parseSubscriptionPlan(row.plan);
  return effectivePlan(plan, row.planExpiresAt) === "pro";
}

export function getSunsetExpiresAt(fromMs = Date.now()): string {
  return new Date(fromMs + LOCAL_PRO_SUNSET_MS).toISOString();
}

export async function listLocalProSunsetCandidates(): Promise<LocalProSunsetRow[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, email, display_name, plan, plan_expires_at, stripe_subscription_id, plan_sunset_notified_at
          FROM users
          WHERE plan = 'pro'`,
    args: [],
  });

  const rows: LocalProSunsetRow[] = [];
  for (const row of result.rows) {
    const candidate = {
      userId: str(row.id),
      email: str(row.email),
      displayName: str(row.display_name),
      plan: str(row.plan),
      planExpiresAt: str(row.plan_expires_at),
      stripeSubscriptionId: str(row.stripe_subscription_id),
      planSunsetNotifiedAt: str(row.plan_sunset_notified_at),
    };
    if (
      isLocalProSunsetCandidate({
        plan: candidate.plan,
        planExpiresAt: candidate.planExpiresAt,
        stripeSubscriptionId: candidate.stripeSubscriptionId,
      })
    ) {
      rows.push(candidate);
    }
  }
  return rows;
}

export async function applyLocalProSunset(opts: {
  dryRun?: boolean;
  nowMs?: number;
}): Promise<{
  dryRun: boolean;
  candidates: number;
  updated: number;
  skippedStripe: number;
  alreadyNotified: number;
}> {
  const dryRun = !!opts.dryRun;
  const expiresAt = getSunsetExpiresAt(opts.nowMs);
  const all = await listLocalProSunsetCandidates();
  let updated = 0;
  let alreadyNotified = 0;

  for (const row of all) {
    if (row.planSunsetNotifiedAt.trim()) {
      alreadyNotified++;
      continue;
    }
    if (dryRun) {
      updated++;
      continue;
    }
    await updateUserSubscription(row.userId, { plan: "pro", planExpiresAt: expiresAt });
    const client = await ensureInitialized();
    await client.execute({
      sql: `UPDATE users
            SET plan_sunset_notified_at = datetime('now'),
                plan_before_trial = CASE WHEN plan_before_trial = '' THEN 'free' ELSE plan_before_trial END
            WHERE id = ?`,
      args: [row.userId],
    });
    if (row.email) {
      await syncLocalPlanToIdp(row.userId, row.email, "pro", expiresAt);
      const { sendLocalProSunsetEmail, getEmailLocale } = await import("@/lib/email");
      const { getUserSettings } = await import("@/lib/db");
      const settings = await getUserSettings(row.userId);
      const locale = getEmailLocale(settings.language || "en");
      const endsOn = new Date(expiresAt).toISOString().slice(0, 10);
      await sendLocalProSunsetEmail(row.email, row.displayName, endsOn, locale, row.userId);
    }
    updated++;
  }

  return {
    dryRun,
    candidates: all.length,
    updated,
    skippedStripe: 0,
    alreadyNotified,
  };
}

export type ExpiredLocalProRow = {
  userId: string;
  email: string;
  planBeforeTrial: string;
  stripeSubscriptionId: string;
};

export async function listExpiredLocalPro(): Promise<ExpiredLocalProRow[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, email, plan, plan_expires_at, plan_before_trial, stripe_subscription_id
          FROM users
          WHERE plan = 'pro'
            AND plan_expires_at != ''
            AND plan_expires_at < datetime('now')
            AND (stripe_subscription_id = '' OR stripe_subscription_id IS NULL)
          LIMIT 100`,
    args: [],
  });

  return result.rows.map((row) => ({
    userId: str(row.id),
    email: str(row.email),
    planBeforeTrial: str(row.plan_before_trial),
    stripeSubscriptionId: str(row.stripe_subscription_id),
  }));
}

export async function persistExpiredLocalPro(row: ExpiredLocalProRow): Promise<string> {
  const restored = parseSubscriptionPlan(row.planBeforeTrial);
  const restorePlan = restored === "basic" ? "basic" : "free";
  await updateUserSubscription(row.userId, { plan: restorePlan, planExpiresAt: "" });
  if (row.email) {
    await syncLocalPlanToIdp(row.userId, row.email, restorePlan, "");
  }
  return restorePlan;
}

export async function runExpiredLocalProJob(): Promise<{ expired: number; errors: number }> {
  const rows = await listExpiredLocalPro();
  let expired = 0;
  let errors = 0;
  for (const row of rows) {
    try {
      await persistExpiredLocalPro(row);
      expired++;
    } catch (err) {
      console.error(`[cron:local-pro-sunset] user ${row.userId}:`, err);
      errors++;
    }
  }
  return { expired, errors };
}
