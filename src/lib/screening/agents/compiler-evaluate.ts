import { resolveGatewayApiKey } from "@/lib/ai/gateway";
import { fetchScreeningGatewayChatCompletions as fetchGatewayChatCompletions } from "@/lib/screening/gateway";
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
import { buildCompilerEvaluatePrompt } from "@/lib/screening/prompts/compiler-evaluate";
import { resolveScreeningGatewayModel } from "@/lib/screening/resolve-model";
import {
  aggregateIrBusinessOutputSchema,
  aggregateTechnicalsOutputSchema,
  aggregateWebSentimentOutputSchema,
  artOfInvestingEvaluationSchema,
  compilerEvaluateOutputSchema,
  compilerReportDraftSchema,
  hardDataOutputSchema,
  portfolioContextOutputSchema,
  riskOutputSchema,
  screeningBriefSchema,
  shortlistResearchOutputSchema,
  type AggregateIrBusinessOutput,
  type AggregateTechnicalsOutput,
  type AggregateWebSentimentOutput,
  type ArtOfInvestingEvaluation,
  type CompilerEvaluateOutput,
  type CompilerReportDraft,
  type HardDataCandidate,
  type HardDataOutput,
  type PortfolioContextOutput,
  type RiskOutput,
  type ScreeningBrief,
  type ShortlistResearchOutput,
} from "@/lib/screening/schemas";

export const COMPILER_EVALUATE_AGENT_KIND = "compiler_evaluate";

const DEFAULT_DISCLAIMER =
  "This analysis is informational and does not constitute investment advice.";
const DEFAULT_DISCLAIMER_ES =
  "Este análisis es informativo y no constituye asesoramiento de inversión.";

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

function parseDraft(json: string): CompilerReportDraft | null {
  try {
    const res = compilerReportDraftSchema.safeParse(JSON.parse(json));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

function fallbackEvaluation(
  ticker: string,
  hd: HardDataCandidate | undefined,
  locale: string,
): ArtOfInvestingEvaluation {
  const isEs = locale.startsWith("es");
  const gaps = ["LLM evaluation unavailable — using Hard Data fallback."];
  if (hd?.thinLiquidity) gaps.push("thin_liquidity");
  if (hd?.severeDilution) gaps.push("severe_dilution");
  return {
    ticker,
    filterVerdict: hd?.thinLiquidity || hd?.severeDilution ? "DESCARTE" : "PASA",
    filterReason: hd?.thinLiquidity
      ? isEs
        ? "Liquidez insuficiente según Hard Data."
        : "Insufficient liquidity per Hard Data."
      : hd?.severeDilution
        ? isEs
          ? "Dilución severa de acciones según Hard Data."
          : "Severe share dilution per Hard Data."
        : isEs
          ? "Pasa filtros cuantitativos básicos; evaluación cualitativa incompleta."
          : "Passes basic quantitative filters; qualitative evaluation incomplete.",
    businessThreeSentences:
      hd?.analysisSummary?.slice(0, 900) ||
      (isEs
        ? "DATO NO DISPONIBLE — sin descripción de negocio enriquecida."
        : "DATO NO DISPONIBLE — no enriched business description."),
    companyType: "unclear",
    moat:
      hd?.moatScore != null
        ? `MOAT score ${hd.moatScore}% (${hd.moatVerdict ?? "n/a"}). Narrative: DATO NO DISPONIBLE.`
        : "DATO NO DISPONIBLE",
    management: "DATO NO DISPONIBLE",
    financials: [
      hd?.fwdPe != null ? `Fwd P/E ${hd.fwdPe.toFixed(1)}x` : null,
      hd?.ndEbitda != null ? `ND/EBITDA ${hd.ndEbitda.toFixed(2)}x` : null,
      hd?.roicPct != null ? `ROIC ${hd.roicPct.toFixed(1)}%` : null,
      hd?.fcfYield != null ? `FCF yield ${(hd.fcfYield * 100).toFixed(1)}%` : null,
      hd?.annualSeries?.length
        ? `${hd.annualSeries.length}y annual series present`
        : "annualSeries: DATO NO DISPONIBLE",
    ]
      .filter(Boolean)
      .join("; ") || "DATO NO DISPONIBLE",
    growth: hd?.growthNote ?? "DATO NO DISPONIBLE",
    valuation:
      hd?.histPeAvg != null
        ? `Own hist PE avg ${hd.histPeAvg.toFixed(1)}x (${hd.histPeYears ?? "?"}y). Peer PE: DATO NO DISPONIBLE.`
        : "DATO NO DISPONIBLE",
    catalysts: "DATO NO DISPONIBLE",
    risksAndPremortem: "DATO NO DISPONIBLE",
    thesisInvalidation: "DATO NO DISPONIBLE",
    informationGaps: gaps,
    conviction: "baja",
    convictionReason: isEs
      ? "Fallback sin evaluación LLM completa."
      : "Fallback without full LLM evaluation.",
    disclaimer: isEs ? DEFAULT_DISCLAIMER_ES : DEFAULT_DISCLAIMER,
  };
}

function coerceEvaluations(
  raw: unknown,
  tickers: string[],
  hardByTicker: Map<string, HardDataCandidate>,
  locale: string,
): ArtOfInvestingEvaluation[] {
  const known = new Set(tickers.map((t) => t.toUpperCase()));
  const list = Array.isArray(raw) ? raw : [];
  const out: ArtOfInvestingEvaluation[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const ticker = String(row.ticker ?? "").toUpperCase().trim();
    if (!ticker || seen.has(ticker) || !known.has(ticker)) continue;
    const parsed = artOfInvestingEvaluationSchema.safeParse({
      ...row,
      ticker,
      filterVerdict:
        String(row.filterVerdict ?? "").toUpperCase() === "DESCARTE"
          ? "DESCARTE"
          : "PASA",
      informationGaps: Array.isArray(row.informationGaps)
        ? row.informationGaps
        : [],
      conviction: ["alta", "media", "baja"].includes(
        String(row.conviction ?? ""),
      )
        ? row.conviction
        : "media",
      disclaimer:
        String(row.disclaimer ?? "").trim() ||
        (locale.startsWith("es") ? DEFAULT_DISCLAIMER_ES : DEFAULT_DISCLAIMER),
    });
    if (!parsed.success) continue;
    seen.add(ticker);
    out.push(parsed.data);
  }
  for (const t of tickers) {
    const up = t.toUpperCase();
    if (seen.has(up)) continue;
    out.push(fallbackEvaluation(up, hardByTicker.get(up), locale));
  }
  return out.slice(0, 5);
}

export interface RunCompilerEvaluateOptions {
  brief: ScreeningBrief;
  hardData: HardDataOutput;
  draft: CompilerReportDraft;
  irAggregate?: AggregateIrBusinessOutput | null;
  webAggregate?: AggregateWebSentimentOutput | null;
  technicalsAggregate?: AggregateTechnicalsOutput | null;
  portfolioContext?: PortfolioContextOutput | null;
  risk?: RiskOutput | null;
  shortlistResearch?: ShortlistResearchOutput | null;
  gatewayHeaders?: Headers;
}

export interface RunCompilerEvaluateResult {
  output: CompilerEvaluateOutput;
  latencyMs: number;
  rawResponse: string;
  errorMessage: string | null;
  tokensInput: number;
  tokensOutput: number;
  model: string;
}

export async function runCompilerEvaluateAgent(
  opts: RunCompilerEvaluateOptions,
): Promise<RunCompilerEvaluateResult> {
  const startedAt = Date.now();
  const locale = opts.brief.locale;
  const tickers = opts.draft.candidateBullets.map((b) => b.ticker.toUpperCase());
  const hardByTicker = new Map(
    opts.hardData.candidates.map((c) => [c.ticker.toUpperCase(), c]),
  );

  const emptyOutput = (): CompilerEvaluateOutput => ({
    evaluations: tickers.map((t) =>
      fallbackEvaluation(t, hardByTicker.get(t), locale),
    ),
    locale,
    generatedAt: new Date().toISOString(),
  });

  const model = await resolveScreeningGatewayModel(
    "screening_compiler_evaluate",
  );
  const gatewayConfigured = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!gatewayConfigured || tickers.length === 0) {
    return {
      output: emptyOutput(),
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: tickers.length === 0 ? "empty_shortlist" : "gateway_not_configured",
      tokensInput: 0,
      tokensOutput: 0,
      model,
    };
  }

  const systemPrompt = buildCompilerEvaluatePrompt({
    brief: opts.brief,
    hardData: opts.hardData,
    draft: opts.draft,
    irAggregate: opts.irAggregate ?? null,
    webAggregate: opts.webAggregate ?? null,
    technicalsAggregate: opts.technicalsAggregate ?? null,
    portfolioContext: opts.portfolioContext ?? null,
    risk: opts.risk ?? null,
    shortlistResearch: opts.shortlistResearch ?? null,
    locale,
  });

  const shortlistHard = opts.hardData.candidates.filter((c) =>
    tickers.includes(c.ticker.toUpperCase()),
  );

  const evidence = {
    shortlist: opts.draft.candidateBullets,
    hardData: shortlistHard.map((c) => ({
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
      industry: c.industry,
      country: c.country,
      marketCapUsd: c.marketCapUsd,
      price: c.price,
      fwdPe: c.fwdPe,
      ownHistPe: c.ownHistPe,
      histPeAvg: c.histPeAvg,
      histPeYears: c.histPeYears,
      normalizedPe: c.normalizedPe,
      earningsQualitySuspect: c.earningsQualitySuspect,
      evEbitda: c.evEbitda,
      evEbit: c.evEbit,
      ndEbitda: c.ndEbitda,
      fcfYield: c.fcfYield,
      interestCoverage: c.interestCoverage,
      roicPct: c.roicPct,
      peerPe: c.peerPe,
      dividendYield: c.dividendYield,
      netCash: c.netCash,
      buyback: c.buyback,
      severeDilution: c.severeDilution,
      thinLiquidity: c.thinLiquidity,
      avgVolume: c.avgVolume,
      moatScore: c.moatScore,
      moatVerdict: c.moatVerdict,
      growthNote: c.growthNote,
      revenueGrowthHistoryPct: c.revenueGrowthHistoryPct,
      annualSeries: c.annualSeries,
      analysisSummary: c.analysisSummary,
      upsidePct: c.upsidePct,
      targetPrice: c.targetPrice,
    })),
    ir: (opts.irAggregate?.tickers ?? [])
      .filter((t) => tickers.includes(t.ticker.toUpperCase()))
      .map((t) => ({
        ticker: t.ticker,
        businessOneLiner: t.businessOneLiner,
        businessThreeSentences: t.businessThreeSentences,
        companyType: t.companyType,
        revenueMix: t.revenueMix,
        recurringVsTransactional: t.recurringVsTransactional,
        industryStructure: t.industryStructure,
        moatHypothesis: t.moatHypothesis,
        capitalAllocationNotes: t.capitalAllocationNotes,
        guidanceTrackRecord: t.guidanceTrackRecord,
        eliminationFlags: t.eliminationFlags,
        guidance: t.guidance,
        catalysts: t.catalysts,
        segments: t.segments,
        gaps: t.gaps,
        confidence: t.confidence,
      })),
    web: (opts.webAggregate?.tickers ?? [])
      .filter((t) => tickers.includes(t.ticker.toUpperCase()))
      .map((t) => ({
        ticker: t.ticker,
        signals: t.signals,
        insiderSummary: t.insiderSummary,
        sentimentSummary: t.sentimentSummary,
        gaps: t.gaps,
      })),
    technicals: (opts.technicalsAggregate?.tickers ?? []).filter((t) =>
      tickers.includes(t.ticker.toUpperCase()),
    ),
    portfolio: opts.portfolioContext?.perCandidate.filter((c) =>
      tickers.includes(c.ticker.toUpperCase()),
    ),
    risk: opts.risk?.perCandidate.filter((c) =>
      tickers.includes(c.ticker.toUpperCase()),
    ),
    research: (opts.shortlistResearch?.tickers ?? []).filter((t) =>
      tickers.includes(t.ticker.toUpperCase()),
    ),
  };

  const submitTool = {
    type: "function" as const,
    function: {
      name: "submit_evaluations",
      description:
        "Submit trefolio framework evaluations for each shortlist ticker.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["evaluations", "locale"],
        properties: {
          locale: { type: "string" },
          evaluations: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "ticker",
                "filterVerdict",
                "filterReason",
                "businessThreeSentences",
                "companyType",
                "moat",
                "management",
                "financials",
                "growth",
                "valuation",
                "catalysts",
                "risksAndPremortem",
                "thesisInvalidation",
                "informationGaps",
                "conviction",
                "convictionReason",
                "disclaimer",
              ],
              properties: {
                ticker: { type: "string" },
                filterVerdict: { type: "string", enum: ["PASA", "DESCARTE"] },
                filterReason: { type: "string" },
                businessThreeSentences: { type: "string" },
                companyType: { type: "string" },
                moat: { type: "string" },
                management: { type: "string" },
                financials: { type: "string" },
                growth: { type: "string" },
                valuation: { type: "string" },
                catalysts: { type: "string" },
                risksAndPremortem: { type: "string" },
                thesisInvalidation: { type: "string" },
                informationGaps: { type: "array", items: { type: "string" } },
                conviction: {
                  type: "string",
                  enum: ["alta", "media", "baja"],
                },
                convictionReason: { type: "string" },
                disclaimer: { type: "string" },
              },
            },
          },
        },
      },
    },
  };

  let rawResponse = "";
  let errorMessage: string | null = null;
  let tokensInput = 0;
  let tokensOutput = 0;
  let evaluations = tickers.map((t) =>
    fallbackEvaluation(t, hardByTicker.get(t), locale),
  );

  try {
    const res = await fetchGatewayChatCompletions(
      {
        model,
        stream: false,
        temperature: 0.25,
        max_tokens: 8000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `EVIDENCE_JSON:\n${JSON.stringify(evidence)}\n\nPlease call submit_evaluations.`,
          },
        ],
        tools: [submitTool],
        tool_choice: {
          type: "function",
          function: { name: "submit_evaluations" },
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
          };
        }>;
      };
      const { extractLlmUsage } = await import("@/lib/screening/llm-usage");
      const usage = extractLlmUsage(data);
      tokensInput = usage.tokensInput;
      tokensOutput = usage.tokensOutput;
      const argsRaw =
        data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "";
      rawResponse = argsRaw.slice(0, 20_000);
      let parsedArgs: unknown = null;
      try {
        parsedArgs = JSON.parse(argsRaw);
      } catch {
        parsedArgs = null;
      }
      const argsObj =
        parsedArgs && typeof parsedArgs === "object"
          ? (parsedArgs as Record<string, unknown>)
          : {};
      evaluations = coerceEvaluations(
        argsObj.evaluations,
        tickers,
        hardByTicker,
        locale,
      );
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "evaluate_error";
  }

  const output: CompilerEvaluateOutput = {
    evaluations,
    locale,
    generatedAt: new Date().toISOString(),
  };
  const validated = compilerEvaluateOutputSchema.safeParse(output);
  return {
    output: validated.success ? validated.data : output,
    latencyMs: Date.now() - startedAt,
    rawResponse,
    errorMessage,
    tokensInput,
    tokensOutput,
    model,
  };
}

export const runCompilerEvaluateStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const enabled = await isFeatureEnabledForUser(
    "screening_estebaranz_eval_enabled",
    ctx.userId,
  );
  if (!enabled) {
    const empty: CompilerEvaluateOutput = {
      evaluations: [],
      locale: "en",
      generatedAt: new Date().toISOString(),
    };
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: COMPILER_EVALUATE_AGENT_KIND,
      outputJson: JSON.stringify(empty),
      latencyMs: 0,
    });
    return { status: "ok", payload: { skipped: true, reason: "flag_off" } };
  }

  const brief = parseBrief(ctx.briefJson);
  if (!brief) {
    return { status: "error", errorMessage: "invalid_brief", fatal: true };
  }

  const hardRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    "hard_data",
  );
  const compilerRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    "compiler",
  );
  if (!hardRow || !compilerRow) {
    return {
      status: "error",
      errorMessage: "missing_upstream_outputs",
      fatal: true,
    };
  }
  const hardData = parseHardData(hardRow.outputJson);
  const draft = parseDraft(compilerRow.outputJson);
  if (!hardData || !draft) {
    return {
      status: "error",
      errorMessage: "invalid_upstream_outputs",
      fatal: true,
    };
  }

  const [irRow, webRow, techRow, pcRow, riskRow, researchRow] =
    await Promise.all([
      getLatestScreeningAgentOutputUnscoped(ctx.runId, "aggregate_ir_business"),
      getLatestScreeningAgentOutputUnscoped(
        ctx.runId,
        "aggregate_web_sentiment",
      ),
      getLatestScreeningAgentOutputUnscoped(ctx.runId, "aggregate_technicals"),
      getLatestScreeningAgentOutputUnscoped(ctx.runId, "portfolio_context"),
      getLatestScreeningAgentOutputUnscoped(ctx.runId, "risk"),
      getLatestScreeningAgentOutputUnscoped(ctx.runId, "shortlist_research"),
    ]);

  const irAggregate = irRow
    ? aggregateIrBusinessOutputSchema.safeParse(JSON.parse(irRow.outputJson))
    : null;
  const webAggregate = webRow
    ? aggregateWebSentimentOutputSchema.safeParse(JSON.parse(webRow.outputJson))
    : null;
  const technicalsAggregate = techRow
    ? aggregateTechnicalsOutputSchema.safeParse(JSON.parse(techRow.outputJson))
    : null;
  const portfolioContext = pcRow
    ? portfolioContextOutputSchema.safeParse(JSON.parse(pcRow.outputJson))
    : null;
  const risk = riskRow
    ? riskOutputSchema.safeParse(JSON.parse(riskRow.outputJson))
    : null;
  const shortlistResearch = researchRow
    ? shortlistResearchOutputSchema.safeParse(
        JSON.parse(researchRow.outputJson),
      )
    : null;

  const result = await runCompilerEvaluateAgent({
    brief,
    hardData,
    draft,
    irAggregate: irAggregate?.success ? irAggregate.data : null,
    webAggregate: webAggregate?.success ? webAggregate.data : null,
    technicalsAggregate: technicalsAggregate?.success
      ? technicalsAggregate.data
      : null,
    portfolioContext: portfolioContext?.success ? portfolioContext.data : null,
    risk: risk?.success ? risk.data : null,
    shortlistResearch: shortlistResearch?.success
      ? shortlistResearch.data
      : null,
  });

  const { accrueScreeningLlmCost } = await import("@/lib/screening/cost");
  await accrueScreeningLlmCost({
    runId: ctx.runId,
    model: result.model,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
  });

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: COMPILER_EVALUATE_AGENT_KIND,
      outputJson: JSON.stringify(result.output),
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    console.error(
      "[screening/compiler-evaluate] persist failed",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await insertAiLog({
      userId: ctx.userId,
      source: "screening_compiler_evaluate",
      model: result.model,
      promptSystem: "compiler_evaluate_system_prompt",
      promptUser: `evaluations=${result.output.evaluations.length}`,
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

  return {
    status: "ok",
    payload: {
      evaluations: result.output.evaluations.length,
      llmError: result.errorMessage,
    },
  };
};

registerHandler(COMPILER_EVALUATE_AGENT_KIND, runCompilerEvaluateStep);
