export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest } from "next/server";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import {
  findUserById,
  incrementAiUsage,
  incrementDailyAiUsage,
  incrementAiTokenUsage,
  incrementDailyAiTokenUsage,
  insertAiLog,
  resolveAiModelForUserPlan,
} from "@/lib/db";
import { aiCallsTotal, aiRequestDuration, rateLimitHitsTotal } from "@/lib/metrics";
import { checkAiRateLimit, checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { matrixCellExplainRequestSchema } from "@/lib/schemas";
import { json401 } from "@/lib/log-unauthorized";
import { explainMatrixCellBreakdown, MATRIX_CELL_EXPLAIN_DISCLAIMER } from "@/lib/matrix-cell-explain";
import { buildDeterministicMatrixCellNarrative } from "@/lib/matrix-cell-breakdown";
import type { MatrixCellBreakdown } from "@/lib/matrix-cell-breakdown";
import type { SubscriptionPlan } from "@/lib/types";

export const POST = withMetrics("/api/portfolio/matrix-cell-explain", async (request: NextRequest) => {
  const { session, error } = await requireFeatureQuota(request, "ai_consult");
  if (error) return error;
  if (!session) return json401(request, { source: "api/portfolio/matrix-cell-explain", reason: "no_session" });

  const user = await findUserById(session.userId);
  const plan = (user?.plan || session?.plan || "free") as SubscriptionPlan;
  if (plan === "pro") {
    const rl = await checkAiRateLimit(session.userId, plan, session.role);
    if (!rl.allowed) {
      rateLimitHitsTotal.inc({ provider: "openai" });
      return Response.json(
        {
          error: "Daily AI limit reached",
          reason: "rate_limited",
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

  const parsed = await parseBody(request, matrixCellExplainRequestSchema);
  if (!parsed.success) {
    await refundFeatureQuota(session.userId, "ai_consult");
    return parsed.error;
  }

  const breakdown = parsed.data.breakdown as MatrixCellBreakdown;
  const language = parsed.data.language || "en";
  const fallback = buildDeterministicMatrixCellNarrative(breakdown);
  const model = await resolveAiModelForUserPlan("chart_chat", plan);
  const endTimer = aiRequestDuration.startTimer({ analysis_type: "matrix_cell_explain" });
  const started = Date.now();

  try {
    const result = await explainMatrixCellBreakdown({
      breakdown,
      language,
      headers: request.headers,
    });
    endTimer();
    const durationMs = Date.now() - started;

    if (result.usedLlm) {
      aiCallsTotal.inc({ status: "success", analysis_type: "matrix_cell_explain" });
      insertAiLog({
        userId: session.userId,
        source: "matrix_cell_explain",
        model,
        promptSystem: "matrix-cell-explain",
        promptUser: `${breakdown.assetKey}/${breakdown.period}`,
        durationMs,
      }).catch(() => {});
      await Promise.all([
        incrementAiUsage(session.userId),
        incrementDailyAiUsage(session.userId),
        incrementGlobalAiCalls(),
        incrementAiTokenUsage(session.userId, 500),
        incrementDailyAiTokenUsage(session.userId, 500),
        incrementGlobalAiTokens(500),
      ]);
    } else {
      await refundFeatureQuota(session.userId, "ai_consult");
    }

    return Response.json({
      narrative: result.narrative,
      disclaimer: result.disclaimer || MATRIX_CELL_EXPLAIN_DISCLAIMER,
      usedLlm: result.usedLlm,
      breakdown,
    });
  } catch (err) {
    endTimer();
    console.error("matrix-cell-explain error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(session.userId, "ai_consult");
    return Response.json({
      narrative: fallback,
      disclaimer: MATRIX_CELL_EXPLAIN_DISCLAIMER,
      usedLlm: false,
      breakdown,
    });
  }
});
