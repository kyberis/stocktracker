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

let _fmpLimiter: Ratelimit | null | undefined;
export function fmpRateLimiter(): Ratelimit | null {
  if (_fmpLimiter !== undefined) return _fmpLimiter;
  const redis = getRedis();
  if (!redis) {
    _fmpLimiter = null;
    return null;
  }
  _fmpLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(PLATFORM_LIMITS.FMP_PER_USER_PER_MINUTE, "1m"),
    prefix: "rl:fmp",
  });
  return _fmpLimiter;
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

let _signupLimiter: Ratelimit | null | undefined;
export function signupRateLimiter(): Ratelimit | null {
  if (_signupLimiter !== undefined) return _signupLimiter;
  const redis = getRedis();
  if (!redis) {
    _signupLimiter = null;
    return null;
  }
  _signupLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(PLATFORM_LIMITS.AUTH_SIGNUP_PER_IP_PER_HOUR, "1h"),
    prefix: "rl:signup",
  });
  return _signupLimiter;
}

let _loginLimiter: Ratelimit | null | undefined;
export function loginRateLimiter(): Ratelimit | null {
  if (_loginLimiter !== undefined) return _loginLimiter;
  const redis = getRedis();
  if (!redis) {
    _loginLimiter = null;
    return null;
  }
  _loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(PLATFORM_LIMITS.AUTH_LOGIN_PER_IP_PER_15MIN, "15m"),
    prefix: "rl:login",
  });
  return _loginLimiter;
}

let _deviceAuthLimiter: Ratelimit | null | undefined;
export function deviceAuthRateLimiter(): Ratelimit | null {
  if (_deviceAuthLimiter !== undefined) return _deviceAuthLimiter;
  const redis = getRedis();
  if (!redis) {
    _deviceAuthLimiter = null;
    return null;
  }
  _deviceAuthLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(PLATFORM_LIMITS.DEVICE_AUTH_PER_IP_PER_15MIN, "15m"),
    prefix: "rl:device-auth",
  });
  return _deviceAuthLimiter;
}

let _mcpUserLimiter: Ratelimit | null | undefined;
/** MCP authenticated user: 240 req/min (aligned with Clara). */
export function mcpUserRateLimiter(): Ratelimit | null {
  if (_mcpUserLimiter !== undefined) return _mcpUserLimiter;
  const redis = getRedis();
  if (!redis) {
    _mcpUserLimiter = null;
    return null;
  }
  _mcpUserLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(240, "1 m"),
    prefix: "rl:mcp-user",
  });
  return _mcpUserLimiter;
}

let _mcpUserUnauthLimiter: Ratelimit | null | undefined;
/** MCP wrong/missing token: 60 req/min per IP. */
export function mcpUserUnauthRateLimiter(): Ratelimit | null {
  if (_mcpUserUnauthLimiter !== undefined) return _mcpUserUnauthLimiter;
  const redis = getRedis();
  if (!redis) {
    _mcpUserUnauthLimiter = null;
    return null;
  }
  _mcpUserUnauthLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "rl:mcp-user-unauth",
  });
  return _mcpUserUnauthLimiter;
}
