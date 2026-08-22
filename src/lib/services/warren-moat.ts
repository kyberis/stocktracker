import { requireFeatureQuotaByUserId } from "@/lib/auth/guards";
import { fetchGatewayChatCompletions } from "@/lib/ai/gateway";
import {
  findUserById,
  getMoatCache,
  incrementAiUsage,
  incrementAiTokenUsage,
  incrementDailyAiUsage,
  incrementDailyAiTokenUsage,
  insertAiLog,
  listMoatReports,
  normalizeMoatReportTags,
  queryMoatCache,
  resolveAiModelForUserPlan,
  saveMoatReport,
  upsertMoatCache,
} from "@/lib/db";
import type { MoatScreenerFilters } from "@/lib/db/moat-cache";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { evaluateMoat } from "@/lib/moat-evaluator";
import {
  resolveFundamentalsProvider,
  resolvePremiumStockDataProvider,
} from "@/lib/market-data/resolve-provider";
import { persistShareFundamentalsFromMoatFetch } from "@/lib/services/share-fundamentals";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import { languageCodeToName } from "@/lib/languages";
import {
  checkAiRateLimit,
  checkFmpRateLimit,
  checkGlobalAiCap,
  incrementGlobalAiCalls,
  incrementGlobalAiTokens,
} from "@/lib/rate-limit";
import { effectivePlan } from "@/lib/subscription";
import { deferTask } from "@/lib/task-runner";
import type { MoatEvaluation, SubscriptionPlan } from "@/lib/types";

export type WarrenMoatErrorCode =
  | "quota_exceeded"
  | "rate_limited"
  | "not_found"
  | "not_configured"
  | "invalid_input"
  | "user_not_found"
  | "platform_cap";

export type WarrenMoatResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: WarrenMoatErrorCode };

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/** Shape returned by Warren in-app `getMoatEvaluation` tool. */
export function mapWarrenMoatEvaluationForTool(data: Record<string, unknown>) {
  const totalScore = Number(data.totalScore ?? 0);
  const maxScore = Number(data.maxScore ?? 100);
  const scorePct = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;
  const valuation =
    data.valuation && typeof data.valuation === "object"
      ? (data.valuation as { peRatio?: number | null })
      : null;

  return {
    found: true as const,
    symbol: String(data.symbol ?? ""),
    companyName: String(data.companyName ?? ""),
    sector: data.sector ? String(data.sector) : undefined,
    scorePct,
    verdict: String(data.verdict ?? ""),
    passedCount: Number(data.passedCount ?? 0),
    criteriaCount: Number(data.criteriaCount ?? 8),
    peRatio: valuation?.peRatio ?? null,
    updatedAt: String(data._cachedAt ?? data._evaluatedAt ?? ""),
    cached: Boolean(data._cached),
    tip: "Call renderMoatSummaryCard to show a visual card, then explain 1-2 key criteria in prose.",
  };
}

export async function getWarrenMoatEvaluation(
  userId: string,
  symbolInput: string,
  opts?: { fresh?: boolean },
): Promise<WarrenMoatResult<Record<string, unknown>>> {
  const symbol = normalizeSymbol(symbolInput);
  if (!symbol) {
    return { ok: false, error: "symbol is required", code: "invalid_input" };
  }

  const user = await findUserById(userId);
  if (!user) return { ok: false, error: "User not found", code: "user_not_found" };

  if (!opts?.fresh) {
    const cached = await getMoatCache(symbol).catch(() => null);
    if (cached) {
      const evaluation = JSON.parse(cached.evaluationJson) as Record<string, unknown>;
      evaluation._cached = true;
      evaluation._cachedAt = cached.updatedAt;
      evaluation._evaluatedAt = cached.updatedAt;
      return { ok: true, data: evaluation };
    }
  }

  const quota = await requireFeatureQuotaByUserId(userId, "stock_evaluation");
  if (!quota.allowed) {
    return {
      ok: false,
      error: "Monthly stock evaluation quota exceeded. Upgrade or try again next period.",
      code: "quota_exceeded",
    };
  }

  const premium = await resolvePremiumStockDataProvider(userId, "fundamentals");
  const fundamentals = await resolveFundamentalsProvider(userId);
  const provider = premium?.provider ?? fundamentals.provider;
  const backend = premium?.backend ?? fundamentals.backend;

  if (!provider.getOverview) {
    await refundFeatureQuota(userId, "stock_evaluation");
    return {
      ok: false,
      error: "Market data API not configured.",
      code: "not_configured",
    };
  }

  if (backend === "fmp" && user.role !== "admin") {
    const rl = await checkFmpRateLimit(userId);
    if (!rl.allowed) {
      await refundFeatureQuota(userId, "stock_evaluation");
      return { ok: false, error: "FMP rate limit exceeded. Try again shortly.", code: "rate_limited" };
    }
  }

  try {
    const [overview, income, balance, cashflow, earnings] = await Promise.all([
      provider.getOverview?.(symbol) ?? Promise.resolve(null),
      provider.getIncomeStatement?.(symbol) ?? Promise.resolve(null),
      provider.getBalanceSheet?.(symbol) ?? Promise.resolve(null),
      provider.getCashFlow?.(symbol) ?? Promise.resolve(null),
      provider.getEarnings?.(symbol) ?? Promise.resolve(null),
    ]);

    if (!overview) {
      await refundFeatureQuota(userId, "stock_evaluation");
      return {
        ok: false,
        error: `No fundamental data for ${symbol}. Try a liquid ticker (e.g. AAPL, KO, MSFT).`,
        code: "not_found",
      };
    }
    if (!income || !balance || !cashflow || !earnings) {
      await refundFeatureQuota(userId, "stock_evaluation");
      return {
        ok: false,
        error: `Insufficient fundamental data for ${symbol}.`,
        code: "not_found",
      };
    }

    const evaluation = evaluateMoat({ overview, income, balance, cashflow, earnings });
    const enriched = {
      ...evaluation,
      _evaluatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
    } satisfies MoatEvaluation & { _evaluatedAt: string };

    upsertMoatCache(evaluation).catch((err) => {
      console.error("[warren-moat] Cache write failed:", err instanceof Error ? err.message : err);
    });

    persistShareFundamentalsFromMoatFetch(symbol, {
      overview,
      income,
      balance,
      cashflow,
      earnings,
      provider: backend === "fmp" ? "fmp" : "yahoo",
    }).catch((err) => {
      console.error(
        "[warren-moat] Fundamentals cache write failed:",
        err instanceof Error ? err.message : err,
      );
    });

    if (provider.callCount && backend === "fmp") {
      deferTask(() => recordMarketDataUsageAsync(userId, "fmp", provider.callCount!));
    }

    return { ok: true, data: enriched as unknown as Record<string, unknown> };
  } catch (err) {
    console.error("[warren-moat] Evaluation error:", err instanceof Error ? err.message : err);
    await refundFeatureQuota(userId, "stock_evaluation");
    return { ok: false, error: "Failed to fetch evaluation data", code: "not_configured" };
  }
}

export async function generateWarrenMoatNarrative(
  userId: string,
  evaluation: Record<string, unknown>,
  language = "en",
): Promise<WarrenMoatResult<{ narrative: string; model: string }>> {
  const user = await findUserById(userId);
  if (!user) return { ok: false, error: "User not found", code: "user_not_found" };

  const quota = await requireFeatureQuotaByUserId(userId, "ai_consult");
  if (!quota.allowed) {
    return {
      ok: false,
      error: "Monthly AI consult quota exceeded.",
      code: "quota_exceeded",
    };
  }

  const plan = effectivePlan(user.plan, user.plan_expires_at) as SubscriptionPlan;
  const aiRl = await checkAiRateLimit(userId, plan, user.role);
  if (!aiRl.allowed) {
    await refundFeatureQuota(userId, "ai_consult");
    return { ok: false, error: "Daily AI analysis limit reached.", code: "rate_limited" };
  }

  const globalCap = await checkGlobalAiCap(user.role);
  if (!globalCap.allowed) {
    await refundFeatureQuota(userId, "ai_consult");
    return { ok: false, error: "Platform AI usage limit reached.", code: "platform_cap" };
  }

  const gatewayRes = await fetchGatewayChatCompletions({
    model: await resolveAiModelForUserPlan("ai_analysis", plan),
    stream: false,
    max_tokens: 1500,
    temperature: 0.3,
    messages: buildMoatNarrativeMessages(evaluation, language),
  });

  if (!gatewayRes.ok) {
    await refundFeatureQuota(userId, "ai_consult");
    return { ok: false, error: "AI service returned an error.", code: "not_configured" };
  }

  const payload = (await gatewayRes.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { total_tokens?: number };
    model?: string;
  };
  const narrative = payload.choices?.[0]?.message?.content?.trim();
  if (!narrative) {
    await refundFeatureQuota(userId, "ai_consult");
    return { ok: false, error: "Empty AI response.", code: "not_configured" };
  }

  const model = payload.model || "unknown";
  const tokens = payload.usage?.total_tokens ?? 1800;

  await Promise.all([
    incrementAiUsage(userId),
    incrementDailyAiUsage(userId),
    incrementGlobalAiCalls(),
    incrementAiTokenUsage(userId, tokens),
    incrementDailyAiTokenUsage(userId, tokens),
    incrementGlobalAiTokens(tokens),
    insertAiLog({
      userId,
      source: "moat_evaluation_mcp",
      model,
      promptSystem: String(buildMoatNarrativeMessages(evaluation, language)[0]?.content ?? ""),
      promptUser: String(buildMoatNarrativeMessages(evaluation, language)[1]?.content ?? ""),
      durationMs: 0,
    }).catch(() => ""),
  ]);

  return { ok: true, data: { narrative, model } };
}

function buildMoatNarrativeMessages(
  evaluation: Record<string, unknown>,
  language: string,
): { role: "system" | "user"; content: string }[] {
  const lang = languageCodeToName(language);
  const companyName = String(evaluation.companyName || evaluation.symbol || "Unknown");
  const symbol = String(evaluation.symbol || "");

  const systemPrompt = `You are a seasoned value investing analyst who evaluates companies using the Warren Buffett framework for identifying sustainable competitive advantages ("economic moats").

You have been given both the raw financial data AND a computed quantitative evaluation for ${companyName} (${symbol}). Your job is to write a clear, insightful narrative assessment.

Rules:
- Write in ${lang}.
- ONLY use facts and numbers explicitly present in the data provided. Do NOT invent figures or comparisons.
- Structure your response using markdown ## headings.
- Start with "## Investment Thesis: ${companyName} (${symbol})" — a 2-3 sentence summary of the overall moat assessment referencing the composite score.
- Include "## Key Strengths" and "## Areas of Caution" and "## Product Durability Assessment" and "## Verdict".
- Keep the total response under 800 words.
- Include a disclaimer that this is not financial advice at the very end.`;

  const userPrompt = `Here is the complete Buffett-framework evaluation for ${companyName} (${symbol}).

## Quantitative Evaluation Results
${JSON.stringify(evaluation, null, 2)}

Please provide your narrative assessment based on this data.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

export async function listWarrenMoatReports(
  userId: string,
  tags?: string[],
): Promise<WarrenMoatResult<unknown[]>> {
  const normalized = tags?.length ? normalizeMoatReportTags(tags) : [];
  const reports = await listMoatReports(userId, 100, normalized);
  return { ok: true, data: reports };
}

export async function screenWarrenMoat(
  userId: string,
  filters: MoatScreenerFilters,
): Promise<WarrenMoatResult<unknown>> {
  const user = await findUserById(userId);
  if (!user) return { ok: false, error: "User not found", code: "user_not_found" };
  const result = await queryMoatCache(filters);
  return { ok: true, data: result };
}

export async function saveWarrenMoatReport(
  userId: string,
  input: {
    symbol: string;
    companyName?: string;
    evaluation: Record<string, unknown>;
    tags?: string[];
  },
): Promise<WarrenMoatResult<{ id: string }>> {
  const symbol = normalizeSymbol(input.symbol);
  if (!symbol) {
    return { ok: false, error: "symbol is required", code: "invalid_input" };
  }

  const evaluationJson = JSON.stringify(input.evaluation);
  const totalScore = Number(input.evaluation.totalScore ?? 0);
  const maxScore = Number(input.evaluation.maxScore ?? 100);
  const verdict = String(input.evaluation.verdict ?? "");

  const id = await saveMoatReport(
    userId,
    symbol,
    input.companyName || String(input.evaluation.companyName ?? symbol),
    evaluationJson,
    totalScore,
    maxScore,
    verdict,
    input.tags ?? [],
  );

  return { ok: true, data: { id } };
}
