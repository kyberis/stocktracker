import {
  fetchGatewayChatCompletions,
  resolveGatewayApiKey,
} from "@/lib/ai/gateway";
import { insertAiLog } from "@/lib/db";
import type { SubscriptionPlan } from "@/lib/types";
import { runSanityLimits } from "./rules/sanity-limits";
import { buildIntakePrompt } from "./prompts/intake";
import {
  coerceIntakeAgentPayload,
  extractJsonPayload,
  tryRepairTruncatedJson,
} from "./parse-intake-output";
import {
  screeningBriefSchema,
  type IntakeAgentOutput,
  type IntakeAgentStatus,
  type ScreeningBrief,
  type ScreeningIntent,
} from "./schemas";
import { intakeAgentOutputSchema } from "./schemas";

export interface RunIntakeAgentOptions {
  userId: string;
  plan: SubscriptionPlan;
  intent: ScreeningIntent;
  locale: string;
  suggestedInclude: string[];
  suggestedExclude: string[];
  /** Conversation so far, oldest first. Includes the current user turn as last item. */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Best guess at the brief so far (client-side merge). May be partial. */
  currentBrief?: Partial<ScreeningBrief>;
  /** Vercel OIDC / Gateway auth pass-through from the API route. */
  gatewayHeaders?: Headers;
}

export interface RunIntakeAgentResult {
  output: IntakeAgentOutput;
  latencyMs: number;
  /** Full log of what happened for `screening_agent_outputs.output_json`. */
  logJson: string;
  aiLogId: string | null;
}

/**
 * Fallback used when the gateway is not configured (dev without keys, etc.).
 * The UI still shows a real message and the brief is echoed back untouched, so
 * QA can test the wiring without an API key.
 */
function buildFallbackOutput(opts: RunIntakeAgentOptions): IntakeAgentOutput {
  const brief = screeningBriefSchema.parse({
    intent: opts.intent,
    includeSectors: opts.currentBrief?.includeSectors ?? opts.suggestedInclude,
    excludeSectors: opts.currentBrief?.excludeSectors ?? opts.suggestedExclude,
    regions: opts.currentBrief?.regions ?? [],
    candidateCount: opts.currentBrief?.candidateCount ?? 5,
    criteria: opts.currentBrief?.criteria ?? [],
    endedEarly: opts.currentBrief?.endedEarly ?? false,
    locale: opts.locale,
  });
  return intakeAgentOutputSchema.parse({
    status: "needs_clarification" satisfies IntakeAgentStatus,
    assistantText:
      "AI Gateway is not configured yet, so I cannot parse your answer in real time. Ask your admin to set the AI_GATEWAY_API_KEY.",
    brief,
    questions: [],
    suggestions: [],
    warnings: ["gateway_not_configured"],
    inferredFields: [],
  });
}

function parseAgentJson(
  rawResponse: string,
  opts: RunIntakeAgentOptions,
): { output: IntakeAgentOutput | null; parseError: string | null } {
  const payload =
    extractJsonPayload(rawResponse) ?? tryRepairTruncatedJson(rawResponse);
  if (!payload) {
    return { output: null, parseError: "no_json" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    const repaired = tryRepairTruncatedJson(rawResponse);
    if (!repaired) return { output: null, parseError: "json_parse" };
    try {
      parsed = JSON.parse(repaired);
    } catch {
      return { output: null, parseError: "json_parse" };
    }
  }

  const coerced = coerceIntakeAgentPayload(parsed, {
    intent: opts.intent,
    locale: opts.locale,
    currentBrief: opts.currentBrief,
  });
  if (!coerced) {
    return { output: null, parseError: "coerce_failed" };
  }
  return { output: coerced, parseError: null };
}

/**
 * Run one Intake agent turn end-to-end. Returns a parsed, sanity-checked
 * `IntakeAgentOutput` plus enough metadata for the API route to persist an
 * `ai_logs` row and a `screening_agent_outputs` row.
 */
export async function runIntakeAgent(
  opts: RunIntakeAgentOptions,
): Promise<RunIntakeAgentResult> {
  const startedAt = Date.now();

  const gatewayConfigured = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!gatewayConfigured) {
    const output = buildFallbackOutput(opts);
    return {
      output,
      latencyMs: Date.now() - startedAt,
      logJson: JSON.stringify({ fallback: "gateway_not_configured", output }),
      aiLogId: null,
    };
  }

  const systemPrompt = buildIntakePrompt({
    intent: opts.intent,
    locale: opts.locale,
    suggestedInclude: opts.suggestedInclude,
    suggestedExclude: opts.suggestedExclude,
  });

  const seed = {
    currentBrief: opts.currentBrief ?? null,
    suggestedInclude: opts.suggestedInclude,
    suggestedExclude: opts.suggestedExclude,
  };

  // Single system message — some gateway providers reject multiple system roles.
  const messages = [
    {
      role: "system" as const,
      content: `${systemPrompt}\n\nContext seed (JSON):\n${JSON.stringify(seed)}`,
    },
    ...opts.messages,
  ];

  // Intake needs strict JSON — pin to gpt-4o-mini which reliably supports
  // response_format:json_object via the AI Gateway. resolveAiModelForUserPlan
  // would return gpt-4.1-nano on Folio, which returns prose or invalid JSON.
  const model = "openai/gpt-4o-mini";
  const lastUserMsg =
    [...opts.messages].reverse().find((m) => m.role === "user")?.content?.slice(0, 4000) ?? "";

  async function callGateway(withResponseFormat: boolean): Promise<{
    body: string;
    error: string | null;
  }> {
    try {
      const res = await fetchGatewayChatCompletions(
        {
          model,
          stream: false,
          max_tokens: 2000,
          temperature: 0.2,
          messages,
          ...(withResponseFormat
            ? { response_format: { type: "json_object" as const } }
            : {}),
        },
        { headers: opts.gatewayHeaders },
      );
      if (!res.ok) {
        const errBody = (await res.text().catch(() => "")).slice(0, 500);
        return { body: "", error: `gateway_${res.status}:${errBody}` };
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      };
      return { body: data.choices?.[0]?.message?.content ?? "", error: null };
    } catch (err) {
      return {
        body: "",
        error: err instanceof Error ? err.message : "gateway_error",
      };
    }
  }

  let rawResponse = "";
  let errorMessage: string | null = null;

  // First attempt with strict JSON. If the gateway rejects response_format, retry
  // once in plain-prose mode and rely on coerce to extract the JSON object.
  const first = await callGateway(true);
  rawResponse = first.body;
  errorMessage = first.error;
  if (errorMessage && errorMessage.startsWith("gateway_400")) {
    console.warn("[screening/intake] response_format rejected, retrying plain:", errorMessage);
    const retry = await callGateway(false);
    rawResponse = retry.body;
    errorMessage = retry.error;
  }

  const latencyMs = Date.now() - startedAt;

  let output: IntakeAgentOutput | null = null;
  let parseError: string | null = null;

  if (!errorMessage) {
    const parsed = parseAgentJson(rawResponse, opts);
    output = parsed.output;
    parseError = parsed.parseError;
    if (parseError) {
      console.warn("[screening/intake] parse failed", parseError, {
        preview: rawResponse.slice(0, 500),
      });
    }
  } else if (rawResponse) {
    // Gateway said error but we somehow have body — still try.
    const parsed = parseAgentJson(rawResponse, opts);
    if (parsed.output) {
      output = parsed.output;
      errorMessage = null;
    } else {
      parseError = parsed.parseError;
    }
  } else {
    console.warn("[screening/intake] gateway failure with empty body", errorMessage);
  }

  if (output) {
    output.brief.locale = opts.locale;
    output.brief.intent = opts.intent;
    const sanity = runSanityLimits(output.brief);
    if (!sanity.ok) {
      output = {
        ...output,
        status: "rejected_infeasible",
        warnings: [
          ...output.warnings,
          ...sanity.issues.map((i) => `${i.key}: ${i.reason}`),
        ].slice(0, 10),
      };
    }
  } else {
    const fallbackBrief = screeningBriefSchema.parse({
      intent: opts.intent,
      includeSectors: opts.currentBrief?.includeSectors ?? opts.suggestedInclude,
      excludeSectors: opts.currentBrief?.excludeSectors ?? opts.suggestedExclude,
      regions: opts.currentBrief?.regions ?? [],
      candidateCount: opts.currentBrief?.candidateCount ?? 5,
      criteria: opts.currentBrief?.criteria ?? [],
      endedEarly: opts.currentBrief?.endedEarly ?? false,
      locale: opts.locale,
    });
    const reason = errorMessage ?? parseError ?? "unknown";
    const userFacing = errorMessage?.startsWith("gateway_")
      ? "The AI service did not respond correctly. Please try again in a moment."
      : "I could not read my own reply. Please try again — a shorter answer usually helps.";
    output = {
      status: "rejected_shape",
      assistantText: userFacing,
      brief: fallbackBrief,
      questions: [],
      suggestions: [],
      warnings: [reason.slice(0, 300)],
      inferredFields: [],
    };
  }

  let aiLogId: string | null = null;
  try {
    aiLogId = await insertAiLog({
      userId: opts.userId,
      source: "screening_intake",
      model,
      promptSystem: systemPrompt.slice(0, 20_000),
      promptUser: lastUserMsg,
      response: rawResponse.slice(0, 20_000),
      durationMs: latencyMs,
      status: errorMessage || parseError ? "error" : "success",
      errorMessage: (errorMessage || parseError || "").slice(0, 2000),
    });
  } catch {
    aiLogId = null;
  }

  return {
    output,
    latencyMs,
    logJson: JSON.stringify({
      model,
      status: output.status,
      raw: rawResponse.slice(0, 4000),
      parseError,
      errorMessage,
      output,
    }),
    aiLogId,
  };
}
