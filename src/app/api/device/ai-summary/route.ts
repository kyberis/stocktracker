export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  findUserByWidgetToken,
  findUserByDevicePasskey,
  getGlobalOpenAIApiKey,
  listHoldings,
  listCashEntries,
  trackEvent,
  isFeatureEnabled,
  insertAiLog,
  getAiModelForFlow,
} from "@/lib/db";
import { effectivePlan } from "@/lib/subscription";
import { checkAndIncrementFeatureQuota, refundFeatureQuota } from "@/lib/feature-quotas";
import { checkGlobalAiCap, incrementGlobalAiCalls, checkDeviceAuthRateLimit, getClientIp } from "@/lib/rate-limit";
import { aiCallsTotal, aiRequestDuration, deviceApiCalls } from "@/lib/metrics";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

async function resolveAuthedUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const ip = getClientIp(req);
  const rl = await checkDeviceAuthRateLimit(ip);
  if (!rl.allowed) return null;

  const token = auth.slice(7);
  const user = await findUserByWidgetToken(token) ?? await findUserByDevicePasskey(token);
  return user || null;
}

export const POST = withMetrics("/api/device/ai-summary", async (request: NextRequest) => {
  if (!(await isFeatureEnabled("device_enabled"))) {
    return Response.json({ error: "Device features are not enabled" }, { status: 404 });
  }

  const fwVersion = request.headers.get("x-firmware-version");
  if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/ai-summary", status: "attempt" });

  const user = await resolveAuthedUser(request);
  if (!user) {
    if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/ai-summary", status: "auth_failed" });
    return json401(request, {
      source: "api/device/ai-summary",
      reason: "device_bearer_auth_failed",
      tags: { hasBearer: Boolean(request.headers.get("authorization")?.startsWith("Bearer ")) },
    });
  }

  const plan = effectivePlan(user.plan, user.plan_expires_at);
  const quota = await checkAndIncrementFeatureQuota(user.id, "ai_portfolio_review", plan);
  if (!quota.allowed) {
    trackEvent(user.id, "device_ai_summary_limit_reached", {
      used: String(quota.used),
      limit: String(quota.limit),
    });
    return Response.json(
      {
        error: "Monthly AI summary limit reached",
        paywall: true,
        reason: "quota_exceeded",
        feature: "ai_portfolio_review",
        used: quota.used,
        limit: quota.limit,
        resetAt: quota.resetAt,
      },
      { status: 429 },
    );
  }
  const limit = quota.limit;

  const globalCap = await checkGlobalAiCap();
  if (!globalCap.allowed) {
    await refundFeatureQuota(user.id, "ai_portfolio_review");
    return Response.json(
      { error: "Platform AI limit reached. Try again next month." },
      { status: 429 },
    );
  }

  const apiKey = getGlobalOpenAIApiKey();
  if (!apiKey) {
    await refundFeatureQuota(user.id, "ai_portfolio_review");
    return Response.json(
      { error: "AI service not configured" },
      { status: 501 },
    );
  }

  const [holdings, cashEntries] = await Promise.all([
    listHoldings(user.id),
    listCashEntries(user.id),
  ]);

  if (holdings.length === 0 && cashEntries.length === 0) {
    await refundFeatureQuota(user.id, "ai_portfolio_review");
    return Response.json({ error: "No holdings to review" }, { status: 400 });
  }

  const holdingsSummary = holdings.map((h) => ({
    name: h.name,
    ticker: h.ticker,
    type: h.assetType || "stock",
    shares: h.shares,
    sector: h.sector || "Unknown",
  }));
  const totalCashEUR = cashEntries.reduce((s, c) => s + c.amountEUR, 0);

  const portfolioData = `Holdings (${holdings.length}): ${JSON.stringify(holdingsSummary)}
Cash: €${totalCashEUR.toFixed(0)}`;

  const systemPrompt = `You are a concise portfolio advisor for a small hardware display.
Rules:
- Write in English.
- ONLY use the data provided. Do NOT invent prices or benchmarks.
- Respond with EXACTLY 3 bullet points, each one sentence. No headings, no markdown.
- First bullet: overall portfolio health (Excellent/Good/Fair/Needs Attention).
- Second bullet: biggest risk or concentration issue.
- Third bullet: one specific actionable recommendation.
- Total response must be under 200 words.
- End with a very brief disclaimer (one short sentence).`;

  const userPrompt = `Summarize this portfolio:\n${portfolioData}`;

  trackEvent(user.id, "device_ai_summary_requested", {
    holdingsCount: String(holdings.length),
  });

  const model = await getAiModelForFlow("device_summary");
  const endTimer = aiRequestDuration.startTimer({ analysis_type: "device_ai_summary" });
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
        stream: false,
        max_tokens: 300,
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
      aiCallsTotal.inc({ status: "error", analysis_type: "device_ai_summary" });
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      insertAiLog({ userId: user.id, source: "device_ai_summary", model, promptSystem: systemPrompt, promptUser: userPrompt, durationMs, status: "error", errorMessage: errText.slice(0, 2000) }).catch(() => {});
      await refundFeatureQuota(user.id, "ai_portfolio_review");
      return Response.json(
        { error: "AI service error" },
        { status: 502 },
      );
    }

    aiCallsTotal.inc({ status: "success", analysis_type: "device_ai_summary" });
    await incrementGlobalAiCalls();
    trackEvent(user.id, "device_ai_summary_completed", {
      holdingsCount: String(holdings.length),
    });

    const result = await openaiRes.json();
    const summary = result.choices?.[0]?.message?.content ?? "Unable to generate summary.";
    const totalTokens = result.usage?.total_tokens ?? 300;
    const deviceInputTokens = result.usage?.prompt_tokens ?? 0;
    const deviceOutputTokens = result.usage?.completion_tokens ?? 0;
    insertAiLog({ userId: user.id, source: "device_ai_summary", model, promptSystem: systemPrompt, promptUser: userPrompt, response: summary, tokensUsed: totalTokens, tokensInput: deviceInputTokens, tokensOutput: deviceOutputTokens, durationMs }).catch(() => {});

    return Response.json(
      { summary, used: quota.used, limit },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (err) {
    console.error("Device AI summary error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(user.id, "ai_portfolio_review");
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
});
