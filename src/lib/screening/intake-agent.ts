import {
  fetchGatewayChatCompletions,
  resolveGatewayApiKey,
} from "@/lib/ai/gateway";
import { insertAiLog, resolveAiModelForUserPlan } from "@/lib/db";
import type { SubscriptionPlan } from "@/lib/types";
import { runSanityLimits } from "./rules/sanity-limits";
import { buildIntakePrompt } from "./prompts/intake";
import {
  intakeAgentOutputSchema,
  screeningBriefSchema,
  type IntakeAgentOutput,
  type IntakeAgentStatus,
  type ScreeningBrief,
  type ScreeningIntent,
} from "./schemas";

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
    warnings: ["gateway_not_configured"],
    inferredFields: [],
  });
}

function extractJsonPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // response_format json_object should already give us clean JSON, but LLMs
  // occasionally wrap it in fences or preamble text.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return null;
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

  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "system" as const,
      content: `Context seed (JSON):\n${JSON.stringify(seed)}`,
    },
    ...opts.messages,
  ];

  const model = await resolveAiModelForUserPlan("portfolio_chat", opts.plan);
  const lastUserMsg =
    [...opts.messages].reverse().find((m) => m.role === "user")?.content?.slice(0, 4000) ?? "";

  let rawResponse = "";
  let errorMessage: string | null = null;

  try {
    const res = await fetchGatewayChatCompletions(
      {
        model,
        stream: false,
        max_tokens: 900,
        temperature: 0.2,
        messages,
        response_format: { type: "json_object" },
      },
      { headers: opts.gatewayHeaders },
    );
    if (!res.ok) {
      errorMessage = `gateway_${res.status}`;
    } else {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      rawResponse = data.choices?.[0]?.message?.content ?? "";
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "gateway_error";
  }

  const latencyMs = Date.now() - startedAt;

  let output: IntakeAgentOutput | null = null;
  let parseError: string | null = null;

  if (!errorMessage) {
    const payload = extractJsonPayload(rawResponse);
    if (!payload) {
      parseError = "no_json";
    } else {
      try {
        const parsed = JSON.parse(payload) as unknown;
        output = intakeAgentOutputSchema.parse(parsed);
      } catch (err) {
        parseError = err instanceof Error ? err.message : "parse_error";
      }
    }
  }

  if (output) {
    // Locale is always echoed to the caller's locale to prevent drift.
    output.brief.locale = opts.locale;
    output.brief.intent = opts.intent;
    // Sanity limits: if the LLM produced impossible ranges we downgrade the
    // status to `rejected_infeasible` and surface the reasons.
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
    // Structural failure — surface a shape rejection instead of masking the
    // failure as a generic clarification.
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
    output = {
      status: "rejected_shape",
      assistantText:
        "I could not parse the agent's response. Try again or rephrase your last message.",
      brief: fallbackBrief,
      questions: [],
      warnings: [errorMessage ?? parseError ?? "unknown"],
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
    // AI log persistence is best-effort — do not fail the turn if the DB is
    // down.
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
