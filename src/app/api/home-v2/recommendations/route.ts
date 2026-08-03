import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import {
  clearAllRecommendationStates,
  getManualRefreshAvailability,
  getRecommendationCache,
  trackEvent,
  upsertRecommendationState,
} from "@/lib/db";
import { resolveRecommendationQueue } from "@/lib/homepage/resolve-recommendation-queue";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

async function withManualMeta(
  userId: string,
  portfolioId: string | undefined,
  result: Awaited<ReturnType<typeof resolveRecommendationQueue>>,
) {
  const cached = await getRecommendationCache(userId, portfolioId || "");
  const avail = getManualRefreshAvailability(cached?.lastManualAt);
  return {
    current: result.current,
    remaining: result.remaining,
    total: result.total,
    rawTotal: result.rawTotal,
    queue: result.queue,
    source: result.source,
    weekKey: result.weekKey,
    canManualRefresh: avail.canManualRefresh,
    nextManualRefreshAt: avail.nextManualRefreshAt,
    cooldownRemainingMs: avail.cooldownRemainingMs,
  };
}

export const GET = withMetrics("/api/home-v2/recommendations", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/home-v2/recommendations", reason: "no_session" });

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const result = await resolveRecommendationQueue({
    userId: session.userId,
    portfolioId,
  });

  return NextResponse.json(await withManualMeta(session.userId, portfolioId, result));
});

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("skipped"),
    key: z.string().min(1).max(200),
  }),
  z.object({
    action: z.literal("acted"),
    key: z.string().min(1).max(200),
  }),
  z.object({
    action: z.literal("refresh"),
  }),
]);

export const POST = withMetrics("/api/home-v2/recommendations", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/home-v2/recommendations", reason: "no_session" });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const portfolioKey = portfolioId || "";

  if (parsed.data.action === "refresh") {
    const cached = await getRecommendationCache(session.userId, portfolioKey);
    const avail = getManualRefreshAvailability(cached?.lastManualAt);

    if (!avail.canManualRefresh) {
      const result = await resolveRecommendationQueue({
        userId: session.userId,
        portfolioId,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "manual_refresh_cooldown",
          refreshed: false,
          ...await withManualMeta(session.userId, portfolioId, result),
          cooldownMs: avail.cooldownRemainingMs,
        },
        { status: 429 },
      );
    }

    await clearAllRecommendationStates(session.userId);
    const result = await resolveRecommendationQueue({
      userId: session.userId,
      portfolioId,
      forceRefresh: true,
      markManual: true,
    });
    void trackEvent(session.userId, "home_rec_manual_refresh", {
      portfolioId: portfolioKey,
      total: String(result.total),
    });

    return NextResponse.json({
      ok: true,
      refreshed: true,
      ...await withManualMeta(session.userId, portfolioId, result),
    });
  }

  const { key, action } = parsed.data;
  await upsertRecommendationState(session.userId, key, action);
  void trackEvent(session.userId, action === "acted" ? "home_rec_acted" : "home_rec_next", {
    key,
  });

  const result = await resolveRecommendationQueue({
    userId: session.userId,
    portfolioId,
  });

  return NextResponse.json({
    ok: true,
    ...await withManualMeta(session.userId, portfolioId, result),
  });
});
