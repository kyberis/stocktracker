/**
 * Shared AI model configuration — allowed models, flow metadata, and defaults.
 * Used by admin API, admin UI, and every AI route at runtime.
 */

import type { SubscriptionPlan } from "@/lib/types";

export const ALLOWED_AI_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-nano",
  "gpt-4.1-mini",
  "gpt-4.1",
  "o4-mini",
] as const;

export type AllowedAiModel = (typeof ALLOWED_AI_MODELS)[number];

export const AI_FLOW_KEYS = [
  "ai_analysis",
  "portfolio_chat",
  "chart_chat",
  "portfolio_review",
  "portfolio_score",
  "import_portfolio",
  "device_summary",
  "support_chat",
  "weekly_digest",
  "weekly_digest_admin",
  "digest_email",
  "digest_x_post",
  "news_article_summary",
  "holding_classification",
] as const;

export type AiFlowKey = (typeof AI_FLOW_KEYS)[number];

export interface AiFlowMeta {
  label: string;
  description: string;
  maxTokens: number;
  temperature: number;
  responseFormat?: "json_schema" | "json_object";
}

export const AI_FLOW_META: Record<AiFlowKey, AiFlowMeta> = {
  ai_analysis: {
    label: "AI Analysis",
    description: "Stock fundamentals, intelligence, crypto, tax, and rebalancing analysis",
    maxTokens: 1200,
    temperature: 0.3,
  },
  portfolio_chat: {
    label: "Portfolio Chat",
    description: "Interactive portfolio AI assistant",
    maxTokens: 1000,
    temperature: 0.3,
  },
  chart_chat: {
    label: "Chart Chat",
    description: "Chart context Q&A",
    maxTokens: 900,
    temperature: 0.25,
  },
  portfolio_review: {
    label: "Portfolio Review",
    description: "Long-form portfolio review for beginners",
    maxTokens: 1500,
    temperature: 0.3,
  },
  portfolio_score: {
    label: "Portfolio Score",
    description: "Structured portfolio score with JSON schema output",
    maxTokens: 3000,
    temperature: 0.2,
    responseFormat: "json_schema",
  },
  import_portfolio: {
    label: "Import Parsing",
    description: "CSV and screenshot portfolio import extraction",
    maxTokens: 8000,
    temperature: 0,
  },
  device_summary: {
    label: "Device Summary",
    description: "Short 3-bullet summary for desk display",
    maxTokens: 300,
    temperature: 0.3,
  },
  support_chat: {
    label: "Support Chat",
    description: "In-app support assistant",
    maxTokens: 800,
    temperature: 0.4,
  },
  weekly_digest: {
    label: "Weekly Digest",
    description: "Weekly portfolio digest paragraph (cron)",
    maxTokens: 300,
    temperature: 0.4,
  },
  weekly_digest_admin: {
    label: "Weekly Digest (Admin)",
    description: "Weekly digest triggered from admin panel",
    maxTokens: 300,
    temperature: 0.4,
  },
  digest_email: {
    label: "Market Digest Email",
    description: "Newsletter rewrite and translation pipeline",
    maxTokens: 3000,
    temperature: 0.4,
    responseFormat: "json_object",
  },
  digest_x_post: {
    label: "Digest X Post",
    description: "Generate a tweet-sized X.com post from a published market digest",
    maxTokens: 150,
    temperature: 0.5,
  },
  news_article_summary: {
    label: "Portfolio news article summary",
    description: "Short neutral summary of a news headline and snippet for Pro users",
    maxTokens: 450,
    temperature: 0.25,
  },
  holding_classification: {
    label: "Holding classification",
    description: "Suggest sector, region, and asset class for a single holding (JSON)",
    maxTokens: 200,
    temperature: 0.1,
  },
};

export const DEFAULT_AI_MODEL: AllowedAiModel = "gpt-4o-mini";

/** Flows where a weak model hurts trust or corrupts user data — always use platform config (IdP / admin). */
export const AI_FLOWS_ALWAYS_PREMIUM_MODEL = new Set<AiFlowKey>(["portfolio_score", "import_portfolio"]);

/** Folio-tier conversational model (cheap); quality-critical flows ignore this. */
export const FREE_TIER_CONVERSATIONAL_MODEL: AllowedAiModel = "gpt-4.1-nano";

export function getDefaultAiModelConfig(): Record<AiFlowKey, AllowedAiModel> {
  const config = {} as Record<AiFlowKey, AllowedAiModel>;
  for (const key of AI_FLOW_KEYS) {
    config[key] = DEFAULT_AI_MODEL;
  }
  return config;
}

/**
 * Merge a partial JSON map from admin/IdP with code defaults and allowed-model validation.
 */
export function normalizeAiModelConfigRecord(
  parsed: Record<string, string | undefined>,
): Record<AiFlowKey, AllowedAiModel> {
  const defaults = getDefaultAiModelConfig();
  const config = { ...defaults };
  const allowedSet = new Set<string>(ALLOWED_AI_MODELS);
  for (const key of AI_FLOW_KEYS) {
    const v = parsed[key];
    if (v && allowedSet.has(v)) {
      config[key] = v as AllowedAiModel;
    }
  }
  return config;
}

/**
 * Resolve gateway model id for a user plan. `platformConfig` is the merged admin map (IdP + defaults).
 */
export function resolveAiModelForPlan(
  flow: AiFlowKey,
  plan: SubscriptionPlan,
  platformConfig: Record<AiFlowKey, AllowedAiModel>,
): string {
  if (AI_FLOWS_ALWAYS_PREMIUM_MODEL.has(flow)) {
    return platformConfig[flow] || DEFAULT_AI_MODEL;
  }
  if (plan === "pro") {
    return platformConfig[flow] || DEFAULT_AI_MODEL;
  }
  return FREE_TIER_CONVERSATIONAL_MODEL;
}

export const AI_MODEL_LABELS: Record<AllowedAiModel, { label: string; costTier: "low" | "medium" | "high" }> = {
  "gpt-4o-mini": { label: "GPT-4o Mini", costTier: "low" },
  "gpt-4o": { label: "GPT-4o", costTier: "high" },
  "gpt-4.1-nano": { label: "GPT-4.1 Nano", costTier: "low" },
  "gpt-4.1-mini": { label: "GPT-4.1 Mini", costTier: "medium" },
  "gpt-4.1": { label: "GPT-4.1", costTier: "high" },
  "o4-mini": { label: "o4-mini", costTier: "medium" },
};
