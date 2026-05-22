import type { DbUser } from "@/lib/db/helpers";
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

export async function activateProTrial(userId: string): Promise<{ planExpiresAt: string }> {
  const { findUserById, updateUserSubscription } = await import("@/lib/db");
  const { ensureInitialized } = await import("@/lib/db/client");

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
  const { ensureInitialized } = await import("@/lib/db/client");
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

function parseMs(iso: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Derives trial banner state from auth user fields (pure, testable). */
export function getTrialBannerVisibility(input: {
  trialActivatedAt: string;
  plan: string;
  planExpiresAt: string;
  nowMs: number;
}): TrialBannerVisibility {
  const trialActivatedAt = input.trialActivatedAt.trim();
  if (!trialActivatedAt) return { show: false };

  if (input.plan === "pro" && !input.planExpiresAt.trim()) {
    return { show: false };
  }

  const expiryMs = parseMs(input.planExpiresAt);
  const activatedMs = parseMs(trialActivatedAt);
  const approxTrialEndMs = activatedMs !== null ? activatedMs + TRIAL_DURATION_MS : null;
  const trialEndMs =
    expiryMs !== null && expiryMs > 0 ? expiryMs : approxTrialEndMs !== null ? approxTrialEndMs : null;

  if (trialEndMs === null) return { show: false };

  const now = input.nowMs;
  if (now > trialEndMs + 30 * TRIAL_DURATION_MS) {
    return { show: false };
  }

  if (now < trialEndMs) {
    const remaining = trialEndMs - now;
    return {
      show: true,
      variant: "active",
      days: Math.floor(remaining / TRIAL_DURATION_MS),
      hours: Math.floor((remaining % TRIAL_DURATION_MS) / (60 * 60 * 1000)),
    };
  }

  return { show: true, variant: "expired" };
}
