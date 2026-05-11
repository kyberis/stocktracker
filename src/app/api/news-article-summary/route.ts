export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import {
  findUserById,
  incrementAiTokenUsage,
  incrementDailyAiTokenUsage,
  insertAiLog,
  resolveAiModelForUserPlan,
  trackEvent,
} from "@/lib/db";
import { aiCallsTotal, aiRequestDuration, rateLimitHitsTotal } from "@/lib/metrics";
import { checkAiRateLimit, checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { languageCodeToName } from "@/lib/languages";
import { parseBody } from "@/lib/api-response";
import { newsArticleSummarySchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";
import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import type { SubscriptionPlan } from "@/lib/types";

export const POST = withMetrics("/api/news-article-summary", async (request: NextRequest) => {
  const { session, error } = await requireFeatureQuota(request, "news_ai_summary");
  if (error) return error;
  if (!session) return json401(request, { source: "api/news-article-summary", reason: "no_session" });

  const parsed = await parseBody(request, newsArticleSummarySchema);
  if (!parsed.success) {
    await refundFeatureQuota(session.userId, "news_ai_summary");
    return parsed.error;
  }

  const { title, summary: snippet, source, url, publishedAt, language } = parsed.data;

  const newsUser = await findUserById(session.userId);
  const plan = (newsUser?.plan || session.plan || "free") as SubscriptionPlan;
  if (plan === "pro") {
    const rl = await checkAiRateLimit(session.userId, plan, session.role);
    if (!rl.allowed) {
      rateLimitHitsTotal.inc({ provider: "openai" });
      await refundFeatureQuota(session.userId, "news_ai_summary");
      return Response.json(
        { error: "Daily AI limit reached", reason: "rate_limited" },
        { status: 429, headers: { "Retry-After": "86400" } },
      );
    }
  }

  const globalCap = await checkGlobalAiCap(session.role);
  if (!globalCap.allowed) {
    await refundFeatureQuota(session.userId, "news_ai_summary");
    return Response.json(
      { error: "Platform AI usage limit reached for this month. Please try again next month." },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const gatewayConfigured = await resolveGatewayApiKey(request.headers);
  if (!gatewayConfigured) {
    await refundFeatureQuota(session.userId, "news_ai_summary");
    return Response.json({ error: "AI Gateway not configured." }, { status: 501 });
  }

  const lang = languageCodeToName(language || "en");

  const systemPrompt = `You are a careful financial-news assistant for retail investors.
Rules:
- Write in ${lang}.
- Base your summary ONLY on the headline, source, date, and excerpt provided below. Do NOT claim to have read the full article or invent quotes, numbers, or facts not implied by the excerpt.
- Produce 3–5 short bullet points OR one compact paragraph (under 180 words total).
- Stay neutral; no buy/sell recommendations.
- End with one sentence stating this is an AI summary of third-party news and may omit details from the original piece — not investment advice.`;

  const userPrompt = `Summarize this portfolio-related news item for quick reading.

Title: ${title}
Source: ${source || "unknown"}
Published: ${publishedAt || "unknown"}
Article URL (reference only): ${url}

Excerpt / summary text from our feed:
${snippet || "(no excerpt — summarize cautiously from the title only)"}`;

  trackEvent(session.userId, "news_article_summary_requested", {
    sourceLabel: (source || "unknown").slice(0, 80),
  });

  const model = await resolveAiModelForUserPlan("news_article_summary", plan);
  const endTimer = aiRequestDuration.startTimer({ analysis_type: "news_article_summary" });
  const aiLogStart = Date.now();

  try {
    const openaiRes = await fetchGatewayChatCompletions(
      {
        model,
        stream: false,
        max_tokens: 450,
        temperature: 0.25,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      { headers: request.headers },
    );

    endTimer();
    const durationMs = Date.now() - aiLogStart;

    if (!openaiRes.ok) {
      aiCallsTotal.inc({ status: "error", analysis_type: "news_article_summary" });
      const errText = await openaiRes.text();
      console.error("News summary AI error:", openaiRes.status, errText);
      insertAiLog({
        userId: session.userId,
        source: "news_article_summary",
        model,
        promptSystem: systemPrompt,
        promptUser: userPrompt,
        durationMs,
        status: "error",
        errorMessage: errText.slice(0, 2000),
      }).catch(() => {});
      await refundFeatureQuota(session.userId, "news_ai_summary");
      return Response.json({ error: "AI service returned an error." }, { status: 502 });
    }

    aiCallsTotal.inc({ status: "success", analysis_type: "news_article_summary" });

    const result = await openaiRes.json();
    const summaryText: string = result.choices?.[0]?.message?.content?.trim() || "";
    const totalTokens: number = result.usage?.total_tokens ?? 600;
    const inputTokens: number = result.usage?.prompt_tokens ?? 0;
    const outputTokens: number = result.usage?.completion_tokens ?? 0;

    if (!summaryText) {
      insertAiLog({
        userId: session.userId,
        source: "news_article_summary",
        model,
        promptSystem: systemPrompt,
        promptUser: userPrompt,
        durationMs,
        status: "error",
        errorMessage: "empty completion",
      }).catch(() => {});
      await refundFeatureQuota(session.userId, "news_ai_summary");
      return Response.json({ error: "AI returned an empty summary." }, { status: 502 });
    }

    await Promise.all([
      insertAiLog({
        userId: session.userId,
        source: "news_article_summary",
        model,
        promptSystem: systemPrompt,
        promptUser: userPrompt,
        response: summaryText,
        tokensUsed: totalTokens,
        tokensInput: inputTokens,
        tokensOutput: outputTokens,
        durationMs,
      }).catch(() => {}),
      incrementGlobalAiCalls(),
      incrementAiTokenUsage(session.userId, totalTokens),
      incrementDailyAiTokenUsage(session.userId, totalTokens),
      incrementGlobalAiTokens(totalTokens),
    ]);

    trackEvent(session.userId, "news_article_summary_completed", { ok: "1" });

    return Response.json({ summary: summaryText });
  } catch (err) {
    console.error("News article summary error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(session.userId, "news_ai_summary");
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
});
