import { PLATFORM_LIMITS, type RateLimitProvider } from "@/lib/platform-config";
import {
  checkAndIncrementRateLimit,
  recordRateLimitUsage,
  getDailyAiUsage,
} from "@/lib/db";
import { avRateLimiter, aiImportRateLimiter } from "@/lib/upstash";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
}

function minuteWindowKey(): string {
  const now = new Date();
  return now.toISOString().slice(0, 16);
}

function dayWindowKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Alpha Vantage ────────────────────────────────────────────────

async function checkAvRateLimitTurso(userId: string): Promise<RateLimitResult> {
  const limit = PLATFORM_LIMITS.AV_PER_USER_PER_MINUTE;
  const windowKey = minuteWindowKey();
  const { allowed, remaining, resetAt } = await checkAndIncrementRateLimit(
    userId,
    "alphavantage",
    limit,
    windowKey,
  );
  return { allowed, remaining, limit, resetAt };
}

export async function checkAvRateLimit(userId: string): Promise<RateLimitResult> {
  const limiter = avRateLimiter();
  if (limiter) {
    const { success, limit, remaining, reset } = await limiter.limit(userId);
    return {
      allowed: success,
      remaining,
      limit,
      resetAt: new Date(reset).toISOString(),
    };
  }
  return checkAvRateLimitTurso(userId);
}

/**
 * Record actual AV call count to Turso for admin dashboard reporting.
 * Designed to be called via deferTask() so it never blocks the response.
 */
export async function recordAvUsageAsync(userId: string, callCount: number): Promise<void> {
  if (callCount <= 0) return;
  const windowKey = minuteWindowKey();
  await recordRateLimitUsage(userId, "alphavantage", callCount, windowKey);
}

// ── AI Analysis (Pro daily / Free monthly) ───────────────────────
// Kept in Turso — low frequency, happens after slow OpenAI calls.

export async function checkAiRateLimit(
  userId: string,
  plan: string,
): Promise<RateLimitResult> {
  if (plan !== "pro") {
    return { allowed: true, remaining: Infinity, limit: Infinity, resetAt: "" };
  }

  const limit = PLATFORM_LIMITS.AI_PRO_DAILY_LIMIT;
  const usage = await getDailyAiUsage(userId);

  if (usage.aiCallsToday >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: usage.aiDailyResetAt,
    };
  }

  return {
    allowed: true,
    remaining: limit - usage.aiCallsToday,
    limit,
    resetAt: usage.aiDailyResetAt,
  };
}

// ── AI Import ────────────────────────────────────────────────────

async function checkAiImportRateLimitTurso(userId: string): Promise<RateLimitResult> {
  const limit = PLATFORM_LIMITS.AI_IMPORT_DAILY_LIMIT;
  const windowKey = dayWindowKey();
  const { allowed, remaining, resetAt } = await checkAndIncrementRateLimit(
    userId,
    "openai_import",
    limit,
    windowKey,
  );
  return { allowed, remaining, limit, resetAt };
}

export async function checkAiImportRateLimit(userId: string): Promise<RateLimitResult> {
  const limiter = aiImportRateLimiter();
  if (limiter) {
    const { success, limit, remaining, reset } = await limiter.limit(userId);
    return {
      allowed: success,
      remaining,
      limit,
      resetAt: new Date(reset).toISOString(),
    };
  }
  return checkAiImportRateLimitTurso(userId);
}

export function getRateLimitProvider(providerName: string): RateLimitProvider | null {
  if (providerName === "alphavantage") return "alphavantage";
  if (providerName === "openai") return "openai";
  if (providerName === "openai_import") return "openai_import";
  return null;
}
