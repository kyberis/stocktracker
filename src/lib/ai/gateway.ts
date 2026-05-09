/**
 * Vercel AI Gateway — single integration point for LLM calls (chat completions).
 * @see https://vercel.com/docs/ai-gateway
 *
 * Auth priority: AI_GATEWAY_API_KEY → VERCEL_OIDC_TOKEN (Vercel runtime) →
 * STOCKTRACKER_OPENAI_API_KEY (legacy env name) → platform_settings.openai_api_key (admin).
 */

import { getPlatformSetting } from "@/lib/db/settings";

export const VERCEL_AI_GATEWAY_BASE = "https://ai-gateway.vercel.sh/v1";

const PLATFORM_LLM_KEY = "openai_api_key";

/** Maps admin-configured bare IDs (e.g. `gpt-4o-mini`) to Gateway `provider/model` strings. */
export function toGatewayModelId(model: string): string {
  const t = model.trim();
  if (!t) return "openai/gpt-4o-mini";
  if (t.includes("/")) return t;
  return `openai/${t}`;
}

export async function resolveGatewayApiKey(): Promise<string | null> {
  for (const k of [
    process.env.AI_GATEWAY_API_KEY,
    process.env.VERCEL_OIDC_TOKEN,
    process.env.STOCKTRACKER_OPENAI_API_KEY,
  ]) {
    const t = k?.trim();
    if (t) return t;
  }
  const platform = (await getPlatformSetting(PLATFORM_LLM_KEY)).trim();
  return platform || null;
}

/** Fast sync check for env vars only (excludes admin-stored platform key). */
export function hasAiGatewayKeyInEnv(): boolean {
  return !!(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    process.env.STOCKTRACKER_OPENAI_API_KEY?.trim()
  );
}

export async function fetchGatewayChatCompletions(body: {
  model: string;
  stream?: boolean;
  stream_options?: { include_usage?: boolean };
  max_tokens?: number;
  temperature?: number;
  messages?: unknown[];
  response_format?: unknown;
  [key: string]: unknown;
}): Promise<Response> {
  const apiKey = await resolveGatewayApiKey();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: "AI Gateway not configured" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = { ...body, model: toGatewayModelId(body.model) };

  return fetch(`${VERCEL_AI_GATEWAY_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
}
