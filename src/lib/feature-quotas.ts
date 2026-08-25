import { ensureInitialized } from "@/lib/db/client";
import { num, str } from "@/lib/db/helpers";
import {
  FEATURE_QUOTAS,
  type FeatureQuotaConfig,
  type FeatureQuotaKey,
  type QuotaWindow,
} from "@/lib/platform-config";
import type { SubscriptionPlan } from "@/lib/types";

/**
 * Quota counters live in the existing `rate_limits` table. The `provider`
 * column holds `quota:<feature>` so we never collide with the upstream
 * provider-rate-limit rows (`alphavantage`, `fmp`, `openai_import`, ...).
 *
 * `window_start` stores the period key:
 *   - month: `YYYY-MM`
 *   - day:   `YYYY-MM-DD`
 *   - year:  `YYYY`
 *
 * When the window key changes the row is reset back to 0 / 1 on next
 * touch — same convention as `checkAndIncrementRateLimit`.
 */

const PROVIDER_PREFIX = "quota:";

function providerKey(feature: FeatureQuotaKey): string {
  return `${PROVIDER_PREFIX}${feature}`;
}

/** ISO week key `YYYY-Www` (UTC, weeks start Monday). */
export function isoWeekWindowKey(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${isoYear}-W${String(weekNo).padStart(2, "0")}`;
}

export function currentWindowKey(window: QuotaWindow, now: Date = new Date()): string {
  if (window === "year") return String(now.getUTCFullYear());
  if (window === "week") return isoWeekWindowKey(now);
  if (window === "day") {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
      now.getUTCDate(),
    ).padStart(2, "0")}`;
  }
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nextResetAt(window: QuotaWindow, now: Date = new Date()): string {
  if (window === "year") {
    return new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)).toISOString();
  }
  if (window === "week") {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNum = d.getUTCDay() || 7; // Mon=1 … Sun=7
    const addDays = (8 - dayNum) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + addDays);
    return d.toISOString();
  }
  if (window === "day") {
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    )).toISOString();
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export function getQuotaLimit(feature: FeatureQuotaKey, plan: SubscriptionPlan): number {
  const cfg = FEATURE_QUOTAS[feature];
  return plan === "pro" ? cfg.pro : cfg.free;
}

export function getQuotaConfig(feature: FeatureQuotaKey): FeatureQuotaConfig {
  return FEATURE_QUOTAS[feature];
}

export interface FeatureQuotaUsage {
  feature: FeatureQuotaKey;
  plan: SubscriptionPlan;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  window: QuotaWindow;
}

/**
 * Read current usage without incrementing. Used by `/me` and UI badges.
 * Admin/role checks are handled by the caller (guards).
 */
export async function getFeatureQuotaUsage(
  userId: string,
  feature: FeatureQuotaKey,
  plan: SubscriptionPlan,
): Promise<FeatureQuotaUsage> {
  const cfg = FEATURE_QUOTAS[feature];
  const limit = getQuotaLimit(feature, plan);
  const windowKey = currentWindowKey(cfg.window);
  const resetAt = nextResetAt(cfg.window);

  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT call_count, window_start FROM rate_limits WHERE user_id = ? AND provider = ?",
    args: [userId, providerKey(feature)],
  });

  let used = 0;
  if (result.rows.length > 0) {
    const row = result.rows[0];
    if (str(row.window_start) === windowKey) {
      used = num(row.call_count);
    }
  }

  return {
    feature,
    plan,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt,
    window: cfg.window,
  };
}

/**
 * Atomically check whether the user has remaining quota for a feature and,
 * if so, increment the counter. Returns the post-increment usage row.
 *
 * If the quota is exceeded the counter is NOT incremented and `allowed`
 * is false.
 */
export async function checkAndIncrementFeatureQuota(
  userId: string,
  feature: FeatureQuotaKey,
  plan: SubscriptionPlan,
): Promise<FeatureQuotaUsage & { allowed: boolean }> {
  const cfg = FEATURE_QUOTAS[feature];
  const limit = getQuotaLimit(feature, plan);
  const windowKey = currentWindowKey(cfg.window);
  const resetAt = nextResetAt(cfg.window);
  const provider = providerKey(feature);

  const client = await ensureInitialized();

  const existing = await client.execute({
    sql: "SELECT call_count, window_start FROM rate_limits WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });

  if (existing.rows.length === 0) {
    if (limit <= 0) {
      return { feature, plan, used: 0, limit, remaining: 0, resetAt, window: cfg.window, allowed: false };
    }
    await client.execute({
      sql: "INSERT INTO rate_limits (user_id, provider, call_count, window_start) VALUES (?, ?, 1, ?)",
      args: [userId, provider, windowKey],
    });
    return {
      feature,
      plan,
      used: 1,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt,
      window: cfg.window,
      allowed: true,
    };
  }

  const row = existing.rows[0];
  const storedWindow = str(row.window_start);

  if (storedWindow !== windowKey) {
    if (limit <= 0) {
      await client.execute({
        sql: "UPDATE rate_limits SET call_count = 0, window_start = ? WHERE user_id = ? AND provider = ?",
        args: [windowKey, userId, provider],
      });
      return { feature, plan, used: 0, limit, remaining: 0, resetAt, window: cfg.window, allowed: false };
    }
    await client.execute({
      sql: "UPDATE rate_limits SET call_count = 1, window_start = ? WHERE user_id = ? AND provider = ?",
      args: [windowKey, userId, provider],
    });
    return {
      feature,
      plan,
      used: 1,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt,
      window: cfg.window,
      allowed: true,
    };
  }

  const currentCount = num(row.call_count);
  if (currentCount >= limit) {
    return {
      feature,
      plan,
      used: currentCount,
      limit,
      remaining: 0,
      resetAt,
      window: cfg.window,
      allowed: false,
    };
  }

  const next = currentCount + 1;
  await client.execute({
    sql: "UPDATE rate_limits SET call_count = ? WHERE user_id = ? AND provider = ?",
    args: [next, userId, provider],
  });
  return {
    feature,
    plan,
    used: next,
    limit,
    remaining: Math.max(0, limit - next),
    resetAt,
    window: cfg.window,
    allowed: true,
  };
}

/**
 * Decrement a feature counter. Used to refund usage when a downstream call
 * fails after the quota was already consumed (so the user is not charged
 * for a request that produced no value).
 *
 * Never goes below 0.
 */
export async function refundFeatureQuota(
  userId: string,
  feature: FeatureQuotaKey,
): Promise<void> {
  const cfg = FEATURE_QUOTAS[feature];
  const provider = providerKey(feature);
  const windowKey = currentWindowKey(cfg.window);
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT call_count, window_start FROM rate_limits WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });
  if (result.rows.length === 0) return;
  const row = result.rows[0];
  if (str(row.window_start) !== windowKey) return;
  const current = num(row.call_count);
  if (current <= 0) return;
  await client.execute({
    sql: "UPDATE rate_limits SET call_count = ? WHERE user_id = ? AND provider = ?",
    args: [current - 1, userId, provider],
  });
}

/**
 * Read all known feature quotas for a user in one go. Used by `/me`.
 */
export async function getAllFeatureQuotas(
  userId: string,
  plan: SubscriptionPlan,
): Promise<Record<FeatureQuotaKey, FeatureQuotaUsage>> {
  const keys = Object.keys(FEATURE_QUOTAS) as FeatureQuotaKey[];
  const providers = keys.map((k) => providerKey(k));

  const client = await ensureInitialized();
  const placeholders = providers.map(() => "?").join(", ");
  const result = await client.execute({
    sql: `SELECT provider, call_count, window_start FROM rate_limits WHERE user_id = ? AND provider IN (${placeholders})`,
    args: [userId, ...providers],
  });

  const rowByProvider = new Map<string, Record<string, unknown>>();
  for (const row of result.rows) {
    rowByProvider.set(str(row.provider), row as Record<string, unknown>);
  }

  const out = {} as Record<FeatureQuotaKey, FeatureQuotaUsage>;
  for (const feature of keys) {
    const cfg = FEATURE_QUOTAS[feature];
    const limit = getQuotaLimit(feature, plan);
    const windowKey = currentWindowKey(cfg.window);
    const resetAt = nextResetAt(cfg.window);
    let used = 0;
    const row = rowByProvider.get(providerKey(feature));
    if (row && str(row.window_start) === windowKey) {
      used = num(row.call_count);
    }
    out[feature] = {
      feature,
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt,
      window: cfg.window,
    };
  }
  return out;
}
