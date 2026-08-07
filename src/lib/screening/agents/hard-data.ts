import {
  fetchGatewayChatCompletions,
  resolveGatewayApiKey,
} from "@/lib/ai/gateway";
import {
  findStepByAgentKind,
  insertAiLog,
  insertScreeningAgentOutput,
  insertSteps,
  updateStepDependsOn,
} from "@/lib/db";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import {
  fetchFmpScreener,
  marketCapRangeFromCondition,
  type FmpScreenerCandidate,
} from "@/lib/screening/data/fmp-screening";
import { buildHardDataPrompt } from "@/lib/screening/prompts/hard-data";
import {
  hardDataOutputSchema,
  screeningBriefSchema,
  type HardDataCandidate,
  type HardDataOutput,
  type ScreeningBrief,
} from "@/lib/screening/schemas";
export const HARD_DATA_AGENT_KIND = "hard_data";
export const HARD_DATA_MODEL = "openai/gpt-4o-mini";
const MAX_UNIVERSE_FOR_LLM = 60;
/** Max per-ticker IR steps fan-out after Hard Data (PRD §13 E4). */
export const IR_FANOUT_MAX = 4;
/** Kind strings kept local to avoid circular imports with agent modules. */
const IR_KIND = "ir_business";
const AGGREGATE_IR_KIND = "aggregate_ir_business";
const COMPILER_KIND = "compiler";

interface FmpUniverseSummary {
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  country: string | null;
  marketCapUsd: number | null;
  price: number | null;
}

function parseBrief(briefJson: string): ScreeningBrief | null {
  if (!briefJson) return null;
  try {
    const parsed = JSON.parse(briefJson);
    const res = screeningBriefSchema.safeParse(parsed);
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

function summariseUniverse(rows: FmpScreenerCandidate[]): FmpUniverseSummary[] {
  return rows.slice(0, MAX_UNIVERSE_FOR_LLM).map((r) => ({
    ticker: r.ticker,
    name: r.name,
    sector: r.sector,
    industry: r.industry,
    country: r.country,
    marketCapUsd: r.marketCapUsd,
    price: r.price,
  }));
}

function coerceCandidates(
  rawCandidates: unknown,
  universe: Map<string, FmpScreenerCandidate>,
): HardDataCandidate[] {
  if (!Array.isArray(rawCandidates)) return [];
  const out: HardDataCandidate[] = [];
  const seen = new Set<string>();
  for (const item of rawCandidates) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const ticker = String(row.ticker ?? "").toUpperCase().trim();
    if (!ticker || seen.has(ticker)) continue;
    const universeRow = universe.get(ticker);
    // Only trust the LLM for ranking; use the FMP row for metrics to prevent
    // hallucinated numbers.
    const rankScore = Number(row.rankScore ?? row.rank_score);
    const clampedScore = Number.isFinite(rankScore)
      ? Math.min(100, Math.max(0, rankScore))
      : 50;
    const rankReason = String(row.rankReason ?? row.rank_reason ?? "").trim();
    if (!rankReason) continue;
    const candidate: HardDataCandidate = {
      ticker,
      name: universeRow?.name ?? String(row.name ?? ticker).slice(0, 200),
      sector: universeRow?.sector ?? null,
      industry: universeRow?.industry ?? null,
      country: universeRow?.country ?? null,
      marketCapUsd: universeRow?.marketCapUsd ?? null,
      price: universeRow?.price ?? null,
      rankScore: clampedScore,
      rankReason: rankReason.slice(0, 280),
    };
    seen.add(ticker);
    out.push(candidate);
  }
  return out;
}

function coerceStringList(raw: unknown, maxLen: number, maxItems: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    const s = String(v ?? "").trim().slice(0, maxLen);
    if (s) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

export interface RunHardDataAgentOptions {
  brief: ScreeningBrief;
  universe: FmpScreenerCandidate[];
  gatewayHeaders?: Headers;
}

export interface RunHardDataAgentResult {
  output: HardDataOutput;
  latencyMs: number;
  rawResponse: string;
  errorMessage: string | null;
}

/** Run the Hard Data LLM turn against a pre-fetched universe. */
export async function runHardDataAgent(
  opts: RunHardDataAgentOptions,
): Promise<RunHardDataAgentResult> {
  const startedAt = Date.now();
  const brief = opts.brief;
  const universeMap = new Map(opts.universe.map((c) => [c.ticker, c]));

  if (opts.universe.length === 0) {
    return {
      output: hardDataOutputSchema.parse({
        status: "empty",
        universeSize: 0,
        candidates: [],
        deferredTickers: [],
        gaps: ["universe_empty"],
        locale: brief.locale,
      }),
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: null,
    };
  }

  const gatewayConfigured = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!gatewayConfigured) {
    // Fallback: return top-N by market cap so the pipeline still moves forward.
    const fallback = opts.universe.slice(0, brief.candidateCount).map(
      (c, i): HardDataCandidate => ({
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        industry: c.industry,
        country: c.country,
        marketCapUsd: c.marketCapUsd,
        price: c.price,
        rankScore: 60 - i * 5,
        rankReason: "AI gateway not configured — ranked by market cap.",
      }),
    );
    return {
      output: hardDataOutputSchema.parse({
        status: "ok",
        universeSize: opts.universe.length,
        candidates: fallback,
        deferredTickers: [],
        gaps: ["gateway_not_configured"],
        locale: brief.locale,
      }),
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: null,
    };
  }

  const systemPrompt = buildHardDataPrompt({
    brief,
    locale: brief.locale,
    universeSize: opts.universe.length,
  });

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    {
      role: "user" as const,
      content: `Universe (JSON, ${opts.universe.length} rows total, showing top ${Math.min(opts.universe.length, MAX_UNIVERSE_FOR_LLM)}):\n${JSON.stringify(summariseUniverse(opts.universe))}\n\nPlease call submit_hard_data with your ranking.`,
    },
  ];

  const submitHardDataTool = {
    type: "function" as const,
    function: {
      name: "submit_hard_data",
      description:
        "Submit the ranked candidate list plus deferred tickers and gaps.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["status", "candidates", "deferredTickers", "gaps"],
        properties: {
          status: { type: "string", enum: ["ok", "empty"] },
          candidates: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["ticker", "rankScore", "rankReason"],
              properties: {
                ticker: { type: "string" },
                rankScore: { type: "number", minimum: 0, maximum: 100 },
                rankReason: {
                  type: "string",
                  description:
                    "Locale-aware short sentence explaining the fit. Max 240 chars. No price or target.",
                },
              },
            },
            maxItems: 15,
          },
          deferredTickers: {
            type: "array",
            items: { type: "string" },
            maxItems: 20,
          },
          gaps: { type: "array", items: { type: "string" }, maxItems: 8 },
        },
      },
    },
  };

  let rawResponse = "";
  let errorMessage: string | null = null;

  try {
    const res = await fetchGatewayChatCompletions(
      {
        model: HARD_DATA_MODEL,
        stream: false,
        max_tokens: 2000,
        temperature: 0.2,
        messages,
        tools: [submitHardDataTool],
        tool_choice: {
          type: "function",
          function: { name: "submit_hard_data" },
        },
      },
      { headers: opts.gatewayHeaders },
    );
    if (!res.ok) {
      const errBody = (await res.text().catch(() => "")).slice(0, 500);
      errorMessage = `gateway_${res.status}:${errBody}`;
    } else {
      const data = (await res.json()) as {
        choices?: Array<{
          message?: {
            tool_calls?: Array<{
              function?: { arguments?: string };
            }>;
            content?: string;
          };
        }>;
      };
      const call = data.choices?.[0]?.message?.tool_calls?.[0];
      rawResponse =
        call?.function?.arguments ?? data.choices?.[0]?.message?.content ?? "";
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "gateway_error";
  }

  let output: HardDataOutput | null = null;
  if (!errorMessage && rawResponse) {
    try {
      const parsed = JSON.parse(rawResponse) as Record<string, unknown>;
      const candidates = coerceCandidates(parsed.candidates, universeMap);
      const status = candidates.length === 0 ? "empty" : "ok";
      const built = hardDataOutputSchema.safeParse({
        status,
        universeSize: opts.universe.length,
        candidates: candidates.slice(0, brief.candidateCount),
        deferredTickers: coerceStringList(parsed.deferredTickers, 20, 20),
        gaps: coerceStringList(parsed.gaps, 200, 8),
        locale: brief.locale,
      });
      if (built.success) {
        output = built.data;
      } else {
        errorMessage = `parse_failed:${built.error.issues[0]?.message ?? "unknown"}`;
      }
    } catch (err) {
      errorMessage = `json_parse:${err instanceof Error ? err.message : "unknown"}`;
    }
  }

  if (!output) {
    console.warn(
      "[screening/hard-data] falling back to deterministic ranking",
      errorMessage,
      { preview: rawResponse.slice(0, 200) },
    );
    const fallback = opts.universe.slice(0, brief.candidateCount).map(
      (c, i): HardDataCandidate => ({
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        industry: c.industry,
        country: c.country,
        marketCapUsd: c.marketCapUsd,
        price: c.price,
        rankScore: 60 - i * 5,
        rankReason: "Ranked by market cap (LLM output not usable).",
      }),
    );
    output = hardDataOutputSchema.parse({
      status: fallback.length === 0 ? "empty" : "ok",
      universeSize: opts.universe.length,
      candidates: fallback,
      deferredTickers: [],
      gaps: [errorMessage ?? "llm_no_output"],
      locale: brief.locale,
    });
  }

  return {
    output,
    latencyMs: Date.now() - startedAt,
    rawResponse,
    errorMessage,
  };
}

/**
 * Orchestrator handler. Wraps the runner with FMP data fetch, DB persistence,
 * and ai_logs writing. Returns HandlerResult for the worker.
 */
export const runHardDataStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const brief = parseBrief(ctx.briefJson);
  if (!brief) {
    return { status: "error", errorMessage: "brief_unavailable", fatal: true };
  }

  const mcapCriterion = brief.criteria.find((c) => c.key === "marketCap");
  const range = mcapCriterion
    ? marketCapRangeFromCondition(mcapCriterion.condition)
    : { min: null, max: null };

  const started = Date.now();
  const screenerResult = await fetchFmpScreener({
    marketCapMin: range.min,
    marketCapMax: range.max,
    includeSectors: brief.includeSectors,
    excludeSectors: brief.excludeSectors,
    regions: brief.regions,
    limit: 200,
  });

  const runnerResult = await runHardDataAgent({
    brief,
    universe: screenerResult.candidates,
  });

  // Persist output + AI log. Both are best-effort — the step still succeeds
  // even if the sidecar writes fail so we don't block the pipeline on logging.
  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: HARD_DATA_AGENT_KIND,
      outputJson: JSON.stringify(runnerResult.output),
      latencyMs: runnerResult.latencyMs,
    });
  } catch (err) {
    console.error(
      "[screening/hard-data] persist output failed",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await insertAiLog({
      userId: ctx.userId,
      source: "screening_hard_data",
      model: HARD_DATA_MODEL,
      promptSystem: "hard_data_system_prompt",
      promptUser: `universe=${screenerResult.candidates.length}`,
      response: runnerResult.rawResponse.slice(0, 20_000),
      durationMs: runnerResult.latencyMs,
      status: runnerResult.errorMessage ? "error" : "success",
      errorMessage: runnerResult.errorMessage?.slice(0, 2000) ?? "",
    });
  } catch {
    // best-effort
  }

  // E4 fan-out: when IR agent is enabled, insert N ir_business steps + an
  // aggregate barrier, then rewire the Compiler to wait on the aggregate.
  let irFanout = 0;
  try {
    const irEnabled = await isFeatureEnabledForUser(
      "screening_ir_agent_enabled",
      ctx.userId,
    );
    const candidates = runnerResult.output.candidates.slice(0, IR_FANOUT_MAX);
    if (irEnabled && candidates.length > 0) {
      const irStepIds = candidates.map(() => crypto.randomUUID());
      const aggregateId = crypto.randomUUID();
      await insertSteps(ctx.runId, [
        ...candidates.map((c, i) => ({
          id: irStepIds[i],
          agentKind: IR_KIND,
          ticker: c.ticker,
          dependsOn: [] as string[],
        })),
        {
          id: aggregateId,
          agentKind: AGGREGATE_IR_KIND,
          dependsOn: irStepIds,
        },
      ]);
      const compilerStep = await findStepByAgentKind(
        ctx.runId,
        COMPILER_KIND,
      );
      if (compilerStep && compilerStep.status === "pending") {
        await updateStepDependsOn(compilerStep.id, [aggregateId]);
      }
      irFanout = candidates.length;
    }
  } catch (err) {
    console.error(
      "[screening/hard-data] IR fan-out failed",
      err instanceof Error ? err.message : err,
    );
  }

  const totalDuration = Date.now() - started;
  return {
    status: "ok",
    payload: {
      universeSize: screenerResult.candidates.length,
      candidateCount: runnerResult.output.candidates.length,
      fmpErrors: screenerResult.errors.length,
      llmError: runnerResult.errorMessage,
      irFanout,
      totalDurationMs: totalDuration,
    },
  };
};

registerHandler(HARD_DATA_AGENT_KIND, runHardDataStep);
