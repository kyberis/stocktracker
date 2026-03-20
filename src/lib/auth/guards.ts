import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "./session";
import { findUserById, getAiUsage, getAiTokenUsage, trackEvent, updateLastActive } from "@/lib/db";
import { canAccessFeature, effectivePlan } from "@/lib/subscription";
import type { SubscriptionFeature } from "@/lib/types";
import { paywallHitsTotal, rateLimitHitsTotal } from "@/lib/metrics";
import { checkAvRateLimit, checkAiRateLimit, checkAiImportRateLimit } from "@/lib/rate-limit";
import type { RateLimitProvider } from "@/lib/platform-config";

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

  const now = Date.now();
  const lastWrite = lastActiveCache.get(session.userId) ?? 0;
  if (now - lastWrite > LAST_ACTIVE_THROTTLE_MS) {
    lastActiveCache.set(session.userId, now);
    updateLastActive(session.userId).catch(() => {});
  }

  return { session, error: null };
}

export async function requireAdmin(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return { session: null, error: error! };
  if (session.role !== "admin") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null };
}

export async function requirePro(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return { session: null, error: error! };
  if (session.role === "admin") return { session, error: null };
  const user = await findUserById(session.userId);
  const plan = effectivePlan(user?.plan || session.plan || "free", user?.plan_expires_at || "");
  const isPro = plan === "pro";
  if (!isPro) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Pro subscription required", reason: "upgrade_required", feature: "pro" },
        { status: 403 }
      ),
    };
  }
  return { session, error: null };
}

export async function requireFeatureAccess(req: NextRequest, feature: SubscriptionFeature) {
  const { session, error } = await requireSession(req);
  if (error || !session) return { session: null, error: error! };

  if (session.role === "admin") return { session, error: null };

  const user = await findUserById(session.userId);
  if (!user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const [usage, tokenUsage] = await Promise.all([
    getAiUsage(session.userId),
    getAiTokenUsage(session.userId),
  ]);
  const plan = effectivePlan(user.plan, user.plan_expires_at);
  const entitlement = canAccessFeature(feature, {
    plan,
    aiCallsThisMonth: usage.aiCallsThisMonth,
    aiTokensThisMonth: tokenUsage.aiTokensThisMonth,
  });
  if (entitlement.allowed) return { session, error: null };

  const reason = entitlement.reason || "upgrade_required";
  paywallHitsTotal.inc({ feature, reason });
  trackEvent(session.userId, "paywall_shown", { feature, reason });

  return {
    session: null,
    error: NextResponse.json(
      {
        error: entitlement.reason === "ai_limit_reached"
          ? "Free AI monthly limit reached"
          : "Pro subscription required",
        reason: entitlement.reason || "upgrade_required",
        feature,
        limit: entitlement.limit,
        used: entitlement.used,
      },
      { status: 403 }
    ),
  };
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

  const retryAfter = provider === "alphavantage" ? 60 : 86400;
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
