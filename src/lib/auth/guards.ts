import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "./session";
import { findUserById, trackEvent, updateLastActive } from "@/lib/db";
import { effectivePlan } from "@/lib/subscription";
import type { SubscriptionFeature } from "@/lib/types";
import { paywallHitsTotal, rateLimitHitsTotal } from "@/lib/metrics";
import { checkAvRateLimit, checkFmpRateLimit, checkAiRateLimit, checkAiImportRateLimit } from "@/lib/rate-limit";
import type { RateLimitProvider } from "@/lib/platform-config";
import { checkAndIncrementFeatureQuota } from "@/lib/feature-quotas";
import type { FeatureQuotaKey } from "@/lib/platform-config";

const lastActiveCache = new Map<string, number>();
const LAST_ACTIVE_THROTTLE_MS = 5 * 60_000;

export async function requireSession(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!session.impersonatorUserId) {
    const now = Date.now();
    const lastWrite = lastActiveCache.get(session.userId) ?? 0;
    if (now - lastWrite > LAST_ACTIVE_THROTTLE_MS) {
      lastActiveCache.set(session.userId, now);
      updateLastActive(session.userId).catch(() => {});
    }
  }

  return { session, error: null };
}

export async function requireAdmin(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return { session: null, error: error! };
  if (session.impersonatorUserId) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  if (session.role !== "admin") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null };
}

/**
 * @deprecated Universal-access model: every feature is reachable from every
 * plan; what differs is the per-feature quota. Use `requireFeatureQuota`
 * instead. This wrapper now only checks that the caller is signed in.
 */
export async function requirePro(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return { session: null, error: error! };
  return { session, error: null };
}

/**
 * @deprecated Universal-access model: pre-flight feature gating is replaced by
 * per-feature quota counters. Use `requireFeatureQuota(req, "<feature_key>")`
 * which enforces the quota AND increments the counter. This wrapper now only
 * authenticates the caller.
 */
export async function requireFeatureAccess(req: NextRequest, _feature: SubscriptionFeature) {
  const { session, error } = await requireSession(req);
  if (error || !session) return { session: null, error: error! };
  return { session, error: null };
}

/**
 * Enforce a per-user, per-feature quota and increment the counter on success.
 *
 * - Admins bypass the quota.
 * - When the quota is exhausted the caller receives a 429 with body
 *   `{ paywall: true, reason: "quota_exceeded", feature, used, limit, resetAt, upgradeUrl }`
 *   so the UI can render an upgrade prompt that's specific to which quota ran out.
 * - On the rare case the downstream call fails (provider 500, etc.) the caller
 *   should `refundFeatureQuota(userId, feature)` to avoid charging users for
 *   nothing — see usages in API route handlers.
 */
export async function requireFeatureQuota(
  req: NextRequest,
  feature: FeatureQuotaKey,
): Promise<{
  session: import("./session").SessionPayload | null;
  error: NextResponse | null;
  quota?: Awaited<ReturnType<typeof checkAndIncrementFeatureQuota>>;
}> {
  const { session, error } = await requireSession(req);
  if (error || !session) return { session: null, error: error! };

  if (session.role === "admin") {
    return { session, error: null };
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const plan = effectivePlan(user.plan, user.plan_expires_at);
  const result = await checkAndIncrementFeatureQuota(session.userId, feature, plan);

  if (result.allowed) {
    return { session, error: null, quota: result };
  }

  paywallHitsTotal.inc({ feature, reason: "quota_exceeded" });
  trackEvent(session.userId, "paywall_shown", { feature, reason: "quota_exceeded" });

  const res = NextResponse.json(
    {
      error: "Monthly limit reached for this feature",
      paywall: true,
      reason: "quota_exceeded",
      feature,
      used: result.used,
      limit: result.limit,
      resetAt: result.resetAt,
      upgradeUrl: "/billing",
    },
    { status: 429 },
  );
  res.headers.set("Retry-After", "86400");
  return { session: null, error: res, quota: result };
}

/**
 * Same semantics as `requireFeatureQuota`, but keyed by `userId` instead of an
 * incoming Next.js request. Use from non-HTTP entrypoints (Telegram webhook
 * handler, cron jobs, etc.) where there is no `NextRequest` to read a session
 * cookie from.
 *
 * Returns:
 *   - `{ allowed: true }` when the user is admin or under the quota.
 *   - `{ allowed: false, reason: "user_not_found" | "quota_exceeded", ... }`
 *     otherwise; callers must surface a friendly error to the user.
 */
export async function requireFeatureQuotaByUserId(
  userId: string,
  feature: FeatureQuotaKey,
): Promise<
  | {
      allowed: true;
      quota: Awaited<ReturnType<typeof checkAndIncrementFeatureQuota>>;
    }
  | {
      allowed: false;
      reason: "user_not_found" | "quota_exceeded";
      quota?: Awaited<ReturnType<typeof checkAndIncrementFeatureQuota>>;
    }
> {
  const user = await findUserById(userId);
  if (!user) return { allowed: false, reason: "user_not_found" };

  if (user.role === "admin") {
    // Admins bypass — return a synthetic always-allowed result.
    return {
      allowed: true,
      quota: {
        allowed: true,
        used: 0,
        limit: Infinity,
        resetAt: "",
      } as Awaited<ReturnType<typeof checkAndIncrementFeatureQuota>>,
    };
  }

  const plan = effectivePlan(user.plan, user.plan_expires_at);
  const result = await checkAndIncrementFeatureQuota(userId, feature, plan);
  if (result.allowed) return { allowed: true, quota: result };

  paywallHitsTotal.inc({ feature, reason: "quota_exceeded" });
  trackEvent(userId, "paywall_shown", { feature, reason: "quota_exceeded" });
  return { allowed: false, reason: "quota_exceeded", quota: result };
}

export async function requireRateLimit(
  req: NextRequest,
  provider: RateLimitProvider,
) {
  const { session, error } = await requireSession(req);
  if (error || !session) return { session: null, error: error! };

  if (session.role === "admin") {
    return { session, error: null, rateLimit: { allowed: true, remaining: Infinity, limit: Infinity, resetAt: "" } };
  }

  let result: { allowed: boolean; remaining: number; limit: number; resetAt: string };

  if (provider === "alphavantage") {
    result = await checkAvRateLimit(session.userId);
  } else if (provider === "fmp") {
    result = await checkFmpRateLimit(session.userId);
  } else if (provider === "openai") {
    const user = await findUserById(session.userId);
    const plan = effectivePlan(user?.plan || "free", user?.plan_expires_at || "");
    result = await checkAiRateLimit(session.userId, plan);
  } else {
    result = await checkAiImportRateLimit(session.userId);
  }

  if (result.allowed) {
    return { session, error: null, rateLimit: result };
  }

  rateLimitHitsTotal.inc({ provider });

  const retryAfter = provider === "alphavantage" || provider === "fmp" ? 60 : 86400;
  const res = NextResponse.json(
    {
      error: "Rate limit exceeded",
      reason: "rate_limited",
      provider,
      limit: result.limit,
      remaining: 0,
      retryAfter,
    },
    { status: 429 }
  );
  res.headers.set("Retry-After", String(retryAfter));

  return { session: null, error: res, rateLimit: result };
}
