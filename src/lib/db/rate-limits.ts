import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

export async function checkAndIncrementRateLimit(
  userId: string,
  provider: string,
  maxCalls: number,
  windowKey: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const client = await ensureInitialized();

  const existing = await client.execute({
    sql: "SELECT call_count, window_start FROM rate_limits WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });

  if (existing.rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO rate_limits (user_id, provider, call_count, window_start) VALUES (?, ?, 1, ?)",
      args: [userId, provider, windowKey],
    });
    return { allowed: true, remaining: maxCalls - 1, resetAt: windowKey };
  }

  const row = existing.rows[0];
  const currentWindow = str(row.window_start);

  if (currentWindow !== windowKey) {
    await client.execute({
      sql: "UPDATE rate_limits SET call_count = 1, window_start = ? WHERE user_id = ? AND provider = ?",
      args: [windowKey, userId, provider],
    });
    return { allowed: true, remaining: maxCalls - 1, resetAt: windowKey };
  }

  const currentCount = num(row.call_count);
  if (currentCount >= maxCalls) {
    return { allowed: false, remaining: 0, resetAt: windowKey };
  }

  await client.execute({
    sql: "UPDATE rate_limits SET call_count = call_count + 1 WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });
  return { allowed: true, remaining: maxCalls - currentCount - 1, resetAt: windowKey };
}

export async function recordRateLimitUsage(
  userId: string,
  provider: string,
  count: number,
  windowKey: string,
): Promise<void> {
  if (count <= 0) return;
  const client = await ensureInitialized();
  const existing = await client.execute({
    sql: "SELECT call_count, window_start FROM rate_limits WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });

  if (existing.rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO rate_limits (user_id, provider, call_count, window_start) VALUES (?, ?, ?, ?)",
      args: [userId, provider, count, windowKey],
    });
    return;
  }

  const currentWindow = str(existing.rows[0].window_start);
  if (currentWindow !== windowKey) {
    await client.execute({
      sql: "UPDATE rate_limits SET call_count = ?, window_start = ? WHERE user_id = ? AND provider = ?",
      args: [count, windowKey, userId, provider],
    });
  } else {
    await client.execute({
      sql: "UPDATE rate_limits SET call_count = call_count + ? WHERE user_id = ? AND provider = ?",
      args: [count, userId, provider],
    });
  }
}

/**
 * Burst + cooldown limiter (Turso `rate_limits`).
 *
 * Allows up to `maxCalls` successful increments, then blocks until
 * `cooldownMs` after the burst filled. `window_start` stores the burst
 * start while counting, and the cooldown-until ISO timestamp once the
 * burst is exhausted.
 */
export async function checkAndIncrementBurstCooldown(
  userId: string,
  provider: string,
  maxCalls: number,
  cooldownMs: number,
  nowMs: number = Date.now(),
): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  retryAfterSec: number;
}> {
  const client = await ensureInitialized();
  const nowIso = new Date(nowMs).toISOString();

  const existing = await client.execute({
    sql: "SELECT call_count, window_start FROM rate_limits WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });

  if (existing.rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO rate_limits (user_id, provider, call_count, window_start) VALUES (?, ?, 1, ?)",
      args: [userId, provider, nowIso],
    });
    return {
      allowed: true,
      remaining: maxCalls - 1,
      limit: maxCalls,
      resetAt: nowIso,
      retryAfterSec: 0,
    };
  }

  const row = existing.rows[0];
  const callCount = num(row.call_count);
  const windowStart = str(row.window_start);
  const windowMs = Date.parse(windowStart);

  if (callCount >= maxCalls) {
    const cooldownUntilMs = Number.isFinite(windowMs) ? windowMs : nowMs + cooldownMs;
    if (nowMs < cooldownUntilMs) {
      const retryAfterSec = Math.max(1, Math.ceil((cooldownUntilMs - nowMs) / 1000));
      return {
        allowed: false,
        remaining: 0,
        limit: maxCalls,
        resetAt: new Date(cooldownUntilMs).toISOString(),
        retryAfterSec,
      };
    }
    // Cooldown elapsed — start a fresh burst.
    await client.execute({
      sql: "UPDATE rate_limits SET call_count = 1, window_start = ? WHERE user_id = ? AND provider = ?",
      args: [nowIso, userId, provider],
    });
    return {
      allowed: true,
      remaining: maxCalls - 1,
      limit: maxCalls,
      resetAt: nowIso,
      retryAfterSec: 0,
    };
  }

  const nextCount = callCount + 1;
  if (nextCount >= maxCalls) {
    const cooldownUntil = new Date(nowMs + cooldownMs).toISOString();
    await client.execute({
      sql: "UPDATE rate_limits SET call_count = ?, window_start = ? WHERE user_id = ? AND provider = ?",
      args: [nextCount, cooldownUntil, userId, provider],
    });
    return {
      allowed: true,
      remaining: 0,
      limit: maxCalls,
      resetAt: cooldownUntil,
      retryAfterSec: 0,
    };
  }

  await client.execute({
    sql: "UPDATE rate_limits SET call_count = call_count + 1 WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });
  return {
    allowed: true,
    remaining: maxCalls - nextCount,
    limit: maxCalls,
    resetAt: windowStart || nowIso,
    retryAfterSec: 0,
  };
}

export async function getRateLimitStats(): Promise<{
  perUser: { userId: string; username: string; plan: string; provider: string; callCount: number; windowStart: string }[];
}> {
  const client = await ensureInitialized();
  const result = await client.execute(
    `SELECT rl.user_id, u.username, u.plan, rl.provider, rl.call_count, rl.window_start
     FROM rate_limits rl
     JOIN users u ON u.id = rl.user_id
     ORDER BY rl.call_count DESC`
  );
  return {
    perUser: result.rows.map((r) => ({
      userId: str(r.user_id),
      username: str(r.username),
      plan: str(r.plan) || "free",
      provider: str(r.provider),
      callCount: num(r.call_count),
      windowStart: str(r.window_start),
    })),
  };
}
