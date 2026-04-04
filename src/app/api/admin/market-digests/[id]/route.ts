import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getMarketDigestWithTranslations,
  updateTranslation,
  publishDigest,
  archiveDigest,
  getDigestTranslation,
  markDigestXScheduled,
  createXPost,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { generateDigestTweet, buildDigestHashtags, computeEveningSchedule } from "@/lib/digest-to-tweet";
import { hasXCredentials } from "@/lib/x-client";

export const GET = withMetrics("/api/admin/market-digests/[id]", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const digest = await getMarketDigestWithTranslations(id);
  if (!digest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ digest });
});

export const PUT = withMetrics("/api/admin/market-digests/[id]", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: {
    action?: "publish" | "archive";
    translationId?: string;
    title?: string;
    summary?: string;
    keyPoints?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.action === "publish") {
    await publishDigest(id);

    let xPost: { id: string; scheduledAt: string } | null = null;
    try {
      const digest = await getMarketDigestWithTranslations(id);
      const hasX = await hasXCredentials();
      if (digest && !digest.xScheduledPostId && hasX) {
        const enTranslation = await getDigestTranslation(id, "en");
        if (enTranslation) {
          const tweetContent = await generateDigestTweet(enTranslation, digest.mentionedTickers);
          const hashtags = buildDigestHashtags(digest.mentionedTickers);
          const scheduledAt = computeEveningSchedule();
          const post = await createXPost({ content: tweetContent, hashtags, scheduledAt });
          await markDigestXScheduled(id, post.id);
          xPost = { id: post.id, scheduledAt };
        }
      }
    } catch (err) {
      console.error("[market-digest] X post scheduling failed:", err);
    }

    return NextResponse.json({ ok: true, action: "published", xPost });
  }

  if (body.action === "archive") {
    await archiveDigest(id);
    return NextResponse.json({ ok: true, action: "archived" });
  }

  if (body.translationId) {
    await updateTranslation(body.translationId, {
      title: body.title,
      summary: body.summary,
      keyPoints: body.keyPoints,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
});
