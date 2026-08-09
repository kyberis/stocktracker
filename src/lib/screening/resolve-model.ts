/**
 * Resolve the AI Gateway model id for a screening LLM agent from admin
 * `ai_model_config` (IdP / platform_settings).
 */

import { toGatewayModelId } from "@/lib/ai/gateway";
import type { AiFlowKey } from "@/lib/ai-models";
import { getAiModelForFlow } from "@/lib/db/settings";

export type ScreeningLlmFlow = Extract<
  AiFlowKey,
  | "screening_intake"
  | "screening_hard_data"
  | "screening_ir_business"
  | "screening_web_sentiment"
  | "screening_portfolio_context"
  | "screening_risk"
  | "screening_compiler"
  | "screening_compiler_evaluate"
  | "screening_qa"
>;

/** Bare model id from admin config (e.g. `gpt-4.1`). */
export async function resolveScreeningModel(
  flow: ScreeningLlmFlow,
): Promise<string> {
  return getAiModelForFlow(flow);
}

/** Gateway id (`openai/gpt-4.1`) for chat-completions calls. */
export async function resolveScreeningGatewayModel(
  flow: ScreeningLlmFlow,
): Promise<string> {
  const bare = await resolveScreeningModel(flow);
  return toGatewayModelId(bare);
}
