/** Client-safe trial banner helpers (no DB imports). */

export const TRIAL_BANNER_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

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
  if (!input.trialActivatedAt.trim()) return { show: false };
  const trialActivatedAt = input.trialActivatedAt.trim();
  if (!trialActivatedAt) return { show: false };

  if (input.plan === "pro" && !input.planExpiresAt.trim()) {
    return { show: false };
  }

  const expiryMs = parseMs(input.planExpiresAt);
  const activatedMs = parseMs(trialActivatedAt);
  const approxTrialEndMs = activatedMs !== null ? activatedMs + TRIAL_BANNER_DURATION_MS : null;
  const trialEndMs =
    expiryMs !== null && expiryMs > 0 ? expiryMs : approxTrialEndMs !== null ? approxTrialEndMs : null;

  if (trialEndMs === null) return { show: false };

  const now = input.nowMs;
  if (now > trialEndMs + 30 * TRIAL_BANNER_DURATION_MS) {
    return { show: false };
  }

  if (now < trialEndMs) {
    const remaining = trialEndMs - now;
    return {
      show: true,
      variant: "active",
      days: Math.floor(remaining / MS_PER_DAY),
      hours: Math.floor((remaining % MS_PER_DAY) / MS_PER_HOUR),
    };
  }

  return { show: true, variant: "expired" };
}
