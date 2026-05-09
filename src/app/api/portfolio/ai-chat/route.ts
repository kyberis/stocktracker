export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";

import { requireFeatureQuota } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import {
  findUserById,
  incrementAiUsage,
  incrementDailyAiUsage,
  incrementAiTokenUsage,
  incrementDailyAiTokenUsage,
  insertAiLog,
  getAiModelForFlow,
  listPortfolios,
} from "@/lib/db";
import { aiCallsTotal, aiRequestDuration, rateLimitHitsTotal } from "@/lib/metrics";
import { checkAiRateLimit, checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { createAiStream } from "@/lib/ai-stream";
import { languageCodeToName } from "@/lib/languages";
import { withMetrics } from "@/lib/with-metrics";
import type { SubscriptionPlan } from "@/lib/types";
import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import { portfolioTelemetryInjectionGuard } from "@/lib/ai/prompt-safety";
import { json401 } from "@/lib/log-unauthorized";

const portfolioAiSchema = z
  .object({
    messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).min(1).max(30),
    language: z.string().optional(),
    /** When false (e.g. stealth mode), no portfolio JSON is sent to the model. */
    includePortfolioData: z.boolean().optional().default(true),
    activePortfolioId: z.string().optional(),
    baseCurrency: z.string().optional().default("EUR"),
  })
  .strict();

export const POST = withMetrics("/api/portfolio/ai-chat", async (request: NextRequest) => {
  const { session, error } = await requireFeatureQuota(request, "ai_consult");
  if (error) return error;
  if (!session) return json401(request, { source: "api/portfolio/ai-chat", reason: "no_session" });

  const user = await findUserById(session.userId);
  const plan = (user?.plan || session?.plan || "free") as SubscriptionPlan;
  if (plan === "pro") {
    const rl = await checkAiRateLimit(session.userId, plan, session.role);
    if (!rl.allowed) {
      rateLimitHitsTotal.inc({ provider: "openai" });
      return Response.json(
        { error: "Daily AI limit reached", reason: "rate_limited", limit: rl.limit, remaining: 0, retryAfter: 86400 },
        { status: 429, headers: { "Retry-After": "86400" } },
      );
    }
  }

  const globalCap = await checkGlobalAiCap(session.role);
  if (!globalCap.allowed) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json(
      { error: "Platform AI usage limit reached for this month.", used: globalCap.used, cap: globalCap.cap },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const gatewayConfigured = await resolveGatewayApiKey();
  if (!gatewayConfigured) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json(
      { error: "AI Gateway not configured. Ask your admin to set AI_GATEWAY_API_KEY or the Admin panel key." },
      { status: 501 },
    );
  }

  let body: z.infer<typeof portfolioAiSchema>;
  try {
    body = portfolioAiSchema.parse(await request.json());
  } catch {
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, language, includePortfolioData, activePortfolioId, baseCurrency } = body;
  const lang = languageCodeToName(language || "en");

  let contextBlock = "No portfolio data shared.";
  if (includePortfolioData) {
    const portfolios = await listPortfolios(session.userId);
    let pid = activePortfolioId;
    if (pid && !portfolios.some((p) => p.id === pid)) {
      pid = undefined;
    }
    const active = portfolios.find((p) => p.id === pid) || portfolios.find((p) => p.isDefault) || portfolios[0];
    try {
      const snap = await buildPortfolioSnapshot({
        userId: session.userId,
        portfolioId: active?.id,
        baseCurrency: baseCurrency || "EUR",
        enrichForPortfolioAi: true,
      });
      contextBlock = JSON.stringify(snap, null, 2);
    } catch (err) {
      console.error("[portfolio/ai-chat] snapshot build failed", err);
      contextBlock = "No portfolio data shared (snapshot could not be loaded).";
    }
  }

  const guard = portfolioTelemetryInjectionGuard(`respond in ${lang}`);

  const systemPrompt = `You are **Portfolio AI**, an intelligent portfolio analysis assistant embedded in the trefolio investment tracking app.

The user has shared their portfolio snapshot below (JSON). Use it to answer questions about their holdings, performance, risk, diversification, dividends, and goals.

The snapshot includes per-holding data: currentPrice, purchasePrice, totalGainPct (since purchase), dayChangePct (today), fiftyTwoWeekHigh/Low, dividend fields when available, sector, region, and portfolio-level totals and allocation.

${guard}

Rules:
- Write in ${lang}.
- Answer ONLY using the portfolio data provided. Do NOT invent holdings, prices, or transactions that are not in the snapshot.
- Be specific: reference actual ticker symbols, values, and percentages from the data.
- Use bullet points or short paragraphs for readability.
- When discussing risk or concentration, reference actual sector/region weights.
- For dividend estimates, use trailing annual dividend data from the snapshot when present.
- When the user asks about a time period not directly available (e.g. "this month"), use the best available metric (e.g. totalGainPct since purchase, dayChangePct for today, proximity to 52-week high/low) and clearly state which metric you are using as a proxy.
- Keep responses under 400 words unless the user asks for detail.
- End every response with a brief reminder that this is AI-generated analysis and **not financial advice**.

Portfolio snapshot:
\`\`\`json
${contextBlock}
\`\`\``;

  const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: "I have your portfolio data loaded. How can I help you today?" },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const model = await getAiModelForFlow("portfolio_chat");
  const endTimer = aiRequestDuration.startTimer({ analysis_type: "portfolio_ai" });
  const aiLogStart = Date.now();
  const lastUserMsg = messages[messages.length - 1]?.content || "";

  try {
    const openaiRes = await fetchGatewayChatCompletions({
      model,
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: 1000,
      temperature: 0.3,
      messages: openaiMessages,
    });

    endTimer();
    const durationMs = Date.now() - aiLogStart;

    if (!openaiRes.ok) {
      aiCallsTotal.inc({ status: "error", analysis_type: "portfolio_ai" });
      const errText = await openaiRes.text();
      console.error("OpenAI portfolio-ai error:", openaiRes.status, errText);
      insertAiLog({ userId: session.userId, source: "portfolio_ai", model, promptSystem: systemPrompt, promptUser: lastUserMsg, durationMs, status: "error", errorMessage: errText.slice(0, 2000) }).catch(() => {});
      await refundFeatureQuota(session.userId, "ai_consult");
      return Response.json(
        { error: "AI service returned an error. Check your API key and quota." },
        { status: 502 },
      );
    }

    aiCallsTotal.inc({ status: "success", analysis_type: "portfolio_ai" });
    const logId = await insertAiLog({ userId: session.userId, source: "portfolio_ai", model, promptSystem: systemPrompt, promptUser: lastUserMsg, durationMs }).catch(() => "");
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
      fallbackTokenEstimate: 1000 + 2000,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("Portfolio AI error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
});
