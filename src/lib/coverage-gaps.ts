import { getRedisClient } from "@/lib/upstash";

const REDIS_KEY = "coverage:gaps";
/** Long enough to survive a weekly reconcile if refresh-holdings is quiet over a weekend. */
const TTL_SECONDS = 8 * 24 * 3600;

export async function recordCoverageGaps(tickers: string[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  try {
    if (unique.length === 0) {
      await redis.del(REDIS_KEY);
      return;
    }
    await redis.set(REDIS_KEY, unique, { ex: TTL_SECONDS });
  } catch (err) {
    console.warn(
      "[coverage-gaps] failed to record:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * `null` = Redis unavailable (caller should fall back).
 * `[]` = Redis ok and refresh-holdings reported no remaining failures.
 */
export async function listCoverageGaps(): Promise<string[] | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const value = await redis.get<string[] | string>(REDIS_KEY);
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.map((t) => String(t).toUpperCase()).filter(Boolean);
    }
    if (typeof value === "string") {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).toUpperCase()).filter(Boolean);
      }
    }
    return [];
  } catch (err) {
    console.warn(
      "[coverage-gaps] failed to read:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
