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
 *
 * The resolution itself lives in `@kyberis/agent-os/runtime`, shared with Clara
 * and Will. This file supplies the two things that are Warren's alone: the
 * legacy env name and the admin-stored key.
 */

import {
  fetchGatewayChatCompletions as sharedFetchGatewayChatCompletions,
  hasGatewayKeyInEnv,
  resolveGatewayApiKey as sharedResolveGatewayApiKey,
  toGatewayModelId,
  VERCEL_AI_GATEWAY_BASE,
  VERCEL_OIDC_REQUEST_HEADER,
  type GatewayChatCompletionsBody,
} from "@kyberis/agent-os/runtime";

import { getPlatformSetting } from "@/lib/db/settings";
import { trackExternalProvider } from "@/lib/traffic/provider-track";

export {
  toGatewayModelId,
  VERCEL_AI_GATEWAY_BASE,
  VERCEL_OIDC_REQUEST_HEADER,
  type GatewayChatCompletionsBody,
};

const PLATFORM_LLM_KEY = "openai_api_key";

/**
 * Warren's chain, which is the shared default plus one legacy name. The
 * ordering is data rather than code so Will and Clara can keep their own tail
 * without any of us re-deriving the priority rules.
 */
const WARREN_GATEWAY_ENV_KEYS = [
  "AI_GATEWAY_API_KEY",
  "VERCEL_OIDC_TOKEN",
  "STOCKTRACKER_OPENAI_API_KEY",
] as const;

/**
 * @param incomingHeaders Optional request headers from a Vercel Function (pass `request.headers` in API routes).
 */
export async function resolveGatewayApiKey(incomingHeaders?: Headers): Promise<string | null> {
  return sharedResolveGatewayApiKey({
    envKeys: WARREN_GATEWAY_ENV_KEYS,
    headers: incomingHeaders,
    fallback: async () => (await getPlatformSetting(PLATFORM_LLM_KEY)) || null,
  });
}

/** Fast sync check for env vars only (excludes admin-stored platform key and OIDC headers). */
export function hasAiGatewayKeyInEnv(): boolean {
  return hasGatewayKeyInEnv({ envKeys: WARREN_GATEWAY_ENV_KEYS });
}

export async function fetchGatewayChatCompletions(
  body: GatewayChatCompletionsBody,
  options?: { headers?: Headers },
): Promise<Response> {
  trackExternalProvider("ai_gateway");
  return sharedFetchGatewayChatCompletions(body, {
    envKeys: WARREN_GATEWAY_ENV_KEYS,
    headers: options?.headers,
    fallback: async () => (await getPlatformSetting(PLATFORM_LLM_KEY)) || null,
  });
}
