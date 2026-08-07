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
    riskProfile: opts.currentBrief?.riskProfile ?? null,
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
  if (!rawResponse.trim()) {
    return { output: null, parseError: "empty" };
  }

  // Tool-call arguments are already strict JSON — try direct parse first.
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    // Fall back to fence/brace extraction + truncation repair for legacy
    // content-based responses.
    const payload =
      extractJsonPayload(rawResponse) ?? tryRepairTruncatedJson(rawResponse);
    if (!payload) {
      return { output: null, parseError: "no_json" };
    }
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

  // Intake needs strict structured output. Use OpenAI tool calling: the model
  // MUST call `submit_brief` with the schema, so the args are always valid JSON.
  // Pin to gpt-4o-mini which reliably supports tool_choice via the AI Gateway.
  const model = "openai/gpt-4o-mini";
  const lastUserMsg =
    [...opts.messages].reverse().find((m) => m.role === "user")?.content?.slice(0, 4000) ?? "";

  const submitBriefTool = {
    type: "function" as const,
    function: {
      name: "submit_brief",
      description:
        "Submit the user's screening brief plus a short assistant message and optional suggestion chips. Call this exactly once per turn.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: [
          "status",
          "assistantText",
          "brief",
          "questions",
          "suggestions",
          "warnings",
          "inferredFields",
        ],
        properties: {
          status: {
            type: "string",
            enum: ["ok", "needs_clarification", "rejected_infeasible", "rejected_shape"],
            description:
              "'ok' when the brief is complete and ready to run; 'needs_clarification' while still gathering info; 'rejected_infeasible' when the ask is impossible; 'rejected_shape' only for parse errors.",
          },
          assistantText: {
            type: "string",
            description:
              "Short natural-language message shown in the chat bubble (max ~500 chars). Must include a concrete recommendation when asking a question.",
          },
          brief: {
            type: "object",
            additionalProperties: false,
            required: [
              "intent",
              "includeSectors",
              "excludeSectors",
              "regions",
              "candidateCount",
              "criteria",
              "endedEarly",
              "locale",
              "riskProfile",
            ],
            properties: {
              intent: { type: "string", enum: ["rebalance", "explore"] },
              includeSectors: { type: "array", items: { type: "string" } },
              excludeSectors: { type: "array", items: { type: "string" } },
              regions: { type: "array", items: { type: "string" } },
              candidateCount: { type: "integer", minimum: 3, maximum: 5 },
              criteria: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["key", "condition", "source"],
                  properties: {
                    key: { type: "string" },
                    condition: {
                      type: "string",
                      description: "Free-form condition text, e.g. '< 2.5x' or '300 – 15,000M USD'.",
                    },
                    source: {
                      type: "string",
                      enum: ["chat", "preset", "rebalance", "confirmed"],
                    },
                  },
                },
              },
              endedEarly: { type: "boolean" },
              locale: { type: "string" },
              riskProfile: {
                type: ["string", "null"],
                enum: ["conservative", "balanced", "aggressive", null],
                description:
                  "Risk profile for sizing/concentration. null until the user answers.",
              },
            },
          },
          questions: {
            type: "array",
            items: { type: "string" },
            description: "Optional short questions. Usually leave empty — use assistantText instead.",
          },
          suggestions: {
            type: "array",
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "say"],
              properties: {
                label: { type: "string", description: "Short chip text shown to the user (max 40 chars)." },
                say: { type: "string", description: "Text that will be sent as the user's answer if the chip is clicked." },
              },
            },
            description:
              "2–4 recommended-answer chips shown under the message. Include a 'Finish and search' style opt-out when useful.",
          },
          warnings: {
            type: "array",
            items: { type: "string" },
          },
          inferredFields: {
            type: "array",
            items: { type: "string" },
            description: "Fields that were filled from preset/defaults rather than user input.",
          },
        },
      },
    },
  };

  async function callGateway(): Promise<{ args: string; error: string | null }> {
    try {
      const res = await fetchGatewayChatCompletions(
        {
          model,
          stream: false,
          max_tokens: 2000,
          temperature: 0.2,
          messages,
          tools: [submitBriefTool],
          tool_choice: {
            type: "function",
            function: { name: "submit_brief" },
          },
        },
        { headers: opts.gatewayHeaders },
      );
      if (!res.ok) {
        const errBody = (await res.text().catch(() => "")).slice(0, 500);
        return { args: "", error: `gateway_${res.status}:${errBody}` };
      }
      const data = (await res.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
            tool_calls?: Array<{
              type?: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
          finish_reason?: string;
        }>;
      };
      const call = data.choices?.[0]?.message?.tool_calls?.[0];
      const args = call?.function?.arguments ?? "";
      if (!args) {
        // Fallback: some providers return JSON in message.content when tools
        // are ignored. Preserve it so coerce can still try.
        const content = data.choices?.[0]?.message?.content ?? "";
        return { args: content, error: null };
      }
      return { args, error: null };
    } catch (err) {
      return {
        args: "",
        error: err instanceof Error ? err.message : "gateway_error",
      };
    }
  }

  const call = await callGateway();
  const rawResponse = call.args;
  let errorMessage: string | null = call.error;

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
      riskProfile: opts.currentBrief?.riskProfile ?? null,
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
