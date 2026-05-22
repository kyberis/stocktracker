import { findUserById, updateUserSubscription } from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import type { DbUser } from "@/lib/db/helpers";
import { str } from "@/lib/db/helpers";
import { effectivePlan } from "@/lib/subscription";

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type TrialActivationError =
  | "user_not_found"
  | "already_activated"
  | "not_free_plan"
  | "invalid_token";

export function getTrialPlanExpiresAt(fromMs = Date.now()): string {
  return new Date(fromMs + TRIAL_DURATION_MS).toISOString();
}

export function getTrialEligibilityError(
  user: DbUser,
  opts?: { token?: string },
): TrialActivationError | null {
  if (user.trial_activated_at !== "") return "already_activated";
  if (user.plan !== "free") return "not_free_plan";
  if (opts?.token !== undefined && user.trial_token !== opts.token) return "invalid_token";
  return null;
}

/** True when the user activated a trial and local plan expiry is still in the future. */
export function isLocalTrialActive(user: Pick<DbUser, "trial_activated_at" | "plan" | "plan_expires_at">): boolean {
  if (!user.trial_activated_at.trim()) return false;
  return effectivePlan(user.plan, user.plan_expires_at) === "pro";
}

function parseMs(iso: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Restores plan expiry from activation time when still inside the 7-day window. */
export function getTrialRepairPlanExpiresAt(trialActivatedAt: string, nowMs = Date.now()): string | null {
  const activatedMs = parseMs(trialActivatedAt);
  if (activatedMs === null) return null;
  const trialEndMs = activatedMs + TRIAL_DURATION_MS;
  if (nowMs >= trialEndMs) return null;
  return new Date(trialEndMs).toISOString();
}

/** User lost Pro after onboarding trial activation but is still within the trial window. */
export function isTrialEntitlementRepairCandidate(
  user: Pick<DbUser, "trial_activated_at" | "plan" | "plan_expires_at" | "stripe_subscription_id">,
  nowMs = Date.now(),
): boolean {
  if (!user.trial_activated_at.trim()) return false;
  if (user.stripe_subscription_id.trim()) return false;
  if (isLocalTrialActive(user)) return false;
  return getTrialRepairPlanExpiresAt(user.trial_activated_at, nowMs) !== null;
}

export interface TrialEntitlementRepairRow {
  userId: string;
  email: string;
  trialActivatedAt: string;
  planExpiresAt: string;
}

export async function listTrialEntitlementRepairCandidates(userId?: string): Promise<TrialEntitlementRepairRow[]> {
  const client = await ensureInitialized();
  const result = userId
    ? await client.execute({
        sql: `SELECT id, email, trial_activated_at, plan, plan_expires_at, stripe_subscription_id
              FROM users WHERE id = ? AND trial_activated_at != ''`,
        args: [userId],
      })
    : await client.execute({
        sql: `SELECT id, email, trial_activated_at, plan, plan_expires_at, stripe_subscription_id
              FROM users WHERE trial_activated_at != ''`,
        args: [],
      });

  const nowMs = Date.now();
  const rows: TrialEntitlementRepairRow[] = [];
  for (const row of result.rows) {
    const trialActivatedAt = str(row.trial_activated_at);
    const snapshot = {
      trial_activated_at: trialActivatedAt,
      plan: str(row.plan) as DbUser["plan"],
      plan_expires_at: str(row.plan_expires_at),
      stripe_subscription_id: str(row.stripe_subscription_id),
    };
    const planExpiresAt = getTrialRepairPlanExpiresAt(trialActivatedAt, nowMs);
    if (!isTrialEntitlementRepairCandidate(snapshot, nowMs) || !planExpiresAt) continue;
    rows.push({
      userId: str(row.id),
      email: str(row.email),
      trialActivatedAt,
      planExpiresAt,
    });
  }
  return rows;
}

export async function repairTrialEntitlements(opts: {
  userId?: string;
  dryRun?: boolean;
}): Promise<{ dryRun: boolean; repaired: TrialEntitlementRepairRow[]; skipped: number }> {
  const candidates = await listTrialEntitlementRepairCandidates(opts.userId);
  const repaired: TrialEntitlementRepairRow[] = [];

  for (const candidate of candidates) {
    if (!opts.dryRun) {
      await updateUserSubscription(candidate.userId, {
        plan: "pro",
        planExpiresAt: candidate.planExpiresAt,
      });
      if (candidate.email) {
        await syncOnboardingTrialToIdp(candidate.email, candidate.planExpiresAt);
      }
    }
    repaired.push(candidate);
  }

  return {
    dryRun: !!opts.dryRun,
    repaired,
    skipped: 0,
  };
}

export async function activateProTrial(userId: string): Promise<{ planExpiresAt: string }> {
  const user = await findUserById(userId);
  if (!user) throw new Error("user_not_found");

  const eligibilityError = getTrialEligibilityError(user);
  if (eligibilityError) throw new Error(eligibilityError);

  const planExpiresAt = getTrialPlanExpiresAt();
  await updateUserSubscription(userId, { plan: "pro", planExpiresAt });

  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE users
          SET trial_activated_at = datetime('now'),
              trial_invited_at = CASE WHEN trial_invited_at = '' THEN datetime('now') ELSE trial_invited_at END
          WHERE id = ?`,
    args: [userId],
  });

  return { planExpiresAt };
}

export async function markTrialOfferShown(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE users SET trial_invited_at = datetime('now') WHERE id = ? AND trial_invited_at = ''`,
    args: [userId],
  });
}

export async function syncOnboardingTrialToIdp(email: string, planExpiresAt: string): Promise<void> {
  const { isIdpEnabled } = await import("@/lib/idp/config");
  const { importUser } = await import("@/lib/idp/client");
  if (!isIdpEnabled()) return;

  try {
    await importUser({
      email,
      plan: "pro",
      proUntil: planExpiresAt,
    });
  } catch (err) {
    console.error(
      "[idp] failed to sync onboarding trial:",
      err instanceof Error ? err.message : err,
    );
  }
}

export type TrialBannerVariant = "active" | "expired";

export interface TrialBannerVisibility {
  show: boolean;
  variant?: TrialBannerVariant;
  days?: number;
  hours?: number;
}

export { getTrialBannerVisibility } from "./trial-banner-visibility";
