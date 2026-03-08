export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  findUserByWidgetToken,
  findUserByDevicePasskey,
  getGlobalOpenAIApiKey,
  listHoldings,
  listCashEntries,
  getPortfolioReviewUsage,
  incrementPortfolioReviewUsage,
  trackEvent,
} from "@/lib/db";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { checkGlobalAiCap, incrementGlobalAiCalls, checkDeviceAuthRateLimit, getClientIp } from "@/lib/rate-limit";
import { aiCallsTotal, aiRequestDuration, deviceApiCalls } from "@/lib/metrics";
import { withMetrics } from "@/lib/with-metrics";

async function resolveProUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const ip = getClientIp(req);
  const rl = await checkDeviceAuthRateLimit(ip);
  if (!rl.allowed) return null;

  const token = auth.slice(7);
  const user = await findUserByWidgetToken(token) ?? await findUserByDevicePasskey(token);
  if (!user || user.plan !== "pro") return null;
  return user;
}

export const POST = withMetrics("/api/device/ai-summary", async (request: NextRequest) => {
  const fwVersion = request.headers.get("x-firmware-version");
  if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/ai-summary", status: "attempt" });

  const user = await resolveProUser(request);
  if (!user) {
    if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/ai-summary", status: "auth_failed" });
    return Response.json(
      { error: "Unauthorized or Pro subscription required" },
      { status: 401 },
    );
  }

  const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  const usage = await getPortfolioReviewUsage(user.id);
  const limit = PLATFORM_LIMITS.PORTFOLIO_REVIEW_MONTHLY_LIMIT;
  if (!isDev && usage.count >= limit) {
    trackEvent(user.id, "device_ai_summary_limit_reached", {
      used: String(usage.count),
      limit: String(limit),
    });
    return Response.json(
      { error: "Monthly AI summary limit reached", used: usage.count, limit },
      { status: 429 },
    );
  }

  const globalCap = await checkGlobalAiCap();
  if (!globalCap.allowed) {
    return Response.json(
      { error: "Platform AI limit reached. Try again next month." },
      { status: 429 },
    );
  }

  const apiKey = await getGlobalOpenAIApiKey();
  if (!apiKey) {
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

  const endTimer = aiRequestDuration.startTimer({ analysis_type: "device_ai_summary" });

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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

    if (!openaiRes.ok) {
      aiCallsTotal.inc({ status: "error", analysis_type: "device_ai_summary" });
      console.error("OpenAI error:", openaiRes.status, await openaiRes.text());
      return Response.json(
        { error: "AI service error" },
        { status: 502 },
      );
    }

    aiCallsTotal.inc({ status: "success", analysis_type: "device_ai_summary" });
    await Promise.all([
      incrementPortfolioReviewUsage(user.id),
      incrementGlobalAiCalls(),
    ]);
    trackEvent(user.id, "device_ai_summary_completed", {
      holdingsCount: String(holdings.length),
    });

    const result = await openaiRes.json();
    const summary = result.choices?.[0]?.message?.content ?? "Unable to generate summary.";
    const updatedUsage = await getPortfolioReviewUsage(user.id);

    return Response.json(
      { summary, used: updatedUsage.count, limit },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (err) {
    console.error("Device AI summary error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
});
