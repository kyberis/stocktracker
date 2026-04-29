export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import {
  getGlobalOpenAIApiKey,
  incrementAiUsage,
  incrementDailyAiUsage,
  incrementAiTokenUsage,
  incrementDailyAiTokenUsage,
  findUserById,
  insertAiLog,
  getAiModelForFlow,
} from "@/lib/db";
import { aiCallsTotal, aiRequestDuration, rateLimitHitsTotal } from "@/lib/metrics";
import { checkAiRateLimit, checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { createAiStream } from "@/lib/ai-stream";
import { languageCodeToName } from "@/lib/languages";
import { withMetrics } from "@/lib/with-metrics";
import type { SubscriptionPlan } from "@/lib/types";

export const POST = withMetrics("/api/stock-evaluation/ai", async (request: NextRequest) => {
  const { session, error } = await requireFeatureQuota(request, "ai_consult");
  if (error) return error;
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await findUserById(session.userId);
  const plan = (user?.plan || session?.plan || "free") as SubscriptionPlan;
  if (plan === "pro") {
    const rl = await checkAiRateLimit(session.userId, plan, session.role);
    if (!rl.allowed) {
      rateLimitHitsTotal.inc({ provider: "openai" });
      return Response.json(
        { error: "Daily AI analysis limit reached", reason: "rate_limited" },
        { status: 429, headers: { "Retry-After": "86400" } },
      );
    }
  }

  const globalCap = await checkGlobalAiCap(session.role);
  if (!globalCap.allowed) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json(
      { error: "Platform AI usage limit reached for this month." },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const apiKey = getGlobalOpenAIApiKey();
  if (!apiKey) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json(
      { error: "OpenAI API key not configured." },
      { status: 501 },
    );
  }

  let body: {
    evaluation?: Record<string, unknown>;
    language?: string;
  };

  try {
    body = await request.json();
  } catch {
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.evaluation) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json({ error: "evaluation data required" }, { status: 400 });
  }

  const lang = languageCodeToName(body.language || "en");
  const eval_ = body.evaluation as Record<string, unknown>;
  const companyName = String(eval_.companyName || eval_.symbol || "Unknown");
  const symbol = String(eval_.symbol || "");

  const systemPrompt = `You are a seasoned value investing analyst who evaluates companies using the Warren Buffett framework for identifying sustainable competitive advantages ("economic moats").

You have been given both the raw financial data AND a computed quantitative evaluation for ${companyName} (${symbol}). Your job is to write a clear, insightful narrative assessment.

Rules:
- Write in ${lang}.
- ONLY use facts and numbers explicitly present in the data provided. Do NOT invent figures or comparisons.
- Structure your response using markdown ## headings.
- Start with "## Investment Thesis: ${companyName} (${symbol})" — a 2-3 sentence summary of the overall moat assessment referencing the composite score.
- Include "## Key Strengths" — explain which criteria passed and WHY they indicate a durable advantage. Use specific numbers from the data.
- Include "## Areas of Caution" — explain any criteria that received "warning" or "fail" status. Contextualize them (e.g. the "Apple Caveat" for retained earnings declining due to aggressive buybacks).
- Include "## Product Durability Assessment" — this is the qualitative analysis. Based on the company's sector, industry, and R&D ratio, assess whether the core product/service is likely to remain relevant for 10+ years. Consider brand strength, switching costs, and disruption risk.
- End with "## Verdict" — state clearly: "Strong Moat", "Narrow Moat", or "No Moat". Include a holding-period recommendation and note the current P/E valuation context.
- Keep the total response under 800 words.
- Tone: authoritative but accessible. Explain financial terms briefly when first used.
- Include a disclaimer that this is not financial advice at the very end.`;

  const userPrompt = `Here is the complete Buffett-framework evaluation for ${companyName} (${symbol}).

## Quantitative Evaluation Results
${JSON.stringify(eval_, null, 2)}

Please provide your narrative assessment based on this data.`;

  const model = await getAiModelForFlow("ai_analysis");
  const endTimer = aiRequestDuration.startTimer({ analysis_type: "moat_evaluation" });
  const aiLogStart = Date.now();

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    endTimer();
    const durationMs = Date.now() - aiLogStart;

    if (!openaiRes.ok) {
      aiCallsTotal.inc({ status: "error", analysis_type: "moat_evaluation" });
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      insertAiLog({ userId: session.userId, source: "moat_evaluation", model, promptSystem: systemPrompt, promptUser: userPrompt, durationMs, status: "error", errorMessage: errText.slice(0, 2000) }).catch(() => {});
      await refundFeatureQuota(session.userId, "ai_consult");
      return Response.json(
        { error: "AI service returned an error." },
        { status: 502 },
      );
    }

    aiCallsTotal.inc({ status: "success", analysis_type: "moat_evaluation" });
    const logId = await insertAiLog({ userId: session.userId, source: "moat_evaluation", model, promptSystem: systemPrompt, promptUser: userPrompt, durationMs }).catch(() => "");
    await Promise.all([
      incrementAiUsage(session.userId),
      incrementDailyAiUsage(session.userId),
      incrementGlobalAiCalls(),
    ]);

    const stream = createAiStream(openaiRes.body, {
      aiLogId: logId || undefined,
      aiLogModel: model,
      onComplete: async (tokens) => {
        await Promise.all([
          incrementAiTokenUsage(session.userId, tokens),
          incrementDailyAiTokenUsage(session.userId, tokens),
          incrementGlobalAiTokens(tokens),
        ]);
      },
      fallbackTokenEstimate: 1500 + 3000,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("Moat AI error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
});
