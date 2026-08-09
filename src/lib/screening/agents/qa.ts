import {
  fetchGatewayChatCompletions,
  resolveGatewayApiKey,
} from "@/lib/ai/gateway";
import {
  countQaRoundsForRun,
  getLatestScreeningAgentOutputUnscoped,
  getScreeningRunUnscoped,
  insertAiLog,
  insertQaRoundIssues,
  insertScreeningAgentOutput,
  insertSteps,
  type ScreeningAgentOutputRow,
} from "@/lib/db";
import { MAX_QA_ROUNDS, normalizeQaAgentKind, planReruns } from "@/lib/screening/qa/rerun";
import { recordQaRound } from "@/lib/screening/metrics";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import { runDeterministicQa } from "@/lib/screening/qa/deterministic";
import { composeScreeningReport } from "@/lib/screening/pipeline/build-report";
import { buildQaQualitativePrompt } from "@/lib/screening/prompts/qa-qualitative";
import {
  aggregateIrBusinessOutputSchema,
  aggregateTechnicalsOutputSchema,
  aggregateWebSentimentOutputSchema,
  compilerReportDraftSchema,
  hardDataOutputSchema,
  portfolioContextOutputSchema,
  qaLlmOutputSchema,
  riskOutputSchema,
  type AggregateIrBusinessOutput,
  type AggregateTechnicalsOutput,
  type AggregateWebSentimentOutput,
  type CompilerReportDraft,
  type HardDataOutput,
  type PortfolioContextOutput,
  type QaIssue,
  type QaOutput,
  type RiskOutput,
  type ScreeningReport,
} from "@/lib/screening/schemas";
import { resolveScreeningGatewayModel } from "@/lib/screening/resolve-model";

export const QA_AGENT_KIND = "qa";
/** @deprecated Prefer resolveScreeningGatewayModel("screening_qa"). */
export const QA_MODEL = "openai/gpt-4.1";


function safeParse<T>(
  row: ScreeningAgentOutputRow | null,
  schema: { safeParse: (raw: unknown) => { success: boolean; data?: T } },
): T | null {
  if (!row || !row.outputJson) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(row.outputJson));
    return parsed.success && parsed.data ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * QA (Agent 6) — hybrid verification (Layer A deterministic + Layer B LLM).
 *
 * Never fatal for the step itself: even with blocking issues the step completes
 * `ok` so the orchestrator can insert a directed-retry DAG. When
 * `screening_qa_enabled` is on, `reportReady` requires a pass /
 * pass_with_degradation verdict before the report API returns 200.
 */
export const runQaStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const startedAt = Date.now();

  const priorRounds = await countQaRoundsForRun(ctx.runId);
  const roundNumber = Math.min(3, priorRounds + 1);

  const [
    run,
    hardDataRow,
    compilerRow,
    irRow,
    webRow,
    techRow,
    pcRow,
    riskRow,
    shortlistResearchRow,
    compilerEvaluateRow,
  ] = await Promise.all([
    getScreeningRunUnscoped(ctx.runId),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, "hard_data"),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, "compiler"),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, "aggregate_ir_business"),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, "aggregate_web_sentiment"),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, "aggregate_technicals"),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, "portfolio_context"),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, "risk"),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, "shortlist_research"),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, "compiler_evaluate"),
  ]);

  const hardData = safeParse<HardDataOutput>(hardDataRow, hardDataOutputSchema);
  const compilerDraft = safeParse<CompilerReportDraft>(
    compilerRow,
    compilerReportDraftSchema,
  );
  const irAggregate = safeParse<AggregateIrBusinessOutput>(
    irRow,
    aggregateIrBusinessOutputSchema,
  );
  const webAggregate = safeParse<AggregateWebSentimentOutput>(
    webRow,
    aggregateWebSentimentOutputSchema,
  );
  const technicalsAggregate = safeParse<AggregateTechnicalsOutput>(
    techRow,
    aggregateTechnicalsOutputSchema,
  );
  const portfolioContext = safeParse<PortfolioContextOutput>(
    pcRow,
    portfolioContextOutputSchema,
  );
  const risk = safeParse<RiskOutput>(riskRow, riskOutputSchema);

  let report: ScreeningReport | null = null;
  if (run && hardDataRow && compilerRow) {
    try {
      report = composeScreeningReport({
        run,
        hardDataRow,
        compilerRow,
        irAggregateRow: irRow ?? null,
        webAggregateRow: webRow ?? null,
        technicalsAggregateRow: techRow ?? null,
        portfolioContextRow: pcRow ?? null,
        riskRow: riskRow ?? null,
        shortlistResearchRow: shortlistResearchRow ?? null,
        compilerEvaluateRow: compilerEvaluateRow ?? null,
        pendingAgentKinds: [],
      });
    } catch (err) {
      console.warn(
        "[screening/qa] compose report failed",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const deterministic: QaOutput = runDeterministicQa(
    {
      runId: ctx.runId,
      hardData,
      irAggregate,
      webAggregate,
      technicalsAggregate,
      portfolioContext,
      risk,
      compilerDraft,
      report,
    },
    { roundNumber },
  );

  // Layer B (LLM qualitative judge). Only invoked when Layer A already passed
  // OR produced fewer than 3 blocking issues — the "yellow zone" where the
  // qualitative model has room to add value. Transport failures never demote
  // Layer A's verdict.
  const layerAIssues = deterministic.issues;
  const blockingCountA = layerAIssues.filter((i) => i.blocking).length;
  const inYellowZone =
    deterministic.verdict === "pass" || blockingCountA <= 3;

  let layerBIssues: QaIssue[] = [];
  let layerBRaw = "";
  let layerBError: string | null = null;
  let layerBDurationMs = 0;
  let layerBModel = QA_MODEL;
  if (inYellowZone && report && compilerDraft) {
    const before = Date.now();
    const gatewayReady = await resolveGatewayApiKey();
    if (gatewayReady) {
      const runResult = await callQaQualitativeJudge({
        report,
        layerAIssues,
        rawContext: buildRawContextForQa({
          hardData,
          irAggregate,
          webAggregate,
          technicalsAggregate,
          portfolioContext,
          risk,
          compilerDraft,
        }),
      });
      layerBIssues = runResult.issues;
      layerBRaw = runResult.rawResponse;
      layerBError = runResult.errorMessage;
      layerBModel = runResult.model;
    } else {
      layerBError = "gateway_not_configured";
    }
    layerBDurationMs = Date.now() - before;
  }

  // Merge Layer A + Layer B. Layer B never demotes a Layer A blocking issue,
  // but it can add new ones (and its own blocking issues can flip verdict).
  const mergedIssues = [...layerAIssues, ...layerBIssues].slice(0, 50);
  const hasBlocking = mergedIssues.some((i) => i.blocking);
  const flaggedAgentKindsSet = new Set<string>(
    deterministic.flaggedAgentKinds,
  );
  for (const i of layerBIssues) {
    if (i.blocking && i.agentKind) flaggedAgentKindsSet.add(i.agentKind);
  }

  // Directed retry: when we fail AND we have rounds left, insert a rerun DAG.
  // When we fail on the last round, degrade the stubbornly-flagged tickers.
  let finalVerdict: QaOutput["verdict"] = hasBlocking ? "fail" : "pass";
  let degradedTickers: string[] = [];
  if (hasBlocking) {
    const plan = planReruns({
      qaOutput: {
        verdict: "fail",
        roundNumber,
        issues: mergedIssues,
        flaggedAgentKinds: [...flaggedAgentKindsSet],
        degradedTickers: [],
        generatedAt: new Date().toISOString(),
      },
      priorRounds: roundNumber,
    });
    if (plan.canRun) {
      try {
        await insertSteps(ctx.runId, plan.steps);
      } catch (err) {
        console.error(
          "[screening/qa] rerun insertSteps failed",
          err instanceof Error ? err.message : err,
        );
      }
    } else if (roundNumber >= MAX_QA_ROUNDS) {
      // Round cap reached — mark degraded and let the report route drop them.
      degradedTickers = plan.degradedTickers;
      finalVerdict = "pass_with_degradation";
    }
  }

  const qaOutput: QaOutput = {
    verdict: finalVerdict,
    roundNumber,
    issues: mergedIssues,
    flaggedAgentKinds: Array.from(flaggedAgentKindsSet),
    degradedTickers,
    generatedAt: new Date().toISOString(),
  };

  // Persist per-issue rows to screening_qa_rounds (audit trail).
  try {
    await insertQaRoundIssues({
      runId: ctx.runId,
      roundNumber,
      verdict: qaOutput.verdict,
      flaggedAgentKinds: qaOutput.flaggedAgentKinds,
      degradedTickers: qaOutput.degradedTickers,
      issues: qaOutput.issues.map((i) => ({
        issueType: i.issueType,
        ruleId: i.ruleId,
        agentKind: i.agentKind,
        ticker: i.ticker,
        claimPath: i.claimPath,
        expectedValue: i.expectedValue,
        actualValue: i.actualValue,
        issueSummary: i.summary,
        blocking: i.blocking,
      })),
    });
  } catch (err) {
    console.error(
      "[screening/qa] persist qa_rounds failed",
      err instanceof Error ? err.message : err,
    );
  }

  // Mirror the summary to screening_agent_outputs so compose-time reads see
  // one row per QA round via the same latest-output-per-kind pattern.
  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: QA_AGENT_KIND,
      outputJson: JSON.stringify(qaOutput),
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error(
      "[screening/qa] persist output failed",
      err instanceof Error ? err.message : err,
    );
  }

  if (layerBDurationMs > 0) {
    try {
      await insertAiLog({
        userId: ctx.userId,
        source: "screening_qa",
        model: layerBModel,
        promptSystem: "qa_qualitative_system_prompt",
        promptUser: `round=${roundNumber} layerA_issues=${layerAIssues.length}`,
        response: layerBRaw.slice(0, 20_000),
        durationMs: layerBDurationMs,
        status: layerBError ? "error" : "success",
        errorMessage: layerBError?.slice(0, 2000) ?? "",
      });
    } catch {
      // best-effort
    }
  }

  recordQaRound({
    verdict: qaOutput.verdict,
    issues: qaOutput.issues,
  });

  return {
    status: "ok",
    payload: {
      verdict: qaOutput.verdict,
      roundNumber,
      issueCount: qaOutput.issues.length,
      blockingIssueCount: qaOutput.issues.filter((i) => i.blocking).length,
      layerAIssues: layerAIssues.length,
      layerBIssues: layerBIssues.length,
      layerBError,
      flaggedAgentKinds: qaOutput.flaggedAgentKinds,
      degradedTickers: qaOutput.degradedTickers,
      rerunsScheduled: hasBlocking && roundNumber < MAX_QA_ROUNDS,
    },
  };
};

async function callQaQualitativeJudge(input: {
  report: ScreeningReport;
  layerAIssues: QaIssue[];
  rawContext: string;
}): Promise<{
  issues: QaIssue[];
  rawResponse: string;
  errorMessage: string | null;
  model: string;
}> {
  const systemPrompt = buildQaQualitativePrompt({
    report: input.report,
    layerAIssues: input.layerAIssues,
    rawContext: input.rawContext,
    locale: input.report.locale,
  });
  const submitTool = {
    type: "function" as const,
    function: {
      name: "submit_qa_verdict",
      description: "Submit the QA qualitative verdict + additional issues.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["verdict", "issues"],
        properties: {
          verdict: { type: "string", enum: ["pass", "fail"] },
          issues: {
            type: "array",
            maxItems: 15,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["issueType", "summary"],
              properties: {
                issueType: {
                  type: "string",
                  enum: [
                    "quant_mismatch",
                    "unconfirmed_source",
                    "cross_agent_inconsistency",
                    "rule_violation",
                    "other",
                  ],
                },
                ruleId: {
                  type: ["string", "null"],
                  enum: [
                    "R1",
                    "R2",
                    "R3",
                    "R4",
                    "R5",
                    "R6",
                    "R7",
                    "R8",
                    "R9",
                    "R10",
                    null,
                  ],
                },
                agentKind: { type: ["string", "null"] },
                ticker: { type: ["string", "null"] },
                claimPath: { type: ["string", "null"] },
                expectedValue: { type: ["string", "null"] },
                actualValue: { type: ["string", "null"] },
                summary: { type: "string" },
                blocking: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  };

  const compactReport = {
    executiveSummary: input.report.executiveSummary,
    cards: input.report.cards.map((c) => ({
      ticker: c.ticker,
      sector: c.sector,
      country: c.country,
      thesis: c.thesis,
      priorityReason: c.priorityReason,
      guidance: c.guidance ?? null,
      catalystsList: c.catalystsList,
      multiples: c.multiples,
      insiderBias: c.insiderBias,
      citedFields: c.citedFields,
    })),
  };

  let rawResponse = "";
  let errorMessage: string | null = null;
  const model = await resolveScreeningGatewayModel("screening_qa");
  try {
    const res = await fetchGatewayChatCompletions({
      model,
      stream: false,
      max_tokens: 1500,
      temperature: 0.15,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Composed report (JSON):\n${JSON.stringify(compactReport)}\n\nRaw upstream context (JSON):\n${input.rawContext}\n\nPlease call submit_qa_verdict.`,
        },
      ],
      tools: [submitTool],
      tool_choice: { type: "function", function: { name: "submit_qa_verdict" } },
    });
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
      const call = data.choices?.[0]?.message?.tool_calls?.[0];
      rawResponse =
        call?.function?.arguments ?? data.choices?.[0]?.message?.content ?? "";
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "gateway_error";
  }

  if (errorMessage || !rawResponse) {
    return {
      issues: [],
      rawResponse,
      errorMessage: errorMessage ?? "no_response",
      model,
    };
  }

  let parsedIssues: QaIssue[] = [];
  try {
    const parsed = qaLlmOutputSchema.safeParse(JSON.parse(rawResponse));
    if (parsed.success) {
      parsedIssues = parsed.data.issues.map((i) => ({
        issueType: i.issueType,
        ruleId: i.ruleId ?? null,
        agentKind: normalizeQaAgentKind(i.agentKind ?? null),
        ticker: i.ticker ?? null,
        claimPath: i.claimPath ?? null,
        expectedValue: i.expectedValue ?? null,
        actualValue: i.actualValue ?? null,
        summary: i.summary,
        blocking: i.blocking !== false,
      }));
    } else {
      errorMessage = `parse_failed:${parsed.error.issues[0]?.message ?? "unknown"}`;
    }
  } catch (err) {
    errorMessage = `json_parse:${err instanceof Error ? err.message : "unknown"}`;
  }

  return { issues: parsedIssues, rawResponse, errorMessage, model };
}

function buildRawContextForQa(inputs: {
  hardData: HardDataOutput | null;
  irAggregate: AggregateIrBusinessOutput | null;
  webAggregate: AggregateWebSentimentOutput | null;
  technicalsAggregate: AggregateTechnicalsOutput | null;
  portfolioContext: PortfolioContextOutput | null;
  risk: RiskOutput | null;
  compilerDraft: CompilerReportDraft;
}): string {
  const compact = {
    hardData: inputs.hardData
      ? {
          status: inputs.hardData.status,
          candidates: inputs.hardData.candidates.slice(0, 8).map((c) => ({
            ticker: c.ticker,
            sector: c.sector,
            country: c.country,
            fwdPe: c.fwdPe,
            evEbitda: c.evEbitda,
            ndEbitda: c.ndEbitda,
            targetPrice: c.targetPrice,
            revenueGrowthHistoryPct: c.revenueGrowthHistoryPct,
          })),
        }
      : null,
    ir: inputs.irAggregate?.tickers.slice(0, 8).map((t) => ({
      ticker: t.ticker,
      guidance: t.guidance,
      catalysts: t.catalysts.slice(0, 4),
      contradictionWithHardData: t.contradictionWithHardData,
    })),
    web: inputs.webAggregate?.tickers.slice(0, 8).map((t) => ({
      ticker: t.ticker,
      insiderSummary: t.insiderSummary,
      signals: t.signals.slice(0, 6),
      sentimentSummary: t.sentimentSummary,
    })),
    portfolioContext: inputs.portfolioContext,
    risk: inputs.risk,
  };
  return JSON.stringify(compact).slice(0, 12_000);
}

registerHandler(QA_AGENT_KIND, runQaStep);
