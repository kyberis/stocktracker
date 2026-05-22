import { findUserById, updateUserSubscription } from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import type { DbUser } from "@/lib/db/helpers";

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
