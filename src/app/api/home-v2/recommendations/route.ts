import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { trackEvent, upsertRecommendationState } from "@/lib/db";
import { resolveRecommendationQueue } from "@/lib/homepage/resolve-recommendation-queue";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

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

const postSchema = z.object({
  key: z.string().min(1).max(200),
  action: z.enum(["skipped", "acted"]),
});

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

  const { key, action } = parsed.data;
  await upsertRecommendationState(session.userId, key, action);
  void trackEvent(session.userId, action === "acted" ? "home_rec_acted" : "home_rec_next", {
    key,
  });

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
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
