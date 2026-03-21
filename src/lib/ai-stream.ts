/**
 * Shared streaming helper for OpenAI SSE responses.
 * Extracts content deltas, captures token usage from the final chunk,
 * and appends a metadata line so the client can display per-response cost.
 */

import { updateAiLogResponse } from "@/lib/db/ai-logs";

const DEFAULT_TOKEN_ESTIMATE = 3_000;

export interface AiStreamOptions {
  /** Called after the stream ends with the total tokens consumed. */
  onComplete: (totalTokens: number) => void | Promise<void>;
  /** Called with each content chunk as it arrives (for accumulating full response). */
  onContent?: (text: string) => void;
  /** Fallback estimate when OpenAI doesn't return usage data. */
  fallbackTokenEstimate?: number;
  /** AI log row ID — when set, the log is updated with the full response and token count on completion. */
  aiLogId?: string;
  /** Model name used for the request (needed for cost calculation in the log update). */
  aiLogModel?: string;
}

/**
 * Wraps an OpenAI streaming response into a ReadableStream that:
 * 1. Forwards content deltas to the client as plain text
 * 2. Extracts `usage.total_tokens` from the final SSE chunk
 * 3. Appends a `\n[TOKENS:<n>]` metadata line after the content
 * 4. Fires the onComplete callback with the actual (or estimated) token count
 *
 * The caller must pass `stream_options: { include_usage: true }` in the
 * OpenAI request body for token data to appear in the stream.
 */
export function createAiStream(
  openaiBody: ReadableStream<Uint8Array> | null,
  options: AiStreamOptions,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const fallback = options.fallbackTokenEstimate ?? DEFAULT_TOKEN_ESTIMATE;

  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let buffer = "";
  let fullResponse = "";

  return new ReadableStream({
    async start(controller) {
      const reader = openaiBody?.getReader();
      if (!reader) {
        controller.close();
        Promise.resolve(options.onComplete(fallback)).catch(() => {});
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.usage?.total_tokens) {
                totalTokens = parsed.usage.total_tokens;
                promptTokens = parsed.usage.prompt_tokens ?? 0;
                completionTokens = parsed.usage.completion_tokens ?? 0;
              }

              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
                fullResponse += content;
                options.onContent?.(content);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        const tokensUsed = totalTokens || fallback;
        controller.enqueue(encoder.encode(`\n[TOKENS:${tokensUsed}]`));
      } finally {
        controller.close();
        const tokensUsed = totalTokens || fallback;
        try {
          await options.onComplete(tokensUsed);
        } catch {
          // fire-and-forget
        }
        if (options.aiLogId) {
          updateAiLogResponse(
            options.aiLogId,
            fullResponse,
            tokensUsed,
            promptTokens,
            completionTokens,
            options.aiLogModel || "gpt-4o-mini",
          ).catch(() => {});
        }
      }
    },
  });
}
