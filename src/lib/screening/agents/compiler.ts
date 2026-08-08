import {
  fetchGatewayChatCompletions,
  resolveGatewayApiKey,
} from "@/lib/ai/gateway";
import {
  getLatestScreeningAgentOutputUnscoped,
  insertAiLog,
  insertScreeningAgentOutput,
} from "@/lib/db";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import { buildCompilerPrompt } from "@/lib/screening/prompts/compiler";
import {
  aggregateIrBusinessOutputSchema,
  aggregateTechnicalsOutputSchema,
  aggregateWebSentimentOutputSchema,
  compilerReportDraftSchema,
  hardDataOutputSchema,
  portfolioContextOutputSchema,
  riskOutputSchema,
  screeningBriefSchema,
  type AggregateIrBusinessOutput,
  type AggregateTechnicalsOutput,
  type AggregateWebSentimentOutput,
  type CompilerBullet,
  type CompilerReportDraft,
  type HardDataOutput,
  type PortfolioContextOutput,
  type RiskOutput,
  type ScreeningBrief,
} from "@/lib/screening/schemas";
export const COMPILER_AGENT_KIND = "compiler";
export const COMPILER_MODEL = "openai/gpt-4o-mini";
const AGGREGATE_IR_KIND = "aggregate_ir_business";
const AGGREGATE_WEB_KIND = "aggregate_web_sentiment";
const AGGREGATE_TECHNICALS_KIND = "aggregate_technicals";
const PORTFOLIO_CONTEXT_KIND = "portfolio_context";
const RISK_KIND = "risk";

const DEFAULT_DISCLAIMER =
  "This is a research aid, not investment advice. All investments carry risk.";
const DEFAULT_DISCLAIMER_ES =
  "Esto es una herramienta de investigación, no una recomendación de inversión. Toda inversión implica riesgo.";

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

function parseIrAggregate(json: string): AggregateIrBusinessOutput | null {
  try {
    const res = aggregateIrBusinessOutputSchema.safeParse(JSON.parse(json));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

function parseWebAggregate(json: string): AggregateWebSentimentOutput | null {
  try {
    const res = aggregateWebSentimentOutputSchema.safeParse(JSON.parse(json));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

function parsePortfolioContext(json: string): PortfolioContextOutput | null {
  try {
    const res = portfolioContextOutputSchema.safeParse(JSON.parse(json));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

function parseRisk(json: string): RiskOutput | null {
  try {
    const res = riskOutputSchema.safeParse(JSON.parse(json));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

function parseTechnicalsAggregate(
  json: string,
): AggregateTechnicalsOutput | null {
  try {
    const res = aggregateTechnicalsOutputSchema.safeParse(JSON.parse(json));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

function coerceBullets(
  raw: unknown,
  candidateTickers: string[],
): CompilerBullet[] {
  if (!Array.isArray(raw)) return [];
  const knownTickers = new Set(candidateTickers.map((t) => t.toUpperCase()));
  const seen = new Set<string>();
  const out: CompilerBullet[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const ticker = String(row.ticker ?? "").toUpperCase().trim();
    if (!ticker || seen.has(ticker) || !knownTickers.has(ticker)) continue;
    const headline = String(row.headline ?? "").trim().slice(0, 120);
    const bullet = String(row.bullet ?? "").trim().slice(0, 4000);
    if (!headline || !bullet) continue;
    seen.add(ticker);
    out.push({ ticker, headline, bullet });
  }
  return out;
}

function fallbackFromHardData(
  hardData: HardDataOutput,
  brief: ScreeningBrief,
): CompilerReportDraft {
  const locale = brief.locale;
  const isEs = locale.startsWith("es");
  const bullets: CompilerBullet[] = hardData.candidates
    .slice(0, brief.candidateCount)
    .map((c) => ({
      ticker: c.ticker,
      headline: c.name ? c.name.slice(0, 60) : c.ticker,
      bullet: c.rankReason.slice(0, 300),
    }));
  const scope =
    brief.includeSectors.length > 0
      ? brief.includeSectors.join(", ")
      : isEs
        ? "cualquier sector"
        : "any sector";
  const summary = isEs
    ? `Se filtró el universo por ${scope} y se seleccionaron los ${bullets.length} candidatos con mejor encaje frente al brief del usuario.`
    : `The universe was filtered by ${scope} and ranked to select the top ${bullets.length} candidates matching the user brief.`;
  return {
    summary,
    candidateBullets: bullets,
    disclaimer: isEs ? DEFAULT_DISCLAIMER_ES : DEFAULT_DISCLAIMER,
    locale,
  };
}

export interface RunCompilerAgentOptions {
  brief: ScreeningBrief;
  hardData: HardDataOutput;
  irAggregate?: AggregateIrBusinessOutput | null;
  webAggregate?: AggregateWebSentimentOutput | null;
  technicalsAggregate?: AggregateTechnicalsOutput | null;
  portfolioContext?: PortfolioContextOutput | null;
  risk?: RiskOutput | null;
  gatewayHeaders?: Headers;
}

export interface RunCompilerAgentResult {
  draft: CompilerReportDraft;
  latencyMs: number;
  rawResponse: string;
  errorMessage: string | null;
  tokensInput: number;
  tokensOutput: number;
}

export async function runCompilerAgent(
  opts: RunCompilerAgentOptions,
): Promise<RunCompilerAgentResult> {
  const startedAt = Date.now();

  if (opts.hardData.candidates.length === 0) {
    const isEs = opts.brief.locale.startsWith("es");
    return {
      draft: {
        summary: isEs
          ? "El brief no produjo candidatos. Prueba ampliando sectores o rangos de capitalización."
          : "The brief returned no candidates. Try broadening sectors or market-cap ranges.",
        candidateBullets: [],
        disclaimer: isEs ? DEFAULT_DISCLAIMER_ES : DEFAULT_DISCLAIMER,
        locale: opts.brief.locale,
      },
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: null,
      tokensInput: 0,
      tokensOutput: 0,
    };
  }

  const gatewayConfigured = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!gatewayConfigured) {
    return {
      draft: fallbackFromHardData(opts.hardData, opts.brief),
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: "gateway_not_configured",
      tokensInput: 0,
      tokensOutput: 0,
    };
  }

  const systemPrompt = buildCompilerPrompt({
    brief: opts.brief,
    hardData: opts.hardData,
    irAggregate: opts.irAggregate ?? null,
    webAggregate: opts.webAggregate ?? null,
    technicalsAggregate: opts.technicalsAggregate ?? null,
    portfolioContext: opts.portfolioContext ?? null,
    risk: opts.risk ?? null,
    locale: opts.brief.locale,
  });

  const submitReportDraftTool = {
    type: "function" as const,
    function: {
      name: "submit_report_draft",
      description: "Submit the executive summary and per-candidate bullets.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["summary", "candidateBullets", "disclaimer", "locale"],
        properties: {
          summary: { type: "string" },
          candidateBullets: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["ticker", "headline", "bullet"],
              properties: {
                ticker: { type: "string" },
                headline: { type: "string" },
                bullet: { type: "string" },
              },
            },
          },
          disclaimer: { type: "string" },
          locale: { type: "string" },
        },
      },
    },
  };

  const compactHardData = {
    status: opts.hardData.status,
    universeSize: opts.hardData.universeSize,
    candidates: opts.hardData.candidates.map((c) => ({
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
      industry: c.industry,
      rankScore: c.rankScore,
      rankReason: c.rankReason,
      fwdPe: c.fwdPe ?? null,
      ownHistPe: c.ownHistPe ?? null,
      evEbitda: c.evEbitda ?? null,
      ndEbitda: c.ndEbitda ?? null,
      netCash: c.netCash ?? null,
      dividendYield: c.dividendYield ?? null,
      upsidePct: c.upsidePct ?? null,
      moatScore: c.moatScore ?? null,
      growthNote: c.growthNote ?? null,
      unmetBriefCriteria: c.unmetBriefCriteria,
    })),
    gaps: opts.hardData.gaps,
  };

  const irBlock =
    opts.irAggregate && opts.irAggregate.tickers.length > 0
      ? `\n\nIR_CONTEXT_JSON:\n${JSON.stringify({
          tickers: opts.irAggregate.tickers.map((t) => ({
            ticker: t.ticker,
            businessOneLiner: t.businessOneLiner,
            guidance: t.guidance,
            catalysts: t.catalysts.map((c) => ({
              label: c.label,
              evidence: c.evidence,
            })),
            contradictionWithHardData: t.contradictionWithHardData,
            confidence: t.confidence,
            bullets: t.bullets,
            gaps: t.gaps,
          })),
        })}`
      : "";

  const webBlock =
    opts.webAggregate && opts.webAggregate.tickers.length > 0
      ? `\n\nWEB_CONTEXT_JSON:\n${JSON.stringify({
          tickers: opts.webAggregate.tickers.map((t) => ({
            ticker: t.ticker,
            sentimentSummary: t.sentimentSummary,
            insiderBias: t.insiderSummary.netBias,
            signals: t.signals.slice(0, 6).map((s) => ({
              kind: s.kind,
              claim: s.claim,
              confirmation: s.confirmation,
            })),
            gaps: t.gaps,
          })),
        })}`
      : "";

  const techBlock =
    opts.technicalsAggregate && opts.technicalsAggregate.tickers.length > 0
      ? `\n\nTECHNICALS_CONTEXT_JSON:\n${JSON.stringify({
          tickers: opts.technicalsAggregate.tickers.map((t) => ({
            ticker: t.ticker,
            distanceTo52wHighPct: t.distanceTo52wHighPct,
            distanceTo52wLowPct: t.distanceTo52wLowPct,
            aboveMa200: t.aboveMa200,
            return1yPct: t.return1yPct,
            return3mPct: t.return3mPct,
            volatilityAnnPct: t.volatilityAnnPct,
          })),
        })}`
      : "";

  const pcBlock = opts.portfolioContext
    ? `\n\nPORTFOLIO_CONTEXT_JSON:\n${JSON.stringify({
        cashAvailableEur: opts.portfolioContext.cashAvailableEur,
        perCandidate: opts.portfolioContext.perCandidate,
        sectorGaps: opts.portfolioContext.sectorGaps.slice(0, 6),
      })}`
    : "";

  const riskBlock = opts.risk
    ? `\n\nRISK_CONTEXT_JSON:\n${JSON.stringify({
        assumedProfile: opts.risk.assumedProfile,
        perCandidate: opts.risk.perCandidate,
        portfolioLevelFlags: opts.risk.portfolioLevelFlags,
      })}`
    : "";

  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: `Hard-data ranking (JSON):\n${JSON.stringify(compactHardData)}${irBlock}${webBlock}${techBlock}${pcBlock}${riskBlock}\n\nPlease call submit_report_draft.`,
    },
  ];

  let rawResponse = "";
  let errorMessage: string | null = null;
  let tokensInput = 0;
  let tokensOutput = 0;
  try {
    const res = await fetchGatewayChatCompletions(
      {
        model: COMPILER_MODEL,
        stream: false,
        max_tokens: 4500,
        temperature: 0.35,
        messages,
        tools: [submitReportDraftTool],
        tool_choice: {
          type: "function",
          function: { name: "submit_report_draft" },
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
      const { extractLlmUsage } = await import("@/lib/screening/llm-usage");
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

  let draft: CompilerReportDraft | null = null;
  if (!errorMessage && rawResponse) {
    try {
      const parsed = JSON.parse(rawResponse) as Record<string, unknown>;
      const bullets = coerceBullets(
        parsed.candidateBullets,
        opts.hardData.candidates.map((c) => c.ticker),
      ).slice(0, opts.brief.candidateCount || 5);
      const built = compilerReportDraftSchema.safeParse({
        summary: String(parsed.summary ?? "").trim().slice(0, 2000),
        candidateBullets: bullets,
        disclaimer:
          String(parsed.disclaimer ?? DEFAULT_DISCLAIMER)
            .trim()
            .slice(0, 500) || DEFAULT_DISCLAIMER,
        locale:
          typeof parsed.locale === "string" && parsed.locale.length >= 2
            ? parsed.locale
            : opts.brief.locale,
      });
      if (built.success) {
        draft = built.data;
      } else {
        errorMessage = `parse_failed:${built.error.issues[0]?.message ?? "unknown"}`;
      }
    } catch (err) {
      errorMessage = `json_parse:${err instanceof Error ? err.message : "unknown"}`;
    }
  }

  if (!draft) {
    console.warn(
      "[screening/compiler] falling back to deterministic draft",
      errorMessage,
    );
    draft = fallbackFromHardData(opts.hardData, opts.brief);
  }

  return {
    draft,
    latencyMs: Date.now() - startedAt,
    rawResponse,
    errorMessage,
    tokensInput,
    tokensOutput,
  };
}

export const runCompilerStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const brief = parseBrief(ctx.briefJson);
  if (!brief) {
    return { status: "error", errorMessage: "brief_unavailable", fatal: true };
  }

  const hardDataRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    "hard_data",
  );
  if (!hardDataRow) {
    return { status: "error", errorMessage: "hard_data_output_missing" };
  }
  const hardData = parseHardData(hardDataRow.outputJson);
  if (!hardData) {
    return { status: "error", errorMessage: "hard_data_output_invalid" };
  }

  const [irRow, webRow, techRow, pcRow, riskRow] = await Promise.all([
    getLatestScreeningAgentOutputUnscoped(ctx.runId, AGGREGATE_IR_KIND),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, AGGREGATE_WEB_KIND),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, AGGREGATE_TECHNICALS_KIND),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, PORTFOLIO_CONTEXT_KIND),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, RISK_KIND),
  ]);
  const irAggregate = irRow ? parseIrAggregate(irRow.outputJson) : null;
  const webAggregate = webRow ? parseWebAggregate(webRow.outputJson) : null;
  const technicalsAggregate = techRow
    ? parseTechnicalsAggregate(techRow.outputJson)
    : null;
  const portfolioContext = pcRow
    ? parsePortfolioContext(pcRow.outputJson)
    : null;
  const risk = riskRow ? parseRisk(riskRow.outputJson) : null;

  const result = await runCompilerAgent({
    brief,
    hardData,
    irAggregate,
    webAggregate,
    technicalsAggregate,
    portfolioContext,
    risk,
  });

  const { accrueScreeningLlmCost } = await import("@/lib/screening/cost");
  await accrueScreeningLlmCost({
    runId: ctx.runId,
    model: COMPILER_MODEL,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
  });

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: COMPILER_AGENT_KIND,
      outputJson: JSON.stringify(result.draft),
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    console.error(
      "[screening/compiler] persist output failed",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await insertAiLog({
      userId: ctx.userId,
      source: "screening_compiler",
      model: COMPILER_MODEL,
      promptSystem: "compiler_system_prompt",
      promptUser: `candidates=${hardData.candidates.length}`,
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
      bullets: result.draft.candidateBullets.length,
      llmError: result.errorMessage,
    },
  };
};

registerHandler(COMPILER_AGENT_KIND, runCompilerStep);
