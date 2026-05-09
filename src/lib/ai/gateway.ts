/**
 * Vercel AI Gateway — single integration point for LLM calls (chat completions).
 * @see https://vercel.com/docs/ai-gateway
 *
 * Auth priority:
 * 1. `AI_GATEWAY_API_KEY` (explicit dashboard key)
 * 2. `x-vercel-oidc-token` on the incoming request (Functions runtime — see Vercel OIDC docs)
 * 3. `VERCEL_OIDC_TOKEN` (builds / `vercel env pull` for local dev)
 * 4. `STOCKTRACKER_OPENAI_API_KEY` (legacy env name)
 * 5. `platform_settings.openai_api_key` (admin-stored bearer)
 */

import { getPlatformSetting } from "@/lib/db/settings";

export const VERCEL_AI_GATEWAY_BASE = "https://ai-gateway.vercel.sh/v1";

/** Incoming request header where Vercel injects a short-lived OIDC JWT for AI Gateway. */
export const VERCEL_OIDC_REQUEST_HEADER = "x-vercel-oidc-token";

const PLATFORM_LLM_KEY = "openai_api_key";

/** Maps admin-configured bare IDs (e.g. `gpt-4o-mini`) to Gateway `provider/model` strings. */
export function toGatewayModelId(model: string): string {
  const t = model.trim();
  if (!t) return "openai/gpt-4o-mini";
  if (t.includes("/")) return t;
  return `openai/${t}`;
}

/**
 * @param incomingHeaders Optional request headers from a Vercel Function (pass `request.headers` in API routes).
 */
export async function resolveGatewayApiKey(incomingHeaders?: Headers): Promise<string | null> {
  const explicit = process.env.AI_GATEWAY_API_KEY?.trim();
  if (explicit) return explicit;

  const fromVercelRequest = incomingHeaders?.get(VERCEL_OIDC_REQUEST_HEADER)?.trim();
  if (fromVercelRequest) return fromVercelRequest;

  const oidcEnv = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (oidcEnv) return oidcEnv;

  const legacy = process.env.STOCKTRACKER_OPENAI_API_KEY?.trim();
  if (legacy) return legacy;

  const platform = (await getPlatformSetting(PLATFORM_LLM_KEY)).trim();
  return platform || null;
}

/** Fast sync check for env vars only (excludes admin-stored platform key and OIDC headers). */
export function hasAiGatewayKeyInEnv(): boolean {
  return !!(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    process.env.STOCKTRACKER_OPENAI_API_KEY?.trim()
  );
}

export type GatewayChatCompletionsBody = {
  model: string;
  stream?: boolean;
  stream_options?: { include_usage?: boolean };
  max_tokens?: number;
  temperature?: number;
  messages?: unknown[];
  response_format?: unknown;
  [key: string]: unknown;
};

export async function fetchGatewayChatCompletions(
  body: GatewayChatCompletionsBody,
  options?: { headers?: Headers },
): Promise<Response> {
  const apiKey = await resolveGatewayApiKey(options?.headers);
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
