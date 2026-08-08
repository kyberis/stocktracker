import {
  fetchGatewayChatCompletions,
  resolveGatewayApiKey,
} from "@/lib/ai/gateway";
import {
  getLatestScreeningAgentOutputUnscoped,
  insertAiLog,
  insertScreeningAgentOutput,
} from "@/lib/db";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import { getOrFetchCompanyResearch } from "@/lib/screening/data/company-research";
import {
  fetchFmpIrBundle,
  isFmpIrThin,
  summariseIrBundleForLlm,
} from "@/lib/screening/data/fmp-ir";
import { accrueScreeningLlmCost } from "@/lib/screening/cost";
import { extractLlmUsage } from "@/lib/screening/llm-usage";
import { recordIrTickerStep } from "@/lib/screening/metrics";
import { buildIrBusinessPrompt } from "@/lib/screening/prompts/ir-business";
import { buildQaHintBlock } from "@/lib/screening/qa/hint";
import {
  hardDataOutputSchema,
  irBusinessOutputSchema,
  screeningBriefSchema,
  type HardDataCandidate,
  type HardDataOutput,
  type IrBusinessOutput,
  type ScreeningBrief,
} from "@/lib/screening/schemas";

export const IR_BUSINESS_AGENT_KIND = "ir_business";
export const IR_BUSINESS_MODEL = "openai/gpt-4o-mini";

function parseBrief(json: string): ScreeningBrief | null {
  try {
    const res = screeningBriefSchema.safeParse(JSON.parse(json));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

function parseHardData(json: string): HardDataOutput | null {
  try {
    const res = hardDataOutputSchema.safeParse(JSON.parse(json));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

function fallbackIrOutput(
  ticker: string,
  hd: HardDataCandidate | null,
): IrBusinessOutput {
  return irBusinessOutputSchema.parse({
    ticker,
    businessOneLiner: hd?.name
      ? `${hd.name} — ${hd.sector || "company"} (IR evidence limited).`
      : `${ticker} — IR evidence limited; using Hard Data context only.`,
    guidance: {
      summary: "Guidance not available from current sources.",
      direction: "unclear",
      asOf: new Date().toISOString().slice(0, 10),
      sources: [],
    },
    catalysts: [],
    segments: hd?.industry ? [hd.industry] : [],
    contradictionWithHardData: false,
    confidence: "low",
    bullets: [
      hd?.rankReason?.slice(0, 280) ||
        "Insufficient IR materials to form a business thesis.",
      "Confidence is low until a recent earnings transcript is available.",
      "Treat this as a placeholder pending richer IR evidence.",
    ],
    gaps: ["llm_or_sources_unavailable"],
  });
}

function coerceSources(raw: unknown): Array<{
  url: string;
  asOf: string;
  label?: string;
}> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ url: string; asOf: string; label?: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    out.push({
      url: String(row.url ?? "").slice(0, 500),
      asOf: String(row.asOf ?? "").slice(0, 40),
      label:
        typeof row.label === "string"
          ? row.label.slice(0, 120)
          : undefined,
    });
    if (out.length >= 6) break;
  }
  return out;
}

function coerceIrOutput(
  raw: Record<string, unknown>,
  ticker: string,
): IrBusinessOutput | null {
  const guidanceRaw =
    raw.guidance && typeof raw.guidance === "object"
      ? (raw.guidance as Record<string, unknown>)
      : {};
  const directionRaw = String(guidanceRaw.direction ?? "unclear");
  const direction = (["up", "flat", "down", "unclear"] as const).includes(
    directionRaw as "up",
  )
    ? (directionRaw as "up" | "flat" | "down" | "unclear")
    : "unclear";

  const catalystsRaw = Array.isArray(raw.catalysts) ? raw.catalysts : [];
  const catalysts = catalystsRaw
    .slice(0, 8)
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const row = c as Record<string, unknown>;
      const label = String(row.label ?? "").trim().slice(0, 120);
      const evidence = String(row.evidence ?? "").trim().slice(0, 400);
      if (!label || !evidence) return null;
      return {
        label,
        evidence,
        sources: coerceSources(row.sources).slice(0, 4),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null);

  const segments = Array.isArray(raw.segments)
    ? raw.segments
        .map((s) => String(s ?? "").trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const bullets = Array.isArray(raw.bullets)
    ? raw.bullets
        .map((s) => String(s ?? "").trim().slice(0, 280))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const gaps = Array.isArray(raw.gaps)
    ? raw.gaps
        .map((s) => String(s ?? "").trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const confidenceRaw = String(raw.confidence ?? "medium");
  const confidence = (["high", "medium", "low"] as const).includes(
    confidenceRaw as "high",
  )
    ? (confidenceRaw as "high" | "medium" | "low")
    : "medium";

  const built = irBusinessOutputSchema.safeParse({
    ticker,
    businessOneLiner: String(raw.businessOneLiner ?? "")
      .trim()
      .slice(0, 280),
    guidance: {
      summary: String(guidanceRaw.summary ?? "")
        .trim()
        .slice(0, 500),
      direction,
      asOf: String(guidanceRaw.asOf ?? new Date().toISOString().slice(0, 10))
        .trim()
        .slice(0, 40),
      sources: coerceSources(guidanceRaw.sources),
    },
    catalysts,
    segments,
    contradictionWithHardData: Boolean(raw.contradictionWithHardData),
    confidence,
    bullets:
      bullets.length > 0
        ? bullets
        : ["IR summary unavailable; see gaps."],
    gaps,
  });
  return built.success ? built.data : null;
}

export interface RunIrBusinessAgentOptions {
  ticker: string;
  brief: ScreeningBrief;
  hardDataCandidate: HardDataCandidate | null;
  evidence: Record<string, unknown>;
  gatewayHeaders?: Headers;
  /** QA correction hint appended to the user prompt on reruns. */
  qaHint?: string;
}

export interface RunIrBusinessAgentResult {
  output: IrBusinessOutput;
  latencyMs: number;
  rawResponse: string;
  errorMessage: string | null;
  tokensInput: number;
  tokensOutput: number;
}

export async function runIrBusinessAgent(
  opts: RunIrBusinessAgentOptions,
): Promise<RunIrBusinessAgentResult> {
  const startedAt = Date.now();
  const ticker = opts.ticker.toUpperCase();

  const gatewayConfigured = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!gatewayConfigured) {
    return {
      output: fallbackIrOutput(ticker, opts.hardDataCandidate),
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: "gateway_not_configured",
      tokensInput: 0,
      tokensOutput: 0,
    };
  }

  const systemPrompt = buildIrBusinessPrompt({
    ticker,
    brief: opts.brief,
    hardDataSummary: opts.hardDataCandidate,
    locale: opts.brief.locale,
  });

  const submitTool = {
    type: "function" as const,
    function: {
      name: "submit_ir_business",
      description:
        "Submit the IR / Business research output for exactly one ticker.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: [
          "ticker",
          "businessOneLiner",
          "guidance",
          "catalysts",
          "segments",
          "contradictionWithHardData",
          "confidence",
          "bullets",
          "gaps",
        ],
        properties: {
          ticker: { type: "string" },
          businessOneLiner: { type: "string" },
          guidance: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "direction", "asOf", "sources"],
            properties: {
              summary: { type: "string" },
              direction: {
                type: "string",
                enum: ["up", "flat", "down", "unclear"],
              },
              asOf: { type: "string" },
              sources: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    asOf: { type: "string" },
                    label: { type: "string" },
                  },
                },
              },
            },
          },
          catalysts: {
            type: "array",
            items: {
              type: "object",
              required: ["label", "evidence"],
              properties: {
                label: { type: "string" },
                evidence: { type: "string" },
                sources: { type: "array", items: { type: "object" } },
              },
            },
          },
          segments: { type: "array", items: { type: "string" } },
          contradictionWithHardData: { type: "boolean" },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          bullets: { type: "array", items: { type: "string" } },
          gaps: { type: "array", items: { type: "string" } },
        },
      },
    },
  };

  const qaHint = opts.qaHint ?? "";
  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: `Evidence bundle for ${ticker} (JSON):\n${JSON.stringify(opts.evidence)}${qaHint}\n\nPlease call submit_ir_business for ticker ${ticker} only.`,
    },
  ];

  let rawResponse = "";
  let errorMessage: string | null = null;
  let tokensInput = 0;
  let tokensOutput = 0;
  try {
    const res = await fetchGatewayChatCompletions(
      {
        model: IR_BUSINESS_MODEL,
        stream: false,
        max_tokens: 2200,
        temperature: 0.25,
        messages,
        tools: [submitTool],
        tool_choice: {
          type: "function",
          function: { name: "submit_ir_business" },
        },
      },
      { headers: opts.gatewayHeaders },
    );
    if (!res.ok) {
      const body = (await res.text().catch(() => "")).slice(0, 500);
      errorMessage = `gateway_${res.status}:${body}`;
    } else {
      const data = (await res.json()) as {
        choices?: Array<{
          message?: {
            tool_calls?: Array<{ function?: { arguments?: string } }>;
            content?: string;
          };
        }>;
        usage?: unknown;
      };
      const usage = extractLlmUsage(data);
      tokensInput = usage.tokensInput;
      tokensOutput = usage.tokensOutput;
      const call = data.choices?.[0]?.message?.tool_calls?.[0];
      rawResponse =
        call?.function?.arguments ?? data.choices?.[0]?.message?.content ?? "";
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "gateway_error";
  }

  let output: IrBusinessOutput | null = null;
  if (!errorMessage && rawResponse) {
    try {
      const parsed = JSON.parse(rawResponse) as Record<string, unknown>;
      output = coerceIrOutput(parsed, ticker);
      if (!output) {
        errorMessage = "parse_failed";
      }
    } catch (err) {
      errorMessage = `json_parse:${err instanceof Error ? err.message : "unknown"}`;
    }
  }

  if (!output) {
    console.warn(
      "[screening/ir-business] falling back",
      ticker,
      errorMessage,
    );
    output = fallbackIrOutput(ticker, opts.hardDataCandidate);
  }

  return {
    output,
    latencyMs: Date.now() - startedAt,
    rawResponse,
    errorMessage,
    tokensInput,
    tokensOutput,
  };
}

export const runIrBusinessStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const ticker = ctx.step.ticker?.toUpperCase().trim();
  if (!ticker) {
    return { status: "error", errorMessage: "ticker_missing", fatal: true };
  }

  const brief = parseBrief(ctx.briefJson);
  if (!brief) {
    return { status: "error", errorMessage: "brief_unavailable", fatal: true };
  }

  const hardDataRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    "hard_data",
  );
  const hardData = hardDataRow
    ? parseHardData(hardDataRow.outputJson)
    : null;
  const hardDataCandidate =
    hardData?.candidates.find((c) => c.ticker.toUpperCase() === ticker) ??
    null;

  const started = Date.now();
  const bundle = await fetchFmpIrBundle({ ticker });
  const evidence: Record<string, unknown> = summariseIrBundleForLlm(bundle);

  const researchEnabled = await isFeatureEnabledForUser(
    "screening_tavily_research_enabled",
    ctx.userId,
  );
  let researchUsed = false;
  if (researchEnabled && isFmpIrThin(bundle)) {
    const research = await getOrFetchCompanyResearch({
      ticker,
      companyName: hardDataCandidate?.name ?? ticker,
      runId: ctx.runId,
      model: "mini",
    });
    if (
      research.businessOneLiner ||
      research.rawContent ||
      research.sources.length > 0
    ) {
      researchUsed = true;
      evidence.tavilyCompanyResearch = {
        businessOneLiner: research.businessOneLiner,
        segments: research.segments,
        catalysts: research.catalysts,
        guidanceSummary: research.guidanceSummary,
        competitors: research.competitors,
        sources: research.sources,
        fromCache: research.fromCache,
        errors: research.errors,
      };
    }
  }

  const qaHint = await buildQaHintBlock(ctx.runId, IR_BUSINESS_AGENT_KIND, ticker);

  const result = await runIrBusinessAgent({
    ticker,
    brief,
    hardDataCandidate,
    evidence,
    qaHint,
  });

  await accrueScreeningLlmCost({
    runId: ctx.runId,
    model: IR_BUSINESS_MODEL,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
  });

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: IR_BUSINESS_AGENT_KIND,
      ticker,
      agentIndex: hardData
        ? Math.max(
            0,
            hardData.candidates.findIndex(
              (c) => c.ticker.toUpperCase() === ticker,
            ),
          )
        : null,
      outputJson: JSON.stringify(result.output),
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    console.error(
      "[screening/ir-business] persist output failed",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await insertAiLog({
      userId: ctx.userId,
      source: "screening_ir_business",
      model: IR_BUSINESS_MODEL,
      promptSystem: "ir_business_system_prompt",
      promptUser: `ticker=${ticker}`,
      response: result.rawResponse.slice(0, 20_000),
      durationMs: result.latencyMs,
      status: result.errorMessage ? "error" : "success",
      errorMessage: result.errorMessage?.slice(0, 2000) ?? "",
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    });
  } catch {
    // best-effort
  }

  const outcome =
    result.errorMessage && result.output.confidence === "low"
      ? "error"
      : result.output.gaps.includes("llm_or_sources_unavailable")
        ? "empty"
        : "ok";
  recordIrTickerStep(outcome, Date.now() - started, {
    gaps: result.output.gaps.length,
    contradiction: result.output.contradictionWithHardData,
  });

  return {
    status: "ok",
    payload: {
      ticker,
      confidence: result.output.confidence,
      gaps: result.output.gaps.length,
      contradiction: result.output.contradictionWithHardData,
      fmpErrors: bundle.errors.length,
      researchUsed,
      llmError: result.errorMessage,
    },
  };
};

registerHandler(IR_BUSINESS_AGENT_KIND, runIrBusinessStep);
