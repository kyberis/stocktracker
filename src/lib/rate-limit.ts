import { PLATFORM_LIMITS, type RateLimitProvider } from "@/lib/platform-config";
import {
  checkAndIncrementRateLimit,
  checkAndIncrementBurstCooldown,
  recordRateLimitUsage,
  getDailyAiUsage,
  getPlatformSetting,
  setPlatformSetting,
} from "@/lib/db";
import {
  avRateLimiter,
  fmpRateLimiter,
  aiImportRateLimiter,
  signupRateLimiter,
  loginRateLimiter,
  deviceAuthRateLimiter,
  publicSearchRateLimiter,
  publicAnalysisReadRateLimiter,
  publicAnalysisBuildRateLimiter,
} from "@/lib/upstash";
import { WARREN_EMPTY_ADD_PROVIDER } from "@/lib/ai/warren/empty-add-stock";
import type { NextRequest } from "next/server";

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

/**
 * Prefer Upstash when configured; on any Redis failure (quota, timeout,
 * network) fall back to Turso so auth and API routes stay available.
 */
async function withUpstashFallback(
  label: string,
  upstash: () => Promise<RateLimitResult | null>,
  turso: () => Promise<RateLimitResult>,
): Promise<RateLimitResult> {
  try {
    const result = await upstash();
    if (result) return result;
  } catch (err) {
    console.error(
      `Upstash rate limit failed (${label}), falling back to Turso:`,
      err instanceof Error ? err.message : err,
    );
  }
  return turso();
}

function fromUpstashResult(result: {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}): RateLimitResult {
  return {
    allowed: result.success,
    remaining: result.remaining,
    limit: result.limit,
    resetAt: new Date(result.reset).toISOString(),
  };
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
  return withUpstashFallback(
    "av",
    async () => {
      const limiter = avRateLimiter();
      if (!limiter) return null;
      return fromUpstashResult(await limiter.limit(userId));
    },
    () => checkAvRateLimitTurso(userId),
  );
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

async function checkFmpRateLimitTurso(userId: string): Promise<RateLimitResult> {
  const limit = PLATFORM_LIMITS.FMP_PER_USER_PER_MINUTE;
  const windowKey = minuteWindowKey();
  const { allowed, remaining, resetAt } = await checkAndIncrementRateLimit(
    userId,
    "fmp",
    limit,
    windowKey,
  );
  return { allowed, remaining, limit, resetAt };
}

export async function checkFmpRateLimit(userId: string): Promise<RateLimitResult> {
  return withUpstashFallback(
    "fmp",
    async () => {
      const limiter = fmpRateLimiter();
      if (!limiter) return null;
      return fromUpstashResult(await limiter.limit(userId));
    },
    () => checkFmpRateLimitTurso(userId),
  );
}

export async function recordFmpUsageAsync(userId: string, callCount: number): Promise<void> {
  if (callCount <= 0) return;
  const windowKey = minuteWindowKey();
  await recordRateLimitUsage(userId, "fmp", callCount, windowKey);
}

// ── AI Analysis (Pro daily / Free monthly) ───────────────────────
// Kept in Turso — low frequency, happens after slow OpenAI calls.

export async function checkAiRateLimit(
  userId: string,
  plan: string,
  role?: string,
): Promise<RateLimitResult> {
  if (role === "admin") {
    return { allowed: true, remaining: Infinity, limit: Infinity, resetAt: "" };
  }

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
  return withUpstashFallback(
    "ai-import",
    async () => {
      const limiter = aiImportRateLimiter();
      if (!limiter) return null;
      return fromUpstashResult(await limiter.limit(userId));
    },
    () => checkAiImportRateLimitTurso(userId),
  );
}

// ── Support Chat ──────────────────────────────────────────────

export async function checkSupportChatRateLimit(
  userId: string,
  plan: string,
  configuredLimit?: number,
  role?: string,
): Promise<RateLimitResult> {
  if (role === "admin") {
    return { allowed: true, remaining: Infinity, limit: Infinity, resetAt: "" };
  }
  const limit =
    configuredLimit ??
    (plan === "pro"
      ? PLATFORM_LIMITS.SUPPORT_CHAT_PRO_DAILY_DEFAULT
      : PLATFORM_LIMITS.SUPPORT_CHAT_FREE_DAILY_DEFAULT);
  const windowKey = dayWindowKey();
  const { allowed, remaining, resetAt } = await checkAndIncrementRateLimit(
    userId,
    "support_chat",
    limit,
    windowKey,
  );
  return { allowed, remaining, limit, resetAt };
}

export function getRateLimitProvider(providerName: string): RateLimitProvider | null {
  if (providerName === "alphavantage") return "alphavantage";
  if (providerName === "fmp") return "fmp";
  if (providerName === "openai") return "openai";
  if (providerName === "openai_import") return "openai_import";
  if (providerName === "support_chat") return "support_chat";
  return null;
}

// ── IP-based auth rate limiting ──────────────────────────────

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function checkSignupRateLimitTurso(ip: string): Promise<RateLimitResult> {
  const limit = PLATFORM_LIMITS.AUTH_SIGNUP_PER_IP_PER_HOUR;
  const windowKey = `signup:${new Date().toISOString().slice(0, 13)}`;
  const { allowed, remaining, resetAt } = await checkAndIncrementRateLimit(ip, "alphavantage", limit, windowKey);
  return { allowed, remaining, limit, resetAt };
}

export async function checkSignupRateLimit(ip: string): Promise<RateLimitResult> {
  return withUpstashFallback(
    "signup",
    async () => {
      const limiter = signupRateLimiter();
      if (!limiter) return null;
      return fromUpstashResult(await limiter.limit(ip));
    },
    () => checkSignupRateLimitTurso(ip),
  );
}

async function checkLoginRateLimitTurso(ip: string): Promise<RateLimitResult> {
  const limit = PLATFORM_LIMITS.AUTH_LOGIN_PER_IP_PER_15MIN;
  const now = new Date();
  const quarter = Math.floor(now.getMinutes() / 15);
  const windowKey = `login:${now.toISOString().slice(0, 13)}:${quarter}`;
  const { allowed, remaining, resetAt } = await checkAndIncrementRateLimit(ip, "alphavantage", limit, windowKey);
  return { allowed, remaining, limit, resetAt };
}

export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  return withUpstashFallback(
    "login",
    async () => {
      const limiter = loginRateLimiter();
      if (!limiter) return null;
      return fromUpstashResult(await limiter.limit(ip));
    },
    () => checkLoginRateLimitTurso(ip),
  );
}

// ── Device bearer-token auth rate limiting ──────────────────

async function checkDeviceAuthRateLimitTurso(ip: string): Promise<RateLimitResult> {
  const limit = PLATFORM_LIMITS.DEVICE_AUTH_PER_IP_PER_15MIN;
  const now = new Date();
  const quarter = Math.floor(now.getMinutes() / 15);
  const windowKey = `device-auth:${now.toISOString().slice(0, 13)}:${quarter}`;
  // Dedicated provider key — do not share "alphavantage" with AV user quotas.
  const { allowed, remaining, resetAt } = await checkAndIncrementRateLimit(ip, "device_auth", limit, windowKey);
  return { allowed, remaining, limit, resetAt };
}

export async function checkDeviceAuthRateLimit(ip: string): Promise<RateLimitResult> {
  return withUpstashFallback(
    "device-auth",
    async () => {
      const limiter = deviceAuthRateLimiter();
      if (!limiter) return null;
      return fromUpstashResult(await limiter.limit(ip));
    },
    () => checkDeviceAuthRateLimitTurso(ip),
  );
}

// ── Global OpenAI monthly call cap ──────────────────────────

const OPENAI_CALLS_KEY = "openai_monthly_calls";
const OPENAI_TOKENS_KEY = "openai_monthly_tokens";

export async function checkGlobalAiCap(role?: string): Promise<{ allowed: boolean; used: number; cap: number }> {
  if (role === "admin") return { allowed: true, used: 0, cap: Infinity };

  const cap = PLATFORM_LIMITS.OPENAI_MONTHLY_TOKEN_CAP;
  const monthKey = new Date().toISOString().slice(0, 7);
  const raw = await getPlatformSetting(OPENAI_TOKENS_KEY);
  const [countStr, storedMonth] = raw.split("|");
  const used = storedMonth === monthKey ? parseInt(countStr, 10) || 0 : 0;
  return { allowed: used < cap, used, cap };
}

export async function incrementGlobalAiCalls(): Promise<void> {
  const monthKey = new Date().toISOString().slice(0, 7);
  const raw = await getPlatformSetting(OPENAI_CALLS_KEY);
  const [countStr, storedMonth] = raw.split("|");
  const current = storedMonth === monthKey ? parseInt(countStr, 10) || 0 : 0;
  await setPlatformSetting(OPENAI_CALLS_KEY, `${current + 1}|${monthKey}`);
}

export async function incrementGlobalAiTokens(tokens: number): Promise<void> {
  if (tokens <= 0) return;
  const monthKey = new Date().toISOString().slice(0, 7);
  const raw = await getPlatformSetting(OPENAI_TOKENS_KEY);
  const [countStr, storedMonth] = raw.split("|");
  const current = storedMonth === monthKey ? parseInt(countStr, 10) || 0 : 0;
  await setPlatformSetting(OPENAI_TOKENS_KEY, `${current + tokens}|${monthKey}`);
}

// ── Public (unauthenticated) /analisis rate limiting ────────────

async function checkPublicSearchRateLimitTurso(ip: string): Promise<RateLimitResult> {
  const limit = PLATFORM_LIMITS.PUBLIC_SEARCH_PER_IP_PER_MINUTE;
  const windowKey = `public-search:${minuteWindowKey()}`;
  const { allowed, remaining, resetAt } = await checkAndIncrementRateLimit(ip, "public_search", limit, windowKey);
  return { allowed, remaining, limit, resetAt };
}

export async function checkPublicSearchRateLimit(ip: string): Promise<RateLimitResult> {
  return withUpstashFallback(
    "public-search",
    async () => {
      const limiter = publicSearchRateLimiter();
      if (!limiter) return null;
      return fromUpstashResult(await limiter.limit(ip));
    },
    () => checkPublicSearchRateLimitTurso(ip),
  );
}

async function checkPublicAnalysisReadRateLimitTurso(ip: string): Promise<RateLimitResult> {
  const limit = PLATFORM_LIMITS.PUBLIC_ANALYSIS_READ_PER_IP_PER_MINUTE;
  const windowKey = `public-analysis-read:${minuteWindowKey()}`;
  const { allowed, remaining, resetAt } = await checkAndIncrementRateLimit(ip, "public_analysis_read", limit, windowKey);
  return { allowed, remaining, limit, resetAt };
}

export async function checkPublicAnalysisReadRateLimit(ip: string): Promise<RateLimitResult> {
  return withUpstashFallback(
    "public-analysis-read",
    async () => {
      const limiter = publicAnalysisReadRateLimiter();
      if (!limiter) return null;
      return fromUpstashResult(await limiter.limit(ip));
    },
    () => checkPublicAnalysisReadRateLimitTurso(ip),
  );
}

async function checkPublicAnalysisBuildRateLimitTurso(ip: string): Promise<RateLimitResult> {
  const limit = PLATFORM_LIMITS.PUBLIC_ANALYSIS_BUILD_PER_IP_PER_HOUR;
  const now = new Date();
  const windowKey = `public-analysis-build:${now.toISOString().slice(0, 13)}`;
  const { allowed, remaining, resetAt } = await checkAndIncrementRateLimit(ip, "public_analysis_build", limit, windowKey);
  return { allowed, remaining, limit, resetAt };
}

export async function checkPublicAnalysisBuildRateLimit(ip: string): Promise<RateLimitResult> {
  return withUpstashFallback(
    "public-analysis-build",
    async () => {
      const limiter = publicAnalysisBuildRateLimiter();
      if (!limiter) return null;
      return fromUpstashResult(await limiter.limit(ip));
    },
    () => checkPublicAnalysisBuildRateLimitTurso(ip),
  );
}

// ── Global daily budget for anonymous first-time ticker builds ──
// Mirrors checkGlobalAiCap/incrementGlobalAiCalls above, day-keyed instead
// of month-keyed: backstop against distributed abuse (many IPs, each under
// the per-IP limit) that per-IP rate limiting alone can't catch.

const PUBLIC_ANALYSIS_BUILD_GLOBAL_KEY = "public_analysis_build_daily_count";

export async function checkPublicAnalysisBuildGlobalBudget(): Promise<{
  allowed: boolean;
  used: number;
  cap: number;
}> {
  const cap = PLATFORM_LIMITS.PUBLIC_ANALYSIS_BUILD_GLOBAL_PER_DAY;
  const dayKey = dayWindowKey();
  const raw = await getPlatformSetting(PUBLIC_ANALYSIS_BUILD_GLOBAL_KEY);
  const [countStr, storedDay] = raw.split("|");
  const used = storedDay === dayKey ? parseInt(countStr, 10) || 0 : 0;
  return { allowed: used < cap, used, cap };
}

export async function incrementPublicAnalysisBuildGlobalBudget(): Promise<void> {
  const dayKey = dayWindowKey();
  const raw = await getPlatformSetting(PUBLIC_ANALYSIS_BUILD_GLOBAL_KEY);
  const [countStr, storedDay] = raw.split("|");
  const current = storedDay === dayKey ? parseInt(countStr, 10) || 0 : 0;
  await setPlatformSetting(PUBLIC_ANALYSIS_BUILD_GLOBAL_KEY, `${current + 1}|${dayKey}`);
}

// ── Empty-portfolio Warren (add-stock only) ───────────────────────

export interface BurstCooldownResult extends RateLimitResult {
  retryAfterSec: number;
}

/**
 * Burst of N consults then a cooldown. Used when Warren is helping a
 * new user add their first stocks (empty portfolio). Admins bypass.
 */
export async function checkWarrenEmptyAddRateLimit(
  userId: string,
  role?: string,
  nowMs: number = Date.now(),
): Promise<BurstCooldownResult> {
  if (role === "admin") {
    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      resetAt: "",
      retryAfterSec: 0,
    };
  }

  const maxCalls = PLATFORM_LIMITS.WARREN_EMPTY_ADD_MAX_CONSULTS;
  const cooldownMs = PLATFORM_LIMITS.WARREN_EMPTY_ADD_COOLDOWN_MS;
  return checkAndIncrementBurstCooldown(
    userId,
    WARREN_EMPTY_ADD_PROVIDER,
    maxCalls,
    cooldownMs,
    nowMs,
  );
}
