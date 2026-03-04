import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { PLATFORM_LIMITS } from "@/lib/platform-config";

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export function getRedisClient(): Redis | null {
  return getRedis();
}

let _avLimiter: Ratelimit | null | undefined;
export function avRateLimiter(): Ratelimit | null {
  if (_avLimiter !== undefined) return _avLimiter;
  const redis = getRedis();
  if (!redis) {
    _avLimiter = null;
    return null;
  }
  _avLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(PLATFORM_LIMITS.AV_PER_USER_PER_MINUTE, "1m"),
    prefix: "rl:av",
  });
  return _avLimiter;
}

let _aiImportLimiter: Ratelimit | null | undefined;
export function aiImportRateLimiter(): Ratelimit | null {
  if (_aiImportLimiter !== undefined) return _aiImportLimiter;
  const redis = getRedis();
  if (!redis) {
    _aiImportLimiter = null;
    return null;
  }
  _aiImportLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(PLATFORM_LIMITS.AI_IMPORT_DAILY_LIMIT, "1d"),
    prefix: "rl:ai-import",
  });
  return _aiImportLimiter;
}
