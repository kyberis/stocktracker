import { NextRequest, NextResponse } from "next/server";
import { getMetricsSnapshot, purgeOldAnalyticsEvents, recordRateLimitUsage } from "@/lib/db";
import { pushGauges } from "@/lib/grafana-push";
import { getRedisClient } from "@/lib/upstash";
import { withCronLogging } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Scan Redis keys matching `rl:av:*` and `rl:ai-import:*`, then
 * write the current counts into the Turso `rate_limits` table so the
 * admin dashboard stays accurate to within ~1 minute.
 */
async function syncRedisCountersToTurso(): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;

  let synced = 0;

  for (const { prefix, provider } of [
    { prefix: "rl:av", provider: "alphavantage" },
    { prefix: "rl:ai-import", provider: "openai_import" },
  ] as const) {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: `${prefix}:*`,
        count: 100,
      });
      cursor = typeof nextCursor === "string" ? parseInt(nextCursor, 10) : nextCursor;

      for (const key of keys) {
        const parts = key.split(":");
        // Key format: {prefix}:{userId} or {prefix}:{userId}:{window}
        // The userId is after the prefix parts
        const prefixParts = prefix.split(":").length;
        const userId = parts[prefixParts];
        if (!userId) continue;

        const val = await redis.get<number>(key);
        const count = typeof val === "number" ? val : 0;
        if (count <= 0) continue;

        const windowKey =
          provider === "alphavantage"
            ? new Date().toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 10);

        await recordRateLimitUsage(userId, provider, count, windowKey);
        synced++;
      }
    } while (cursor !== 0);
  }

  return synced;
}

const runPushGauges = withCronLogging("push-gauges", async () => {
  const [snapshot, redisSynced, purged] = await Promise.all([
    getMetricsSnapshot(),
    syncRedisCountersToTurso().catch((err) => {
      console.error("Redis→Turso sync failed:", err);
      return 0;
    }),
    purgeOldAnalyticsEvents().catch((err) => {
      console.error("Analytics purge failed:", err);
      return 0;
    }),
  ]);

  const points: { name: string; labels: Record<string, string>; value: number }[] = [
    { name: "trefolio_users_total", labels: { plan: "free" }, value: snapshot.freeUsers },
    { name: "trefolio_users_total", labels: { plan: "pro" }, value: snapshot.proUsers },
    { name: "trefolio_users_active", labels: { window: "7d" }, value: snapshot.activeUsers7d },
    { name: "trefolio_users_active", labels: { window: "30d" }, value: snapshot.activeUsers30d },
    { name: "trefolio_db_holdings_total", labels: {}, value: snapshot.holdingsCount },
    { name: "trefolio_db_transactions_total", labels: {}, value: snapshot.transactionsCount },
  ];

  for (const ev of snapshot.eventsLast24h) {
    points.push({
      name: "trefolio_events_last_24h",
      labels: { event: ev.event },
      value: ev.count,
    });
  }

  await pushGauges(points);

  return { ok: true, pushed: points.length, redisSynced, purged };
});

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const mask = (s: string | null) =>
      s ? `${s.slice(0, 8)}…${s.slice(-4)} (len=${s.length})` : "(empty)";
    console.error("[push-gauges] 401 auth mismatch", {
      secretSet: !!cronSecret,
      secretPreview: mask(cronSecret),
      headerPresent: !!authHeader,
      headerPreview: mask(authHeader),
    });
    return NextResponse.json(
      {
        error: "Unauthorized",
        reason: !authHeader
          ? "missing_authorization_header"
          : "secret_mismatch",
        secretConfigured: !!cronSecret,
        headerPresent: !!authHeader,
      },
      { status: 401 },
    );
  }
  return runPushGauges();
}
