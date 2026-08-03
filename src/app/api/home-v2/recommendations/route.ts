import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import {
  clearSkippedRecommendationStates,
  getRecommendationCache,
  trackEvent,
  upsertRecommendationState,
} from "@/lib/db";
import { resolveRecommendationQueue } from "@/lib/homepage/resolve-recommendation-queue";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

/** Manual refresh cooldown (ms) — avoid hammering Yahoo/FX. */
const MANUAL_REFRESH_COOLDOWN_MS = 60_000;

export const GET = withMetrics("/api/home-v2/recommendations", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/home-v2/recommendations", reason: "no_session" });

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const result = await resolveRecommendationQueue({
    userId: session.userId,
    portfolioId,
  });

  return NextResponse.json({
    current: result.current,
    remaining: result.remaining,
    total: result.total,
    queue: result.queue,
    source: result.source,
    weekKey: result.weekKey,
  });
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
    if (cached?.computedAt) {
      const age = Date.now() - Date.parse(cached.computedAt);
      if (Number.isFinite(age) && age >= 0 && age < MANUAL_REFRESH_COOLDOWN_MS) {
        const result = await resolveRecommendationQueue({
          userId: session.userId,
          portfolioId,
        });
        return NextResponse.json({
          ok: true,
          refreshed: false,
          cooldownMs: MANUAL_REFRESH_COOLDOWN_MS - age,
          current: result.current,
          remaining: result.remaining,
          total: result.total,
          queue: result.queue,
          source: result.source,
          weekKey: result.weekKey,
        });
      }
    }

    await clearSkippedRecommendationStates(session.userId);
    const result = await resolveRecommendationQueue({
      userId: session.userId,
      portfolioId,
      forceRefresh: true,
    });
    void trackEvent(session.userId, "home_rec_manual_refresh", {
      portfolioId: portfolioKey,
      total: String(result.total),
    });

    return NextResponse.json({
      ok: true,
      refreshed: true,
      current: result.current,
      remaining: result.remaining,
      total: result.total,
      queue: result.queue,
      source: result.source,
      weekKey: result.weekKey,
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
    current: result.current,
    remaining: result.remaining,
    total: result.total,
    queue: result.queue,
    source: result.source,
    weekKey: result.weekKey,
  });
});
