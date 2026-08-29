export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { findUserById, incrementAiUsage, incrementDailyAiUsage, incrementAiTokenUsage, incrementDailyAiTokenUsage, insertAiLog, resolveAiModelForUserPlan } from "@/lib/db";
import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import { aiCallsTotal, aiRequestDuration, rateLimitHitsTotal } from "@/lib/metrics";
import { checkAiRateLimit, checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { createAiStream } from "@/lib/ai-stream";
import { languageCodeToName } from "@/lib/languages";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { chartChatRequestSchema } from "@/lib/schemas";
import { json401 } from "@/lib/log-unauthorized";
import type { SubscriptionPlan } from "@/lib/types";
import { isPaidPlan } from "@/lib/plan-rank";

export const POST = withMetrics("/api/portfolio/chart-chat", async (request: NextRequest) => {
  const { session, error } = await requireFeatureQuota(request, "ai_consult");
  if (error) return error;
  if (!session) return json401(request, { source: "api/portfolio/chart-chat", reason: "no_session" });

  const user = await findUserById(session.userId);
  const plan = (user?.plan || session?.plan || "free") as SubscriptionPlan;
  if (isPaidPlan(plan)) {
    const rl = await checkAiRateLimit(session.userId, plan, session.role);
    if (!rl.allowed) {
      rateLimitHitsTotal.inc({ provider: "openai" });
      return Response.json(
        {
          error: "Daily AI limit reached",
          reason: "rate_limited",
          provider: "openai",
          limit: rl.limit,
          remaining: 0,
          retryAfter: 86400,
        },
        { status: 429, headers: { "Retry-After": "86400" } },
      );
    }
  }

  const globalCap = await checkGlobalAiCap(session.role);
  if (!globalCap.allowed) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json(
      {
        error: "Platform AI usage limit reached for this month. Please try again next month.",
        used: globalCap.used,
        cap: globalCap.cap,
      },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const gatewayConfigured = await resolveGatewayApiKey(request.headers);
  if (!gatewayConfigured) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json(
      { error: "AI Gateway not configured. Ask your admin to set AI_GATEWAY_API_KEY or the Admin panel key." },
      { status: 501 },
    );
  }

  const parsed = await parseBody(request, chartChatRequestSchema);
  if (!parsed.success) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return parsed.error;
  }

  const { messages, language, context: ctx } = parsed.data;
  const lang = languageCodeToName(language || "en");

  const dataBlock = JSON.stringify(
    {
      range: ctx.range,
      chartMode: ctx.chartMode,
      baseCurrency: ctx.baseCurrency,
      portfolioId: ctx.portfolioId || null,
      displayNoteInterpolated: ctx.displayNoteInterpolated ?? false,
      stats: ctx.stats,
      samples: ctx.samples,
      events: ctx.events,
    },
    null,
    2,
  );

  const systemPrompt = `You are a helpful assistant embedded in a portfolio **evolution chart** in the trefolio app.
The user sees total portfolio value and (when available) **invested capital** (aggregate cost basis in ${ctx.baseCurrency}), over a selected time range.

Rules:
- Write in ${lang}.
- Answer ONLY using the JSON context below (chart samples, stats, buy/sell events). Do NOT invent trades, deposits, or prices.
- **Invested capital** is the app's estimate of total cost basis for the portfolio in ${ctx.baseCurrency}. It typically changes when the user **buys or sells** securities, when positions are adjusted, when cost basis is recalculated, or when data is imported/corrected. It is **not** the same as "cash added from a bank transfer" unless that cash was used in recorded transactions — the chart does not show bank deposits by themselves.
- If \`displayNoteInterpolated\` is true, some **hourly** points between sparse snapshots may be **linearly interpolated for display** only — they are not real intraday market marks. Do not treat those as factual tick-by-tick history.
- If the context is insufficient to answer (e.g. the user asks about a date outside the samples), say what is missing.
- Be concise. Use short paragraphs or bullet points.
- End with a one-line reminder that this is educational, AI-generated, and **not financial advice**.`;

  const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Chart context (JSON):\n${dataBlock}` },
    {
      role: "assistant",
      content:
        "Understood. I will answer only from this chart context and say when something is not shown.",
    },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const model = await resolveAiModelForUserPlan("chart_chat", plan);
  const endTimer = aiRequestDuration.startTimer({ analysis_type: "chart_chat" });
  const aiLogStart = Date.now();
  const lastUserMsg = messages[messages.length - 1]?.content || "";

  try {
    const openaiRes = await fetchGatewayChatCompletions(
      {
        model,
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 900,
        temperature: 0.25,
        messages: openaiMessages,
      },
      { headers: request.headers },
    );

    endTimer();
    const durationMs = Date.now() - aiLogStart;

    if (!openaiRes.ok) {
      aiCallsTotal.inc({ status: "error", analysis_type: "chart_chat" });
      const errText = await openaiRes.text();
      console.error("OpenAI chart-chat error:", openaiRes.status, errText);
      insertAiLog({ userId: session.userId, source: "chart_chat", model, promptSystem: systemPrompt, promptUser: lastUserMsg, durationMs, status: "error", errorMessage: errText.slice(0, 2000) }).catch(() => {});
      await refundFeatureQuota(session.userId, "ai_consult");
      return Response.json(
        { error: "AI service returned an error. Check your API key and quota." },
        { status: 502 },
      );
    }

    aiCallsTotal.inc({ status: "success", analysis_type: "chart_chat" });
    const logId = await insertAiLog({ userId: session.userId, source: "chart_chat", model, promptSystem: systemPrompt, promptUser: lastUserMsg, durationMs }).catch(() => "");
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
      fallbackTokenEstimate: 900 + 1500,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("Chart chat error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
});
