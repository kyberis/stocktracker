import { streamText } from "ai";
import type { ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { resolveGatewayApiKey, toGatewayModelId, VERCEL_AI_GATEWAY_BASE } from "@/lib/ai/gateway";
import { insertAiLog, resolveAiModelForUserPlan } from "@/lib/db";
import { AI_FLOW_META } from "@/lib/ai-models";
import { aiCallsTotal, aiRequestDuration } from "@/lib/metrics";
import { buildWarrenSystemPrompt, type WarrenChannel } from "./system-prompt";
import type { SubscriptionPlan } from "@/lib/types";
import {
  buildWarrenTools,
  type PortfolioSnapshot,
  type WarrenToolContext,
} from "./tools";
import type { WarrenPart, WarrenProposal, WarrenStreamFrame } from "./types";
import type { OfficeIdentity } from "@/lib/ai/office/office-identity";
import type { RawAttachment } from "./preprocess-attachments";
import {
  buildWarrenEmptyAddStockAppendix,
  pickWarrenEmptyAddTools,
} from "./empty-add-stock";

export interface RunWarrenTurnOptions {
  userId: string;
  isDemo?: boolean;
  channel?: WarrenChannel;
  language?: string;
  baseCurrency: string;
  activePortfolioId?: string;
  activePortfolioName?: string;
  snapshot?: PortfolioSnapshot;
  /** Unified IdP identity — enables Clara / Will sister-app tools. */
  officeIdentity?: OfficeIdentity | null;
  /** Full conversation for the model (text or multimodal user messages). */
  messages: ModelMessage[];
  /** Vercel OIDC / Gateway auth: pass `request.headers` from API routes when available. */
  gatewayHeaders?: Headers;
  /** Billing tier for model selection (Folio vs Trefolio). */
  subscriptionPlan: SubscriptionPlan;
  /** Extra system instructions for this turn (e.g. moat screener prefetch). */
  systemAppendix?: string;
  /**
   * When true (empty portfolio), restrict tools + prompt to add-stock only.
   * Callers must also enforce the empty-add burst rate limit.
   */
  emptyAddStockOnly?: boolean;
  /** Office-only: emit Clara/Will coordination when sister tools run. */
  onSisterCoordination?: (line: { from: "warren"; to: "clara" | "will"; summary: string }) => void;
  /** Office-only: persist Clara/Will agent bubbles. */
  onSisterAgentMessage?: (role: "clara" | "will", content: string) => void;
  /** Called for every NDJSON-style frame: text deltas, parts, proposals, errors. */
  onFrame?: (frame: WarrenStreamFrame) => void;
  /** Raw files from this turn so import tools can parse CSV/Excel/images. */
  attachments?: RawAttachment[];
  userRole?: string;
}

function warrenAuditSource(channel: WarrenChannel): string {
  if (channel === "telegram") return "warren_telegram";
  if (channel === "clover_telegram") return "clover_telegram";
  if (channel === "clover") return "clover_chat";
  if (channel === "office") return "warren_office";
  if (channel === "clara") return "warren_clara_sister";
  return "warren_chat";
}

/** Plain-text summary of the last user turn for AI logs (no binary). */
export function serializeWarrenPromptUserLog(messages: ModelMessage[]): string {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return "";
  const c = last.content;
  if (typeof c === "string") return c.slice(0, 8000);
  const parts: string[] = [];
  for (const p of c) {
    if (p.type === "text") parts.push(p.text);
    else if (p.type === "image") parts.push("[image]");
    else if (p.type === "file") parts.push(`[file:${p.filename ?? "attachment"}]`);
  }
  return parts.join("\n").slice(0, 8000);
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
 *   2. Run `streamText` with all Warren tools (via **chat completions**, not the
 *      Responses API — see `provider.chat` below).
 *   3. Collect parts/proposals/text/usage.
 *
 * Used by both the web NDJSON streaming route and the Telegram webhook
 * handler. Callers are expected to have already enforced their own quota /
 * auth (e.g. `requireFeatureQuota` or `requireFeatureQuotaByUserId`).
 *
 * Throws when Vercel AI Gateway is not configured.
 */
export async function runWarrenTurn(opts: RunWarrenTurnOptions): Promise<RunWarrenTurnResult> {
  const apiKey = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!apiKey) {
    throw new Error(
      "AI Gateway is not configured. Set AI_GATEWAY_API_KEY or add a key in the Admin panel.",
    );
  }

  const channel = opts.channel || "web";
  const model = await resolveAiModelForUserPlan("portfolio_chat", opts.subscriptionPlan);
  const flowMeta = AI_FLOW_META.portfolio_chat;
  const provider = createOpenAI({
    baseURL: VERCEL_AI_GATEWAY_BASE,
    apiKey,
  });

  const emptyAddAppendix = opts.emptyAddStockOnly ? `\n\n${buildWarrenEmptyAddStockAppendix()}` : "";
  const systemPrompt =
    buildWarrenSystemPrompt({
      language: opts.language,
      baseCurrency: opts.baseCurrency,
      activePortfolioId: opts.activePortfolioId,
      activePortfolioName: opts.activePortfolioName,
      isDemoMode: !!opts.isDemo,
      channel,
      subscriptionPlan: opts.subscriptionPlan,
    }) +
    emptyAddAppendix +
    (opts.systemAppendix ? `\n\n${opts.systemAppendix}` : "");

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
    officeIdentity: opts.emptyAddStockOnly ? null : opts.officeIdentity,
    emitPart: (part) => {
      collectedParts.push(part);
      emit({ kind: "part", part });
    },
    emitProposal: (proposal) => {
      collectedProposals.push(proposal);
      emit({ kind: "proposal", proposal });
    },
    emitStep: (label) => emit({ kind: "tool_step", label }),
    emitClientAction: (action) => emit({ kind: "client_action", ...action }),
    attachments: opts.attachments,
    channel,
    gatewayHeaders: opts.gatewayHeaders,
    subscriptionPlan: opts.subscriptionPlan,
    userRole: opts.userRole,
    emitSisterCoordination: opts.emptyAddStockOnly ? undefined : opts.onSisterCoordination,
    emitSisterAgentMessage: opts.emptyAddStockOnly ? undefined : opts.onSisterAgentMessage,
  };

  const allTools = buildWarrenTools(ctx);
  const tools = opts.emptyAddStockOnly ? pickWarrenEmptyAddTools(allTools) : allTools;
  const endTimer = aiRequestDuration.startTimer({ analysis_type: "warren" });
  const startedAt = Date.now();
  const lastUserMsg = serializeWarrenPromptUserLog(opts.messages);

  try {
    const gatewayModelId = toGatewayModelId(model);
    const result = streamText({
      // Use Chat Completions (`/chat/completions`), not the default callable which
      // targets the Responses API (`/responses`). The gateway rejects some valid
      // chat histories when translated to Responses `input.*.output` items.
      model: provider.chat(gatewayModelId as Parameters<typeof provider.chat>[0]),
      system: systemPrompt,
      messages: opts.messages,
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
      source: warrenAuditSource(channel),
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
      source: warrenAuditSource(channel),
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
