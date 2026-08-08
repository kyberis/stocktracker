import {
  fetchGatewayChatCompletions,
  resolveGatewayApiKey,
} from "@/lib/ai/gateway";
import {
  getLatestScreeningAgentOutputUnscoped,
  insertAiLog,
  insertScreeningAgentOutput,
} from "@/lib/db";
import { hasFreshScreeningResearchCache } from "@/lib/db/screening-research-cache";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import {
  fetchFmpIrBundle,
  summariseIrBundleForLlm,
} from "@/lib/screening/data/fmp-ir";
import { fetchTavilySearch } from "@/lib/screening/data/tavily";
import { accrueScreeningLlmCost } from "@/lib/screening/cost";
import { extractLlmUsage } from "@/lib/screening/llm-usage";
import { recordWebTickerStep } from "@/lib/screening/metrics";
import { buildWebSentimentPrompt } from "@/lib/screening/prompts/web-sentiment";
import { buildQaHintBlock } from "@/lib/screening/qa/hint";
import {
  hardDataOutputSchema,
  webSentimentOutputSchema,
  screeningBriefSchema,
  type HardDataCandidate,
  type HardDataOutput,
  type ScreeningBrief,
  type WebSentimentOutput,
} from "@/lib/screening/schemas";

export const WEB_SENTIMENT_AGENT_KIND = "web_sentiment";
export const WEB_SENTIMENT_MODEL = "openai/gpt-4o-mini";

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
        typeof row.label === "string" ? row.label.slice(0, 120) : undefined,
    });
    if (out.length >= 6) break;
  }
  return out;
}

function fallbackWebOutput(
  ticker: string,
  hd: HardDataCandidate | null,
): WebSentimentOutput {
  return webSentimentOutputSchema.parse({
    ticker,
    signals: [],
    insiderSummary: {
      netBias: "none",
      notes: "Insufficient web/insider evidence for a clear bias.",
      sources: [],
    },
    sentimentSummary: hd?.name
      ? `${hd.name}: web sentiment evidence limited; treat as neutral pending richer sources.`
      : `${ticker}: web sentiment evidence limited; treat as neutral pending richer sources.`,
    gaps: ["llm_or_sources_unavailable"],
  });
}

function coerceWebOutput(
  raw: Record<string, unknown>,
  ticker: string,
): WebSentimentOutput | null {
  const signalsRaw = Array.isArray(raw.signals) ? raw.signals : [];
  const signals = signalsRaw
    .slice(0, 12)
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const row = s as Record<string, unknown>;
      const kindRaw = String(row.kind ?? "neutral");
      const kind = (
        ["tailwind", "headwind", "neutral", "noise"] as const
      ).includes(kindRaw as "tailwind")
        ? (kindRaw as "tailwind" | "headwind" | "neutral" | "noise")
        : "neutral";
      const confirmationRaw = String(row.confirmation ?? "single_source_unconfirmed");
      const confirmation =
        confirmationRaw === "confirmed"
          ? ("confirmed" as const)
          : ("single_source_unconfirmed" as const);
      const claim = String(row.claim ?? "").trim().slice(0, 280);
      if (!claim) return null;
      return {
        kind,
        claim,
        confirmation,
        sources: coerceSources(row.sources),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  const insiderRaw =
    raw.insiderSummary && typeof raw.insiderSummary === "object"
      ? (raw.insiderSummary as Record<string, unknown>)
      : {};
  const biasRaw = String(insiderRaw.netBias ?? "none");
  const netBias = (
    ["buying", "selling", "mixed", "none"] as const
  ).includes(biasRaw as "buying")
    ? (biasRaw as "buying" | "selling" | "mixed" | "none")
    : "none";

  const gaps = Array.isArray(raw.gaps)
    ? raw.gaps
        .map((s) => String(s ?? "").trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const built = webSentimentOutputSchema.safeParse({
    ticker,
    signals,
    insiderSummary: {
      netBias,
      notes: String(insiderRaw.notes ?? "No insider summary.")
        .trim()
        .slice(0, 500) || "No insider summary.",
      sources: coerceSources(insiderRaw.sources),
    },
    sentimentSummary: String(raw.sentimentSummary ?? "")
      .trim()
      .slice(0, 500),
    gaps,
  });
  return built.success ? built.data : null;
}

export interface RunWebSentimentAgentOptions {
  ticker: string;
  brief: ScreeningBrief;
  hardDataCandidate: HardDataCandidate | null;
  evidence: Record<string, unknown>;
  gatewayHeaders?: Headers;
  /** QA correction hint appended to the user prompt on reruns. */
  qaHint?: string;
}

export interface RunWebSentimentAgentResult {
  output: WebSentimentOutput;
  latencyMs: number;
  rawResponse: string;
  errorMessage: string | null;
  tokensInput: number;
  tokensOutput: number;
}

export async function runWebSentimentAgent(
  opts: RunWebSentimentAgentOptions,
): Promise<RunWebSentimentAgentResult> {
  const startedAt = Date.now();
  const ticker = opts.ticker.toUpperCase();

  const gatewayConfigured = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!gatewayConfigured) {
    return {
      output: fallbackWebOutput(ticker, opts.hardDataCandidate),
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: "gateway_not_configured",
      tokensInput: 0,
      tokensOutput: 0,
    };
  }

  const systemPrompt = buildWebSentimentPrompt({
    ticker,
    brief: opts.brief,
    hardDataSummary: opts.hardDataCandidate,
    locale: opts.brief.locale,
  });

  const submitTool = {
    type: "function" as const,
    function: {
      name: "submit_web_sentiment",
      description: "Submit Web & Sentiment research for exactly one ticker.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: [
          "ticker",
          "signals",
          "insiderSummary",
          "sentimentSummary",
          "gaps",
        ],
        properties: {
          ticker: { type: "string" },
          signals: {
            type: "array",
            items: {
              type: "object",
              required: ["kind", "claim", "confirmation"],
              properties: {
                kind: {
                  type: "string",
                  enum: ["tailwind", "headwind", "neutral", "noise"],
                },
                claim: { type: "string" },
                confirmation: {
                  type: "string",
                  enum: ["confirmed", "single_source_unconfirmed"],
                },
                sources: { type: "array", items: { type: "object" } },
              },
            },
          },
          insiderSummary: {
            type: "object",
            required: ["netBias", "notes"],
            properties: {
              netBias: {
                type: "string",
                enum: ["buying", "selling", "mixed", "none"],
              },
              notes: { type: "string" },
              sources: { type: "array", items: { type: "object" } },
            },
          },
          sentimentSummary: { type: "string" },
          gaps: { type: "array", items: { type: "string" } },
        },
      },
    },
  };

  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: `Evidence bundle for ${ticker} (JSON):\n${JSON.stringify(opts.evidence)}${opts.qaHint ?? ""}\n\nPlease call submit_web_sentiment for ticker ${ticker} only.`,
    },
  ];

  let rawResponse = "";
  let errorMessage: string | null = null;
  let tokensInput = 0;
  let tokensOutput = 0;
  try {
    const res = await fetchGatewayChatCompletions(
      {
        model: WEB_SENTIMENT_MODEL,
        stream: false,
        max_tokens: 2200,
        temperature: 0.25,
        messages,
        tools: [submitTool],
        tool_choice: {
          type: "function",
          function: { name: "submit_web_sentiment" },
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

  let output: WebSentimentOutput | null = null;
  if (!errorMessage && rawResponse) {
    try {
      const parsed = JSON.parse(rawResponse) as Record<string, unknown>;
      output = coerceWebOutput(parsed, ticker);
      if (!output) errorMessage = "parse_failed";
    } catch (err) {
      errorMessage = `json_parse:${err instanceof Error ? err.message : "unknown"}`;
    }
  }

  if (!output) {
    console.warn("[screening/web-sentiment] falling back", ticker, errorMessage);
    output = fallbackWebOutput(ticker, opts.hardDataCandidate);
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

export const runWebSentimentStep: StepHandler = async (
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
  const researchEnabled = await isFeatureEnabledForUser(
    "screening_tavily_research_enabled",
    ctx.userId,
  );
  const skipAnalystSearch =
    researchEnabled && (await hasFreshScreeningResearchCache(ticker));

  const [bundle, tavilyNews, tavilyAnalyst] = await Promise.all([
    fetchFmpIrBundle({ ticker }),
    fetchTavilySearch({
      query: `${hardDataCandidate?.name || ticker} (${ticker}) news`,
      maxResults: 5,
      daysBack: 90,
      runId: ctx.runId,
    }),
    skipAnalystSearch
      ? Promise.resolve({ results: [], errors: [] as string[] })
      : fetchTavilySearch({
          query: `${ticker} analyst rating`,
          maxResults: 4,
          daysBack: 90,
          runId: ctx.runId,
        }),
  ]);

  const evidence = {
    ...summariseIrBundleForLlm(bundle),
    tavily: {
      news: tavilyNews.results,
      analyst: tavilyAnalyst.results,
      analystSkippedDueToResearchCache: skipAnalystSearch,
      errors: [...tavilyNews.errors, ...tavilyAnalyst.errors],
    },
  };

  const qaHint = await buildQaHintBlock(
    ctx.runId,
    WEB_SENTIMENT_AGENT_KIND,
    ticker,
  );

  const result = await runWebSentimentAgent({
    ticker,
    brief,
    hardDataCandidate,
    evidence,
    qaHint,
  });

  await accrueScreeningLlmCost({
    runId: ctx.runId,
    model: WEB_SENTIMENT_MODEL,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
  });

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: WEB_SENTIMENT_AGENT_KIND,
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
      "[screening/web-sentiment] persist output failed",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await insertAiLog({
      userId: ctx.userId,
      source: "screening_web_sentiment",
      model: WEB_SENTIMENT_MODEL,
      promptSystem: "web_sentiment_system_prompt",
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

  const unconfirmed = result.output.signals.filter(
    (s) => s.confirmation === "single_source_unconfirmed",
  ).length;
  const signalsByKind: Record<string, number> = {};
  for (const s of result.output.signals) {
    signalsByKind[s.kind] = (signalsByKind[s.kind] ?? 0) + 1;
  }
  const outcome =
    result.errorMessage && result.output.gaps.includes("llm_or_sources_unavailable")
      ? "empty"
      : result.errorMessage
        ? "error"
        : "ok";
  recordWebTickerStep(outcome, Date.now() - started, {
    unconfirmed,
    signalsByKind,
  });

  return {
    status: "ok",
    payload: {
      ticker,
      signals: result.output.signals.length,
      unconfirmed,
      fmpErrors: bundle.errors.length,
      tavilyErrors: [...tavilyNews.errors, ...tavilyAnalyst.errors].length,
      analystSearchSkipped: skipAnalystSearch,
      llmError: result.errorMessage,
    },
  };
};

registerHandler(WEB_SENTIMENT_AGENT_KIND, runWebSentimentStep);
