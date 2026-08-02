export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import {
  findUserById,
  incrementAiTokenUsage,
  incrementDailyAiTokenUsage,
  insertAiLog,
  listHoldings,
  resolveAiModelForUserPlan,
  trackEvent,
  updateHolding,
} from "@/lib/db";
import { aiCallsTotal, aiRequestDuration, rateLimitHitsTotal } from "@/lib/metrics";
import { checkAiRateLimit, checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { parseBody } from "@/lib/api-response";
import { aiClassifyHoldingSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";
import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import {
  HOLDING_CLASSIFICATION_SYSTEM_PROMPT,
  buildHoldingClassificationUserPrompt,
  parseHoldingClassificationResponse,
} from "@/lib/ai-classify-holding";
import { AI_FLOW_META } from "@/lib/ai-models";
import type { SubscriptionPlan } from "@/lib/types";

export const POST = withMetrics("/api/holdings/ai-classify", async (request: NextRequest) => {
  const { session, error } = await requireFeatureQuota(request, "ai_consult");
  if (error) return error;
  if (!session) return json401(request, { source: "api/holdings/ai-classify", reason: "no_session" });

  const parsed = await parseBody(request, aiClassifyHoldingSchema);
  if (!parsed.success) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return parsed.error;
  }

  const { holdingId } = parsed.data;
  const holdings = await listHoldings(session.userId);
  const holding = holdings.find((h) => h.id === holdingId);
  if (!holding) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  const user = await findUserById(session.userId);
  const plan = (user?.plan || session.plan || "free") as SubscriptionPlan;
  if (plan === "pro") {
    const rl = await checkAiRateLimit(session.userId, plan, session.role);
    if (!rl.allowed) {
      rateLimitHitsTotal.inc({ provider: "openai" });
      await refundFeatureQuota(session.userId, "ai_consult");
      return NextResponse.json(
        { error: "Daily AI limit reached", reason: "rate_limited" },
        { status: 429, headers: { "Retry-After": "86400" } },
      );
    }
  }

  const globalCap = await checkGlobalAiCap(session.role);
  if (!globalCap.allowed) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return NextResponse.json(
      { error: "Platform AI usage limit reached for this month. Please try again next month." },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const gatewayConfigured = await resolveGatewayApiKey(request.headers);
  if (!gatewayConfigured) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return NextResponse.json({ error: "AI Gateway not configured." }, { status: 501 });
  }

  const systemPrompt = HOLDING_CLASSIFICATION_SYSTEM_PROMPT;
  const userPrompt = buildHoldingClassificationUserPrompt({
    ticker: holding.ticker,
    name: holding.name,
    isin: holding.isin,
    exchange: holding.exchange,
    assetType: holding.assetType,
  });

  trackEvent(session.userId, "holding_ai_classify_requested", {
    ticker: holding.ticker.slice(0, 32),
  });

  const flowMeta = AI_FLOW_META.holding_classification;
  const model = await resolveAiModelForUserPlan("holding_classification", plan);
  const endTimer = aiRequestDuration.startTimer({ analysis_type: "holding_classification" });
  const aiLogStart = Date.now();

  try {
    const openaiRes = await fetchGatewayChatCompletions(
      {
        model,
        stream: false,
        max_tokens: flowMeta.maxTokens,
        temperature: flowMeta.temperature,
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
      aiCallsTotal.inc({ status: "error", analysis_type: "holding_classification" });
      const errText = await openaiRes.text();
      console.error("Holding AI classify error:", openaiRes.status, errText);
      insertAiLog({
        userId: session.userId,
        source: "holding_classification",
        model,
        promptSystem: systemPrompt,
        promptUser: userPrompt,
        durationMs,
        status: "error",
        errorMessage: errText.slice(0, 2000),
      }).catch(() => {});
      await refundFeatureQuota(session.userId, "ai_consult");
      return NextResponse.json({ error: "AI service returned an error." }, { status: 502 });
    }

    aiCallsTotal.inc({ status: "success", analysis_type: "holding_classification" });

    const result = await openaiRes.json();
    const content: string = result.choices?.[0]?.message?.content?.trim() || "";
    const totalTokens: number = result.usage?.total_tokens ?? 150;
    const inputTokens: number = result.usage?.prompt_tokens ?? 0;
    const outputTokens: number = result.usage?.completion_tokens ?? 0;

    const classification = parseHoldingClassificationResponse(content);
    if (!classification) {
      insertAiLog({
        userId: session.userId,
        source: "holding_classification",
        model,
        promptSystem: systemPrompt,
        promptUser: userPrompt,
        response: content.slice(0, 2000),
        durationMs,
        status: "error",
        errorMessage: "unparseable classification",
      }).catch(() => {});
      await refundFeatureQuota(session.userId, "ai_consult");
      return NextResponse.json({ error: "AI returned an unusable classification." }, { status: 502 });
    }

    const updated = await updateHolding(session.userId, holdingId, {
      sector: classification.sector,
      region: classification.region,
      assetClass: classification.assetClass,
    });

    await Promise.all([
      insertAiLog({
        userId: session.userId,
        source: "holding_classification",
        model,
        promptSystem: systemPrompt,
        promptUser: userPrompt,
        response: content.slice(0, 2000),
        tokensUsed: totalTokens,
        tokensInput: inputTokens,
        tokensOutput: outputTokens,
        durationMs,
        status: "success",
      }).catch(() => {}),
      incrementAiTokenUsage(session.userId, totalTokens),
      incrementDailyAiTokenUsage(session.userId, totalTokens),
      incrementGlobalAiCalls(),
      incrementGlobalAiTokens(totalTokens),
    ]);

    return NextResponse.json({
      classification,
      holding: updated,
      aiGenerated: true,
    });
  } catch (err) {
    endTimer();
    console.error("Holding AI classify failed:", err);
    await refundFeatureQuota(session.userId, "ai_consult");
    return NextResponse.json({ error: "Failed to classify holding" }, { status: 500 });
  }
});
