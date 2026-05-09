import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { resolveGatewayApiKey, toGatewayModelId, VERCEL_AI_GATEWAY_BASE } from "@/lib/ai/gateway";
import { getAiModelForFlow, insertAiLog } from "@/lib/db";
import { AI_FLOW_META } from "@/lib/ai-models";
import { aiCallsTotal, aiRequestDuration } from "@/lib/metrics";
import { buildWarrenSystemPrompt, type WarrenChannel } from "./system-prompt";
import {
  buildWarrenTools,
  type PortfolioSnapshot,
  type WarrenToolContext,
} from "./tools";
import type { WarrenPart, WarrenProposal, WarrenStreamFrame } from "./types";

export interface RunWarrenTurnOptions {
  userId: string;
  isDemo?: boolean;
  channel?: WarrenChannel;
  language?: string;
  baseCurrency: string;
  activePortfolioId?: string;
  activePortfolioName?: string;
  snapshot?: PortfolioSnapshot;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Called for every NDJSON-style frame: text deltas, parts, proposals, errors. */
  onFrame?: (frame: WarrenStreamFrame) => void;
}

export interface RunWarrenTurnResult {
  text: string;
  parts: WarrenPart[];
  proposals: WarrenProposal[];
  totalTokens: number;
  durationMs: number;
}

/**
 * Run a single Warren turn end-to-end:
 *   1. Build the system prompt (channel-aware).
 *   2. Run `streamText` with all Warren tools.
 *   3. Collect parts/proposals/text/usage.
 *
 * Used by both the web NDJSON streaming route and the Telegram webhook
 * handler. Callers are expected to have already enforced their own quota /
 * auth (e.g. `requireFeatureQuota` or `requireFeatureQuotaByUserId`).
 *
 * Throws when Vercel AI Gateway is not configured.
 */
export async function runWarrenTurn(opts: RunWarrenTurnOptions): Promise<RunWarrenTurnResult> {
  const apiKey = await resolveGatewayApiKey();
  if (!apiKey) {
    throw new Error(
      "AI Gateway is not configured. Set AI_GATEWAY_API_KEY or add a key in the Admin panel.",
    );
  }

  const channel = opts.channel || "web";
  const model = await getAiModelForFlow("portfolio_chat");
  const flowMeta = AI_FLOW_META.portfolio_chat;
  const provider = createOpenAI({
    baseURL: VERCEL_AI_GATEWAY_BASE,
    apiKey,
  });

  const systemPrompt = buildWarrenSystemPrompt({
    language: opts.language,
    baseCurrency: opts.baseCurrency,
    activePortfolioId: opts.activePortfolioId,
    activePortfolioName: opts.activePortfolioName,
    isDemoMode: !!opts.isDemo,
    channel,
  });

  const collectedParts: WarrenPart[] = [];
  const collectedProposals: WarrenProposal[] = [];
  let collectedText = "";

  const emit = (frame: WarrenStreamFrame) => {
    opts.onFrame?.(frame);
  };

  const ctx: WarrenToolContext = {
    userId: opts.userId,
    isDemo: !!opts.isDemo,
    activePortfolioId: opts.activePortfolioId,
    baseCurrency: opts.baseCurrency,
    language: opts.language,
    snapshot: opts.snapshot,
    emitPart: (part) => {
      collectedParts.push(part);
      emit({ kind: "part", part });
    },
    emitProposal: (proposal) => {
      collectedProposals.push(proposal);
      emit({ kind: "proposal", proposal });
    },
    emitStep: (label) => emit({ kind: "tool_step", label }),
  };

  const tools = buildWarrenTools(ctx);
  const endTimer = aiRequestDuration.startTimer({ analysis_type: "warren" });
  const startedAt = Date.now();
  const lastUserMsg = opts.messages[opts.messages.length - 1]?.content || "";

  try {
    const result = streamText({
      model: provider(toGatewayModelId(model)),
      system: systemPrompt,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      tools,
      temperature: flowMeta.temperature,
      stopWhen: ({ steps }) => steps.length >= 6,
      maxOutputTokens: flowMeta.maxTokens,
    });

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        collectedText += chunk.text;
        emit({ kind: "text", delta: chunk.text });
      } else if (chunk.type === "error") {
        const message = chunk.error instanceof Error ? chunk.error.message : "AI stream error";
        console.error("[warren/run-turn] stream error", chunk.error);
        emit({ kind: "error", message });
      }
    }

    let totalTokens = 0;
    try {
      const usage = await result.usage;
      totalTokens = usage?.totalTokens ?? 0;
    } catch {
      // ignore usage retrieval errors
    }

    endTimer();
    aiCallsTotal.inc({ status: "success", analysis_type: "warren" });

    const durationMs = Date.now() - startedAt;
    insertAiLog({
      userId: opts.userId,
      source: channel === "telegram" ? "warren_telegram" : "warren_chat",
      model,
      promptSystem: systemPrompt,
      promptUser: lastUserMsg,
      durationMs,
      tokensUsed: totalTokens,
    }).catch(() => {});

    emit({ kind: "done" });

    return {
      text: collectedText,
      parts: collectedParts,
      proposals: collectedProposals,
      totalTokens,
      durationMs,
    };
  } catch (err) {
    endTimer();
    aiCallsTotal.inc({ status: "error", analysis_type: "warren" });
    console.error("[warren/run-turn] failed", err);
    const message = err instanceof Error ? err.message : "Failed to contact AI service";
    emit({ kind: "error", message });
    insertAiLog({
      userId: opts.userId,
      source: channel === "telegram" ? "warren_telegram" : "warren_chat",
      model,
      promptSystem: systemPrompt,
      promptUser: lastUserMsg,
      durationMs: Date.now() - startedAt,
      status: "error",
      errorMessage: message.slice(0, 2000),
    }).catch(() => {});
    throw err;
  }
}
