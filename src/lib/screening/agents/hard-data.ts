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
import {
  enrichHardDataCandidates,
  summariseUniverseWithSignals,
} from "@/lib/screening/data/enrich-candidates";
import {
  loadTrefolioSignalsForTickers,
  type TrefolioTickerSignals,
} from "@/lib/screening/data/trefolio-signals";
import { buildHardDataPrompt } from "@/lib/screening/prompts/hard-data";
import { buildQaHintBlock } from "@/lib/screening/qa/hint";
import {
  hardDataOutputSchema,
  screeningBriefSchema,
  type HardDataCandidate,
  type HardDataOutput,
  type ScreeningBrief,
} from "@/lib/screening/schemas";
import {
  HARD_DATA_FMP_FETCH_LIMIT,
  HARD_DATA_RANK_UNIVERSE,
  IR_FANOUT_MAX,
  SCREENING_MAX_CANDIDATES,
} from "@/lib/screening/constants";
import { applyBriefFitToCandidates } from "@/lib/screening/brief-fit";
export const HARD_DATA_AGENT_KIND = "hard_data";
export const HARD_DATA_MODEL = "openai/gpt-4o-mini";
const MAX_UNIVERSE_FOR_LLM = HARD_DATA_RANK_UNIVERSE;
/** Max per-ticker IR steps fan-out after Hard Data (PRD §13 E4). */
export { IR_FANOUT_MAX };
/** Kind strings kept local to avoid circular imports with agent modules. */
const IR_KIND = "ir_business";
const AGGREGATE_IR_KIND = "aggregate_ir_business";
const WEB_KIND = "web_sentiment";
const AGGREGATE_WEB_KIND = "aggregate_web_sentiment";
const TECHNICALS_KIND = "technicals";
const AGGREGATE_TECHNICALS_KIND = "aggregate_technicals";
const PORTFOLIO_CONTEXT_KIND = "portfolio_context";
const RISK_KIND = "risk";
const COMPILER_KIND = "compiler";
const QA_KIND = "qa";
const SHORTLIST_RESEARCH_KIND = "shortlist_research";

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

/**
 * Pick ~N names for the ranking LLM from a wider FMP pool.
 * Prefer actively trading equities (funds already filtered) and a mid-cap bias
 * by taking every other name from the market-cap-sorted list when oversupplied.
 */
export function selectRankUniverse(
  candidates: FmpScreenerCandidate[],
  limit: number = HARD_DATA_RANK_UNIVERSE,
): FmpScreenerCandidate[] {
  if (candidates.length <= limit) return candidates;
  // Market-cap sorted desc from FMP helper. Sample across the band so we don't
  // only feed mega-caps at the top of a wide window.
  const step = Math.max(1, Math.floor(candidates.length / limit));
  const picked: FmpScreenerCandidate[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < candidates.length && picked.length < limit; i += step) {
    const row = candidates[i];
    if (!row || seen.has(row.ticker)) continue;
    seen.add(row.ticker);
    picked.push(row);
  }
  // Fill gaps from the front if step skipped too many.
  for (const row of candidates) {
    if (picked.length >= limit) break;
    if (seen.has(row.ticker)) continue;
    seen.add(row.ticker);
    picked.push(row);
  }
  return picked;
}

export interface RunHardDataAgentOptions {
  brief: ScreeningBrief;
  universe: FmpScreenerCandidate[];
  gatewayHeaders?: Headers;
  /** QA correction hint appended to the user prompt on reruns. */
  qaHint?: string;
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
  const brief: ScreeningBrief = {
    ...opts.brief,
    candidateCount: SCREENING_MAX_CANDIDATES,
  };
  const researchCount = Math.min(IR_FANOUT_MAX, opts.universe.length);
  const universeMap = new Map(opts.universe.map((c) => [c.ticker, c]));

  const fmpSource = {
    label: "FMP company-screener",
    url: "https://financialmodelingprep.com/stable/company-screener",
    asOf: new Date().toISOString().slice(0, 10),
  };

  if (opts.universe.length === 0) {
    return {
      output: hardDataOutputSchema.parse({
        status: "empty",
        universeSize: 0,
        candidates: [],
        deferredTickers: [],
        gaps: ["universe_empty"],
        locale: brief.locale,
        sources: [fmpSource],
      }),
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: null,
    };
  }

  const gatewayConfigured = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!gatewayConfigured) {
    // Fallback: return research universe by market cap so the pipeline still moves forward.
    const fallback = opts.universe.slice(0, researchCount).map(
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
        sources: [fmpSource],
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
    researchCount,
  });

  // Prefetch trefolio MOAT + /analisis cache for ranking context (DB only).
  const universeSlice = opts.universe.slice(0, MAX_UNIVERSE_FOR_LLM);
  let signals = new Map<string, TrefolioTickerSignals>();
  try {
    signals = await loadTrefolioSignalsForTickers(
      universeSlice.map((r) => r.ticker),
    );
  } catch (err) {
    console.warn(
      "[screening/hard-data] trefolio signals prefetch failed",
      err instanceof Error ? err.message : err,
    );
  }
  const universeForLlm = summariseUniverseWithSignals(
    universeSlice,
    signals,
    MAX_UNIVERSE_FOR_LLM,
  );

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    {
      role: "user" as const,
      content: `Universe (JSON, ${opts.universe.length} rows total, showing top ${universeForLlm.length}). Fields moatScorePct/moatVerdict/hasAnalisis/analysisSnippet come from trefolio caches when available:\n${JSON.stringify(universeForLlm)}${opts.qaHint ?? ""}\n\nPlease call submit_hard_data with your ranking.`,
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
            maxItems: IR_FANOUT_MAX,
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
        max_tokens: 3500,
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
      // LLM often returns status=empty even when the FMP universe is usable —
      // treat that as a soft failure and fall back to market-cap ranking.
      if (candidates.length === 0 && opts.universe.length > 0) {
        errorMessage = "llm_returned_empty";
      } else {
        const status = candidates.length === 0 ? "empty" : "ok";
        const built = hardDataOutputSchema.safeParse({
          status,
          universeSize: opts.universe.length,
          candidates: candidates.slice(0, researchCount),
          deferredTickers: coerceStringList(parsed.deferredTickers, 20, 20),
          gaps: coerceStringList(parsed.gaps, 200, 8),
          locale: brief.locale,
          sources: [fmpSource],
        });
        if (built.success) {
          output = built.data;
        } else {
          errorMessage = `parse_failed:${built.error.issues[0]?.message ?? "unknown"}`;
        }
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
    const fallback = opts.universe.slice(0, researchCount).map(
      (c, i): HardDataCandidate => ({
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        industry: c.industry,
        country: c.country,
        marketCapUsd: c.marketCapUsd,
        price: c.price,
        rankScore: 60 - i * 5,
        rankReason:
          errorMessage === "llm_returned_empty"
            ? "Ranked by market cap (model returned no tickers)."
            : "Ranked by market cap (LLM output not usable).",
      }),
    );
    output = hardDataOutputSchema.parse({
      status: fallback.length === 0 ? "empty" : "ok",
      universeSize: opts.universe.length,
      candidates: fallback,
      deferredTickers: [],
      gaps: [errorMessage ?? "llm_no_output"],
      locale: brief.locale,
      sources: [fmpSource],
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
    limit: HARD_DATA_FMP_FETCH_LIMIT,
  });

  // Compact ranking universe: prefer mid-cap names inside the band, drop funds/ETFs.
  const rankUniverse = selectRankUniverse(screenerResult.candidates, HARD_DATA_RANK_UNIVERSE);

  const qaHint = await buildQaHintBlock(
    ctx.runId,
    HARD_DATA_AGENT_KIND,
    null,
  );

  const runnerResult = await runHardDataAgent({
    brief: { ...brief, candidateCount: SCREENING_MAX_CANDIDATES },
    universe: rankUniverse,
    qaHint,
  });

  // Enrich the full research universe with FMP multiples + MOAT /analisis.
  let enrichedOutput = runnerResult.output;
  try {
    if (runnerResult.output.candidates.length > 0) {
      const enriched = await enrichHardDataCandidates(
        runnerResult.output.candidates.slice(0, IR_FANOUT_MAX),
      );
      const withFit = applyBriefFitToCandidates(brief, enriched);
      enrichedOutput = hardDataOutputSchema.parse({
        ...runnerResult.output,
        universeSize: rankUniverse.length,
        candidates: withFit,
        sources: [
          ...(runnerResult.output.sources ?? []),
          {
            label: "FMP ratios-ttm + profile",
            url: "https://financialmodelingprep.com/stable/ratios-ttm",
            asOf: new Date().toISOString().slice(0, 10),
          },
          {
            label: "trefolio MOAT + /analisis cache",
            url: "/tools/moat-evaluation",
            asOf: new Date().toISOString().slice(0, 10),
          },
        ],
      });
    }
  } catch (err) {
    console.warn(
      "[screening/hard-data] candidate enrichment failed",
      err instanceof Error ? err.message : err,
    );
  }

  // Persist output + AI log. Both are best-effort — the step still succeeds
  // even if the sidecar writes fail so we don't block the pipeline on logging.
  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: HARD_DATA_AGENT_KIND,
      outputJson: JSON.stringify(enrichedOutput),
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

  // Fan-out after Hard Data:
  //  - E4 (screening_ir_agent_enabled): N ir_business + aggregate_ir → compiler
  //  - E5–E7 (screening_agents_v2_enabled): also N web_sentiment + aggregates +
  //    portfolio_context + risk → compiler (v2 implies IR for coherence)
  let irFanout = 0;
  let webFanout = 0;
  try {
    const [irFlag, v2Flag, qaFlag, researchFlag] = await Promise.all([
      isFeatureEnabledForUser("screening_ir_agent_enabled", ctx.userId),
      isFeatureEnabledForUser("screening_agents_v2_enabled", ctx.userId),
      isFeatureEnabledForUser("screening_qa_enabled", ctx.userId),
      isFeatureEnabledForUser("screening_tavily_research_enabled", ctx.userId),
    ]);
    const v2Enabled = v2Flag;
    const irEnabled = irFlag || v2Enabled;
    const qaEnabled = qaFlag;
    const researchEnabled = researchFlag;
    const candidates = enrichedOutput.candidates.slice(0, IR_FANOUT_MAX);

    if (irEnabled && candidates.length > 0) {
      const irStepIds = candidates.map(() => crypto.randomUUID());
      const aggregateIrId = crypto.randomUUID();
      const stepsToInsert: Array<{
        id?: string;
        agentKind: string;
        ticker?: string;
        dependsOn?: string[];
      }> = [
        ...candidates.map((c, i) => ({
          id: irStepIds[i],
          agentKind: IR_KIND,
          ticker: c.ticker,
          dependsOn: [] as string[],
        })),
        {
          id: aggregateIrId,
          agentKind: AGGREGATE_IR_KIND,
          dependsOn: irStepIds,
        },
      ];

      let compilerDependsOn = [aggregateIrId];

      if (v2Enabled) {
        const webStepIds = candidates.map(() => crypto.randomUUID());
        const techStepIds = candidates.map(() => crypto.randomUUID());
        const aggregateWebId = crypto.randomUUID();
        const aggregateTechId = crypto.randomUUID();
        const portfolioContextId = crypto.randomUUID();
        const riskId = crypto.randomUUID();
        stepsToInsert.push(
          ...candidates.map((c, i) => ({
            id: webStepIds[i],
            agentKind: WEB_KIND,
            ticker: c.ticker,
            dependsOn: [] as string[],
          })),
          {
            id: aggregateWebId,
            agentKind: AGGREGATE_WEB_KIND,
            dependsOn: webStepIds,
          },
          ...candidates.map((c, i) => ({
            id: techStepIds[i],
            agentKind: TECHNICALS_KIND,
            ticker: c.ticker,
            dependsOn: [] as string[],
          })),
          {
            id: aggregateTechId,
            agentKind: AGGREGATE_TECHNICALS_KIND,
            dependsOn: techStepIds,
          },
          {
            id: portfolioContextId,
            agentKind: PORTFOLIO_CONTEXT_KIND,
            dependsOn: [aggregateIrId, aggregateWebId, aggregateTechId],
          },
          {
            id: riskId,
            agentKind: RISK_KIND,
            dependsOn: [portfolioContextId],
          },
        );
        compilerDependsOn = [riskId];
        webFanout = candidates.length;
      }

      await insertSteps(ctx.runId, stepsToInsert);
      const compilerStep = await findStepByAgentKind(
        ctx.runId,
        COMPILER_KIND,
      );
      if (compilerStep && compilerStep.status === "pending") {
        await updateStepDependsOn(compilerStep.id, compilerDependsOn);
      }
      // QA becomes the new terminal step when the flag is on. When Tavily
      // Research is on, shortlist_research runs after Compiler and QA depends
      // on it so report cards can use deep-dive enrichment.
      if (compilerStep) {
        if (researchEnabled) {
          const shortlistId = crypto.randomUUID();
          await insertSteps(ctx.runId, [
            {
              id: shortlistId,
              agentKind: SHORTLIST_RESEARCH_KIND,
              dependsOn: [compilerStep.id],
            },
            ...(qaEnabled
              ? [
                  {
                    agentKind: QA_KIND,
                    dependsOn: [shortlistId],
                  },
                ]
              : []),
          ]);
        } else if (qaEnabled) {
          await insertSteps(ctx.runId, [
            {
              agentKind: QA_KIND,
              dependsOn: [compilerStep.id],
            },
          ]);
        }
      }
      irFanout = candidates.length;
    } else if (researchEnabled || qaEnabled) {
      // No IR/Web fan-out but research/QA on: attach after the compiler.
      const compilerStep = await findStepByAgentKind(ctx.runId, COMPILER_KIND);
      if (compilerStep) {
        if (researchEnabled) {
          const shortlistId = crypto.randomUUID();
          await insertSteps(ctx.runId, [
            {
              id: shortlistId,
              agentKind: SHORTLIST_RESEARCH_KIND,
              dependsOn: [compilerStep.id],
            },
            ...(qaEnabled
              ? [{ agentKind: QA_KIND, dependsOn: [shortlistId] }]
              : []),
          ]);
        } else if (qaEnabled) {
          await insertSteps(ctx.runId, [
            {
              agentKind: QA_KIND,
              dependsOn: [compilerStep.id],
            },
          ]);
        }
      }
    }
  } catch (err) {
    console.error(
      "[screening/hard-data] research fan-out failed",
      err instanceof Error ? err.message : err,
    );
  }

  const totalDuration = Date.now() - started;
  return {
    status: "ok",
    payload: {
      universeSize: screenerResult.candidates.length,
      candidateCount: enrichedOutput.candidates.length,
      fmpErrors: screenerResult.errors.length,
      llmError: runnerResult.errorMessage,
      irFanout,
      webFanout,
      totalDurationMs: totalDuration,
    },
  };
};

registerHandler(HARD_DATA_AGENT_KIND, runHardDataStep);
