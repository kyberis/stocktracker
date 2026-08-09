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
import { recordRiskStep } from "@/lib/screening/metrics";
import { buildRiskPrompt } from "@/lib/screening/prompts/risk";
import {
  hardDataOutputSchema,
  portfolioContextOutputSchema,
  riskOutputSchema,
  screeningBriefSchema,
  type HardDataOutput,
  type PortfolioContextOutput,
  type RiskOutput,
  type ScreeningBrief,
  type ScreeningRiskProfile,
} from "@/lib/screening/schemas";
import { PORTFOLIO_CONTEXT_AGENT_KIND } from "@/lib/screening/agents/portfolio-context";
import { resolveScreeningGatewayModel } from "@/lib/screening/resolve-model";

export const RISK_AGENT_KIND = "risk";
/** @deprecated Prefer resolveScreeningGatewayModel("screening_risk"). */
export const RISK_MODEL = "openai/gpt-4o-mini";

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

function parsePortfolioContext(json: string): PortfolioContextOutput | null {
  try {
    const res = portfolioContextOutputSchema.safeParse(JSON.parse(json));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

function fallbackRisk(
  hardData: HardDataOutput,
  profile: ScreeningRiskProfile,
  assumedProfile: boolean,
): RiskOutput {
  const cap =
    profile === "conservative" ? 5 : profile === "aggressive" ? 15 : 10;
  return riskOutputSchema.parse({
    assumedProfile,
    perCandidate: hardData.candidates.slice(0, 5).map((c, i) => ({
      ticker: c.ticker,
      illustrativeWeightPct: Math.max(1, cap - i),
      concentrationImpact:
        "Illustrative weight capped by profile; verify against live holdings.",
      riskFlags: ["risk_agent_fallback"],
      suitability: "stretch" as const,
      rationale: "Default suitability until Risk agent output is available.",
    })),
    portfolioLevelFlags: assumedProfile
      ? ["assumed_balanced_profile"]
      : [],
    gaps: ["gateway_unavailable"],
  });
}

function coerceRisk(
  raw: Record<string, unknown>,
  candidateTickers: string[],
  assumedProfile: boolean,
): RiskOutput | null {
  const known = new Set(candidateTickers.map((t) => t.toUpperCase()));
  const perRaw = Array.isArray(raw.perCandidate) ? raw.perCandidate : [];
  const perCandidate = [];
  for (const item of perRaw.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const ticker = String(row.ticker ?? "").toUpperCase().trim();
    if (!ticker || !known.has(ticker)) continue;
    const suitabilityRaw = String(row.suitability ?? "stretch");
    const suitability = (
      ["fit", "stretch", "poor_fit"] as const
    ).includes(suitabilityRaw as "fit")
      ? (suitabilityRaw as "fit" | "stretch" | "poor_fit")
      : "stretch";
    const weight = Number(row.illustrativeWeightPct);
    const flags = Array.isArray(row.riskFlags)
      ? row.riskFlags
          .map((s) => String(s ?? "").trim().slice(0, 200))
          .filter(Boolean)
          .slice(0, 8)
      : [];
    perCandidate.push({
      ticker,
      illustrativeWeightPct: Number.isFinite(weight)
        ? Math.min(100, Math.max(0, weight))
        : 5,
      concentrationImpact:
        String(row.concentrationImpact ?? "").trim().slice(0, 400) ||
        "Concentration impact not stated.",
      riskFlags: flags,
      suitability,
      rationale:
        String(row.rationale ?? "").trim().slice(0, 400) ||
        "Suitability rationale unavailable.",
    });
  }

  const portfolioLevelFlags = Array.isArray(raw.portfolioLevelFlags)
    ? raw.portfolioLevelFlags
        .map((s) => String(s ?? "").trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 10)
    : [];
  const gaps = Array.isArray(raw.gaps)
    ? raw.gaps
        .map((s) => String(s ?? "").trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const built = riskOutputSchema.safeParse({
    assumedProfile:
      typeof raw.assumedProfile === "boolean"
        ? raw.assumedProfile
        : assumedProfile,
    perCandidate,
    portfolioLevelFlags,
    gaps,
  });
  return built.success ? built.data : null;
}

export async function runRiskAgent(opts: {
  brief: ScreeningBrief;
  hardData: HardDataOutput;
  portfolioContext: PortfolioContextOutput | null;
  gatewayHeaders?: Headers;
}): Promise<{
  output: RiskOutput;
  latencyMs: number;
  rawResponse: string;
  errorMessage: string | null;
}> {
  const startedAt = Date.now();
  const assumedProfile = opts.brief.riskProfile == null;
  const riskProfile: ScreeningRiskProfile =
    opts.brief.riskProfile ?? "balanced";
  const tickers = opts.hardData.candidates.map((c) => c.ticker);

  const gatewayConfigured = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!gatewayConfigured) {
    return {
      output: fallbackRisk(opts.hardData, riskProfile, assumedProfile),
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: "gateway_not_configured",
    };
  }

  const systemPrompt = buildRiskPrompt({
    brief: opts.brief,
    locale: opts.brief.locale,
    riskProfile,
    assumedProfile,
    candidateTickers: tickers,
  });

  const submitTool = {
    type: "function" as const,
    function: {
      name: "submit_risk",
      description: "Submit risk and suitability checks for the candidates.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: [
          "assumedProfile",
          "perCandidate",
          "portfolioLevelFlags",
          "gaps",
        ],
        properties: {
          assumedProfile: { type: "boolean" },
          perCandidate: { type: "array", items: { type: "object" } },
          portfolioLevelFlags: { type: "array", items: { type: "string" } },
          gaps: { type: "array", items: { type: "string" } },
        },
      },
    },
  };

  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: `PORTFOLIO_CONTEXT_JSON:\n${JSON.stringify(opts.portfolioContext)}\n\nCANDIDATES_JSON:\n${JSON.stringify(
        opts.hardData.candidates.map((c) => ({
          ticker: c.ticker,
          name: c.name,
          sector: c.sector,
          marketCapUsd: c.marketCapUsd,
          rankScore: c.rankScore,
        })),
      )}\n\nPlease call submit_risk.`,
    },
  ];

  let rawResponse = "";
  let errorMessage: string | null = null;
  const model = await resolveScreeningGatewayModel("screening_risk");
  try {
    const res = await fetchGatewayChatCompletions(
      {
        model,
        stream: false,
        max_tokens: 2000,
        temperature: 0.2,
        messages,
        tools: [submitTool],
        tool_choice: {
          type: "function",
          function: { name: "submit_risk" },
        },
      },
      { headers: opts.gatewayHeaders },
    );
    if (!res.ok) {
      errorMessage = `gateway_${res.status}`;
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

  let output: RiskOutput | null = null;
  if (!errorMessage && rawResponse) {
    try {
      const parsed = JSON.parse(rawResponse) as Record<string, unknown>;
      output = coerceRisk(parsed, tickers, assumedProfile);
      if (!output) errorMessage = "parse_failed";
    } catch (err) {
      errorMessage = `json_parse:${err instanceof Error ? err.message : "unknown"}`;
    }
  }

  if (!output) {
    output = fallbackRisk(opts.hardData, riskProfile, assumedProfile);
  }

  return {
    output,
    latencyMs: Date.now() - startedAt,
    rawResponse,
    errorMessage,
  };
}

export const runRiskStep: StepHandler = async (
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

  const pcRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    PORTFOLIO_CONTEXT_AGENT_KIND,
  );
  const portfolioContext = pcRow
    ? parsePortfolioContext(pcRow.outputJson)
    : null;

  const started = Date.now();
  const result = await runRiskAgent({
    brief,
    hardData,
    portfolioContext,
  });

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: RISK_AGENT_KIND,
      outputJson: JSON.stringify(result.output),
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    console.error(
      "[screening/risk] persist failed",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await insertAiLog({
      userId: ctx.userId,
      source: "screening_risk",
      model: await resolveScreeningGatewayModel("screening_risk"),
      promptSystem: "risk_system_prompt",
      promptUser: `candidates=${hardData.candidates.length}`,
      response: result.rawResponse.slice(0, 20_000),
      durationMs: result.latencyMs,
      status: result.errorMessage ? "error" : "success",
      errorMessage: result.errorMessage?.slice(0, 2000) ?? "",
    });
  } catch {
    // best-effort
  }

  recordRiskStep(Date.now() - started, result.output.perCandidate);

  return {
    status: "ok",
    payload: {
      candidates: result.output.perCandidate.length,
      assumedProfile: result.output.assumedProfile,
      llmError: result.errorMessage,
    },
  };
};

registerHandler(RISK_AGENT_KIND, runRiskStep);
