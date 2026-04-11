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
  getDigestSources,
  updateDigestContent,
} from "@/lib/db";
import type { MarketDigestSource } from "@/lib/db";
import { getGlobalOpenAIApiKey, getAiModelForFlow } from "@/lib/db/settings";
import { getAppRouteParam } from "@/lib/api-route-params";
import { withMetrics } from "@/lib/with-metrics";
import { generateDigestFromSources } from "@/lib/digest-generation";
import { generateDigestTweet, buildDigestHashtags, computeEveningSchedule } from "@/lib/digest-to-tweet";
import { hasXCredentials } from "@/lib/x-client";

export const GET = withMetrics("/api/admin/market-digests/[id]", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const id = getAppRouteParam(req, ctx, "id");
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

  const id = getAppRouteParam(req, ctx, "id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: {
    action?: "publish" | "archive" | "regenerate";
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

  if (body.action === "regenerate") {
    const apiKey = getGlobalOpenAIApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "No OpenAI API key configured" }, { status: 500 });
    }

    const sources = await getDigestSources(id);
    if (sources.length === 0) {
      return NextResponse.json({ error: "No sources found for this digest" }, { status: 400 });
    }

    const model = await getAiModelForFlow("digest_email");
    const sourcesForAI = sources.map((s: MarketDigestSource) => ({
      sender: s.sender,
      textBody: s.rawText,
      htmlBody: s.rawHtml,
      extractedLinks: s.extractedLinks,
    }));

    const result = await generateDigestFromSources(apiKey, model, sourcesForAI);
    if (!result) {
      return NextResponse.json({ error: "AI generation failed — check logs" }, { status: 502 });
    }

    await updateDigestContent(id, {
      mentionedTickers: result.rewrite.mentioned_tickers || [],
      sectors: result.rewrite.sectors || [],
      sentiment: result.rewrite.sentiment || "neutral",
      aiModel: model,
      tokensUsed: result.totalTokens,
      translations: result.translations,
    });

    return NextResponse.json({ ok: true, action: "regenerated", tokensUsed: result.totalTokens, tickers: result.rewrite.mentioned_tickers });
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
