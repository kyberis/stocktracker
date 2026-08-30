import type { AuthQuotaUsage } from "@/lib/auth-context";
import type { QuotaWindow } from "@/lib/platform-config";
import { fill, type ScreeningCopy } from "@/lib/screening/copy";

export type ScreeningQuotaKind = "ok" | "not_included" | "exhausted";

export interface ScreeningQuotaMessage {
  kind: ScreeningQuotaKind;
  text: string;
  /** True when the user should see a Compare plans /billing CTA. */
  showUpgrade: boolean;
}

export type ScreeningQuotaSlice = Pick<
  AuthQuotaUsage,
  "used" | "limit" | "remaining" | "resetAt" | "window"
>;

function windowLabel(copy: ScreeningCopy, window: QuotaWindow): string {
  switch (window) {
    case "week":
      return copy.quota.windowWeek;
    case "day":
      return copy.quota.windowDay;
    case "year":
      return copy.quota.windowYear;
    case "month":
    default:
      return copy.quota.windowMonth;
  }
}

/** Format `resetAt` ISO for the quota banner (UTC calendar date). */
export function formatQuotaResetDate(resetAt: string, language: string | undefined): string {
  const d = new Date(resetAt);
  if (Number.isNaN(d.getTime())) return resetAt;
  const locale = (language || "en").toLowerCase().split("-")[0] || "en";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Build the status line for investment-screening quota.
 * Returns null for admins or when quota data is not loaded yet.
 */
export function resolveScreeningQuotaMessage(
  copy: ScreeningCopy,
  quota: ScreeningQuotaSlice | undefined,
  options?: { language?: string; isAdmin?: boolean },
): ScreeningQuotaMessage | null {
  if (options?.isAdmin) return null;
  if (!quota) return null;

  if (quota.limit <= 0) {
    return {
      kind: "not_included",
      text: copy.quota.notIncluded,
      showUpgrade: true,
    };
  }

  const window = windowLabel(copy, quota.window);
  if (quota.remaining <= 0) {
    return {
      kind: "exhausted",
      text: fill(copy.quota.exhausted, {
        used: String(quota.used),
        limit: String(quota.limit),
        window,
        resetDate: formatQuotaResetDate(quota.resetAt, options?.language),
      }),
      showUpgrade: true,
    };
  }

  return {
    kind: "ok",
    text: fill(copy.quota.remaining, {
      remaining: String(quota.remaining),
      limit: String(quota.limit),
      window,
    }),
    showUpgrade: false,
  };
}

/** True when the user cannot start a new screen (plan or period exhausted). */
export function isScreeningQuotaBlocked(
  quota: ScreeningQuotaSlice | undefined,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return false;
  if (!quota) return false;
  return quota.remaining <= 0;
}
