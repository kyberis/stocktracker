/** Client-safe plan-expiry banner (trial + complimentary sunset). */

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export type PlanExpiryBannerVariant = "active" | "expired";

export interface PlanExpiryBannerVisibility {
  show: boolean;
  variant?: PlanExpiryBannerVariant;
  days?: number;
  hours?: number;
  kind?: "trial" | "sunset";
}

function parseMs(iso: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Show a countdown whenever a non-Stripe paid plan has a future expiry,
 * or a recently ended expiry (expired variant).
 */
export function getPlanExpiryBannerVisibility(input: {
  trialActivatedAt: string;
  plan: string;
  planExpiresAt: string;
  stripeManaged?: boolean;
  nowMs: number;
}): PlanExpiryBannerVisibility {
  if (input.stripeManaged) return { show: false };

  const expiryMs = parseMs(input.planExpiresAt);
  if (expiryMs === null) return { show: false };

  const kind = input.trialActivatedAt.trim() ? "trial" : "sunset";
  const now = input.nowMs;

  if (now < expiryMs) {
    const remaining = expiryMs - now;
    return {
      show: true,
      variant: "active",
      kind,
      days: Math.floor(remaining / MS_PER_DAY),
      hours: Math.floor((remaining % MS_PER_DAY) / MS_PER_HOUR),
    };
  }

  const hideAfter = 14 * MS_PER_DAY;
  if (now > expiryMs + hideAfter) return { show: false };

  return { show: true, variant: "expired", kind };
}
