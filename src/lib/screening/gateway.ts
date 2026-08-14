import {
  fetchGatewayChatCompletions,
  type GatewayChatCompletionsBody,
} from "@/lib/ai/gateway";
import { noteScreeningProviderQuota } from "@/lib/screening/provider-circuit";

/**
 * Screening-scoped AI Gateway call. Trips the provider circuit on 429 / quota
 * errors so new screens pause without affecting other product LLM surfaces.
 */
export async function fetchScreeningGatewayChatCompletions(
  body: GatewayChatCompletionsBody,
  options?: { headers?: Headers },
): Promise<Response> {
  const res = await fetchGatewayChatCompletions(body, options);
  if (res.status === 429 || res.status === 402) {
    noteScreeningProviderQuota({
      provider: "openai",
      statusCode: res.status,
      detail: `gateway_${res.status}`,
    });
  }
  return res;
}
