export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireFeatureQuota, requireSession } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import {
  getGlobalOpenAIApiKey,
  incrementAiTokenUsage,
  incrementDailyAiTokenUsage,
  getCachedPortfolioScore,
  getPortfolioScoreHistory,
  savePortfolioScore,
  trackEvent,
  insertAiLog,
  isFeatureEnabledForUser,
  getAiModelForFlow,
} from "@/lib/db";
import { checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { aiCallsTotal, aiRequestDuration } from "@/lib/metrics";
import { languageCodeToName } from "@/lib/languages";
import { withMetrics } from "@/lib/with-metrics";
import {
  buildScorePrompt,
  PORTFOLIO_SCORE_JSON_SCHEMA,
  type PortfolioScoreResponse,
  type StoredScore,
} from "@/lib/portfolio-score";
import { json401 } from "@/lib/log-unauthorized";

export const GET = withMetrics("/api/portfolio/score", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error;

  if (!await isFeatureEnabledForUser("ai_report_enabled", session.userId)) {
    return Response.json({ error: "AI report is currently disabled" }, { status: 404 });
  }

  const portfolioId = request.nextUrl.searchParams.get("portfolioId") || "";
  const history = request.nextUrl.searchParams.get("history") === "true";

  if (history) {
    const rows = await getPortfolioScoreHistory(session.userId, portfolioId, 20);
    const scores: StoredScore[] = rows.map((r) => {
      try {
        return { id: r.id, score: JSON.parse(r.scoreJson), createdAt: r.createdAt };
      } catch {
        return null;
      }
    }).filter(Boolean) as StoredScore[];
    return Response.json({ scores });
  }

  const cached = await getCachedPortfolioScore(session.userId, portfolioId);
  if (!cached) {
    return Response.json({ score: null }, { status: 200 });
  }

  try {
    const score: PortfolioScoreResponse = JSON.parse(cached.scoreJson);
    return Response.json({
      score,
      scoreId: cached.id,
      cachedAt: cached.createdAt,
    });
  } catch {
    return Response.json({ score: null }, { status: 200 });
  }
});

export const POST = withMetrics("/api/portfolio/score", async (request: NextRequest) => {
  const { session, error } = await requireFeatureQuota(request, "portfolio_score");
  if (error) return error;
  if (!session) return json401(request, { source: "api/portfolio/score", reason: "no_session" });

  if (!await isFeatureEnabledForUser("ai_report_enabled", session.userId)) {
    await refundFeatureQuota(session.userId, "portfolio_score");
    return Response.json({ error: "AI report is currently disabled" }, { status: 404 });
  }

  const globalCap = await checkGlobalAiCap(session.role);
  if (!globalCap.allowed) {
    await refundFeatureQuota(session.userId, "portfolio_score");
    return Response.json(
      { error: "Platform AI usage limit reached for this month. Please try again next month." },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const apiKey = getGlobalOpenAIApiKey();
  if (!apiKey) {
    await refundFeatureQuota(session.userId, "portfolio_score");
    return Response.json(
      { error: "OpenAI API key not configured. Ask your admin to set it in the Admin panel." },
      { status: 501 },
    );
  }

  let body: { language?: string; portfolioId?: string; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    await refundFeatureQuota(session.userId, "portfolio_score");
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.payload || typeof body.payload !== "object") {
    await refundFeatureQuota(session.userId, "portfolio_score");
    return Response.json({ error: "Missing portfolio payload" }, { status: 400 });
  }

  const portfolioId = body.portfolioId || "";
  const lang = languageCodeToName(body.language || "en");
  const { system, user } = buildScorePrompt(body.payload as never, lang);

  trackEvent(session.userId, "portfolio_score_requested", { portfolioId });

  const endTimer = aiRequestDuration.startTimer({ analysis_type: "portfolio_score" });
  const aiLogStart = Date.now();

  try {
    const model = await getAiModelForFlow("portfolio_score");
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 3000,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: PORTFOLIO_SCORE_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    endTimer();
    const durationMs = Date.now() - aiLogStart;

    if (!openaiRes.ok) {
      aiCallsTotal.inc({ status: "error", analysis_type: "portfolio_score" });
      const errText = await openaiRes.text();
      console.error("OpenAI portfolio score error:", openaiRes.status, errText);
      insertAiLog({ userId: session.userId, source: "portfolio_score", model, promptSystem: system, promptUser: user, durationMs, status: "error", errorMessage: errText.slice(0, 2000) }).catch(() => {});
      await refundFeatureQuota(session.userId, "portfolio_score");
      return Response.json(
        { error: "AI service returned an error. Check your API key and quota." },
        { status: 502 },
      );
    }

    aiCallsTotal.inc({ status: "success", analysis_type: "portfolio_score" });

    const result = await openaiRes.json();
    const totalTokens: number = result.usage?.total_tokens ?? 2500;
    const scoreInputTokens: number = result.usage?.prompt_tokens ?? 0;
    const scoreOutputTokens: number = result.usage?.completion_tokens ?? 0;
    const content: string = result.choices?.[0]?.message?.content ?? "{}";

    let score: PortfolioScoreResponse;
    try {
      score = JSON.parse(content);
    } catch {
      console.error("Failed to parse portfolio score response:", content.slice(0, 200));
      insertAiLog({ userId: session.userId, source: "portfolio_score", model, promptSystem: system, promptUser: user, response: content, tokensUsed: totalTokens, tokensInput: scoreInputTokens, tokensOutput: scoreOutputTokens, durationMs, status: "error", errorMessage: "JSON parse failed" }).catch(() => {});
      await refundFeatureQuota(session.userId, "portfolio_score");
      return Response.json({ error: "AI returned invalid response" }, { status: 502 });
    }

    insertAiLog({ userId: session.userId, source: "portfolio_score", model, promptSystem: system, promptUser: user, response: content, tokensUsed: totalTokens, tokensInput: scoreInputTokens, tokensOutput: scoreOutputTokens, durationMs }).catch(() => {});

    const [scoreId] = await Promise.all([
      savePortfolioScore(session.userId, portfolioId, JSON.stringify(score)),
      incrementGlobalAiCalls(),
      incrementAiTokenUsage(session.userId, totalTokens),
      incrementDailyAiTokenUsage(session.userId, totalTokens),
      incrementGlobalAiTokens(totalTokens),
    ]);

    trackEvent(session.userId, "portfolio_score_completed", {
      overallScore: String(score.overallScore),
      portfolioId,
    });

    return Response.json({ score, scoreId, cachedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Portfolio score error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(session.userId, "portfolio_score");
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
});
