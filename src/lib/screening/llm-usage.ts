/**
 * Extract OpenAI-compatible usage from a chat-completions JSON body.
 */

export interface LlmUsage {
  tokensInput: number;
  tokensOutput: number;
}

export function extractLlmUsage(data: unknown): LlmUsage {
  if (!data || typeof data !== "object") {
    return { tokensInput: 0, tokensOutput: 0 };
  }
  const usage = (data as { usage?: Record<string, unknown> }).usage;
  if (!usage || typeof usage !== "object") {
    return { tokensInput: 0, tokensOutput: 0 };
  }
  const tokensInput =
    Number(usage.prompt_tokens) ||
    Number(usage.input_tokens) ||
    0;
  const tokensOutput =
    Number(usage.completion_tokens) ||
    Number(usage.output_tokens) ||
    0;
  return {
    tokensInput: Number.isFinite(tokensInput) ? Math.max(0, tokensInput) : 0,
    tokensOutput: Number.isFinite(tokensOutput) ? Math.max(0, tokensOutput) : 0,
  };
}
