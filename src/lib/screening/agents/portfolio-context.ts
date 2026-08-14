import { resolveGatewayApiKey } from "@/lib/ai/gateway";
import { fetchScreeningGatewayChatCompletions as fetchGatewayChatCompletions } from "@/lib/screening/gateway";
import {
  getLatestScreeningAgentOutputUnscoped,
  insertAiLog,
  insertScreeningAgentOutput,
  listCashEntries,
  listHoldings,
} from "@/lib/db";
import { getUserSettings } from "@/lib/db/settings";
import { computeSectorPercentsForRecommendations } from "@/lib/homepage/build-portfolio-recommendations";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import { recordPortfolioContextStep } from "@/lib/screening/metrics";
import { buildPortfolioContextPrompt } from "@/lib/screening/prompts/portfolio-context";
import {
  hardDataOutputSchema,
  portfolioContextOutputSchema,
  screeningBriefSchema,
  type HardDataOutput,
  type PortfolioContextOutput,
  type ScreeningBrief,
} from "@/lib/screening/schemas";
import { resolveScreeningGatewayModel } from "@/lib/screening/resolve-model";

export const PORTFOLIO_CONTEXT_AGENT_KIND = "portfolio_context";
/** @deprecated Prefer resolveScreeningGatewayModel("screening_portfolio_context"). */
export const PORTFOLIO_CONTEXT_MODEL = "openai/gpt-4o-mini";

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

async function buildPortfolioSnapshot(userId: string): Promise<{
  holdings: Array<{
    ticker: string;
    name: string;
    sector: string;
    valueEur: number;
    shares: number;
  }>;
  sectorAlloc: Array<{ label: string; percent: number }>;
  cashEur: number;
  investedEur: number;
  preferredCurrency: string;
}> {
  const [holdings, cash, settings] = await Promise.all([
    listHoldings(userId),
    listCashEntries(userId),
    getUserSettings(userId),
  ]);
  const cashEur = cash.reduce((s, c) => s + (c.amountEUR || 0), 0);
  const ranked = [...holdings]
    .map((h) => ({
      ticker: h.ticker.toUpperCase(),
      name: h.name,
      sector: h.sector || "Unclassified",
      valueEur: h.valueInEUR > 0 ? h.valueInEUR : 0,
      shares: h.shares,
    }))
    .sort((a, b) => b.valueEur - a.valueEur)
    .slice(0, 30);
  const investedEur = ranked.reduce((s, h) => s + h.valueEur, 0);
  const sectorAlloc = computeSectorPercentsForRecommendations(
    holdings,
    {},
    { EUR: 1 },
  ).slice(0, 12);
  return {
    holdings: ranked,
    sectorAlloc,
    cashEur,
    investedEur,
    preferredCurrency: settings.defaultCurrency || "EUR",
  };
}

function fallbackPortfolioContext(
  hardData: HardDataOutput,
  cashEur: number,
): PortfolioContextOutput {
  return portfolioContextOutputSchema.parse({
    sectorGaps: [],
    perCandidate: hardData.candidates.slice(0, 5).map((c) => ({
      ticker: c.ticker,
      positionKind: "new_position" as const,
      topUpTicker: null,
      overlapNotes: "Portfolio context unavailable — treating as new position.",
      illustrativeAllocationEur: {
        min: Math.min(500, Math.max(0, cashEur * 0.05)),
        max: Math.min(5000, Math.max(100, cashEur * 0.15)),
      },
      rationale: "Default fit until portfolio context can be computed.",
    })),
    cashAvailableEur: Math.max(0, cashEur),
    gaps: ["gateway_or_snapshot_unavailable"],
  });
}

function coercePortfolioContext(
  raw: Record<string, unknown>,
  candidateTickers: string[],
): PortfolioContextOutput | null {
  const known = new Set(candidateTickers.map((t) => t.toUpperCase()));
  const perRaw = Array.isArray(raw.perCandidate) ? raw.perCandidate : [];
  const perCandidate = [];
  for (const item of perRaw.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const ticker = String(row.ticker ?? "").toUpperCase().trim();
    if (!ticker || !known.has(ticker)) continue;
    const kind =
      row.positionKind === "top_up_existing"
        ? ("top_up_existing" as const)
        : ("new_position" as const);
    const alloc =
      row.illustrativeAllocationEur &&
      typeof row.illustrativeAllocationEur === "object"
        ? (row.illustrativeAllocationEur as Record<string, unknown>)
        : {};
    const min = Number(alloc.min);
    const max = Number(alloc.max);
    perCandidate.push({
      ticker,
      positionKind: kind,
      topUpTicker:
        kind === "top_up_existing"
          ? String(row.topUpTicker ?? ticker)
              .toUpperCase()
              .slice(0, 20) || ticker
          : null,
      overlapNotes: String(row.overlapNotes ?? "").slice(0, 400),
      illustrativeAllocationEur: {
        min: Number.isFinite(min) && min >= 0 ? min : 0,
        max: Number.isFinite(max) && max >= 0 ? max : 0,
      },
      rationale:
        String(row.rationale ?? "").trim().slice(0, 400) ||
        "Fit rationale unavailable.",
    });
  }

  const gaps = Array.isArray(raw.gaps)
    ? raw.gaps
        .map((s) => String(s ?? "").trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const sectorGaps = Array.isArray(raw.sectorGaps)
    ? raw.sectorGaps
        .slice(0, 12)
        .map((g) => {
          if (!g || typeof g !== "object") return null;
          const row = g as Record<string, unknown>;
          const sector = String(row.sector ?? "").trim().slice(0, 80);
          if (!sector) return null;
          return {
            sector,
            currentPct: Number(row.currentPct) || 0,
            targetPct:
              row.targetPct == null ? null : Number(row.targetPct) || null,
            gapPct: Number(row.gapPct) || 0,
          };
        })
        .filter((g): g is NonNullable<typeof g> => g != null)
    : [];

  const built = portfolioContextOutputSchema.safeParse({
    sectorGaps,
    perCandidate,
    cashAvailableEur: Math.max(0, Number(raw.cashAvailableEur) || 0),
    gaps,
  });
  return built.success ? built.data : null;
}

export async function runPortfolioContextAgent(opts: {
  brief: ScreeningBrief;
  hardData: HardDataOutput;
  snapshot: Awaited<ReturnType<typeof buildPortfolioSnapshot>>;
  gatewayHeaders?: Headers;
}): Promise<{
  output: PortfolioContextOutput;
  latencyMs: number;
  rawResponse: string;
  errorMessage: string | null;
}> {
  const startedAt = Date.now();
  const tickers = opts.hardData.candidates.map((c) => c.ticker);

  const gatewayConfigured = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!gatewayConfigured) {
    return {
      output: fallbackPortfolioContext(opts.hardData, opts.snapshot.cashEur),
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: "gateway_not_configured",
    };
  }

  const systemPrompt = buildPortfolioContextPrompt({
    brief: opts.brief,
    locale: opts.brief.locale,
    candidateTickers: tickers,
  });

  const submitTool = {
    type: "function" as const,
    function: {
      name: "submit_portfolio_context",
      description: "Submit portfolio fit analysis for the candidate list.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: [
          "sectorGaps",
          "perCandidate",
          "cashAvailableEur",
          "gaps",
        ],
        properties: {
          sectorGaps: { type: "array", items: { type: "object" } },
          perCandidate: { type: "array", items: { type: "object" } },
          cashAvailableEur: { type: "number" },
          gaps: { type: "array", items: { type: "string" } },
        },
      },
    },
  };

  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: `PORTFOLIO_SNAPSHOT_JSON:\n${JSON.stringify(opts.snapshot)}\n\nCANDIDATES_JSON:\n${JSON.stringify(
        opts.hardData.candidates.map((c) => ({
          ticker: c.ticker,
          name: c.name,
          sector: c.sector,
          rankScore: c.rankScore,
        })),
      )}\n\nPlease call submit_portfolio_context.`,
    },
  ];

  let rawResponse = "";
  let errorMessage: string | null = null;
  const model = await resolveScreeningGatewayModel("screening_portfolio_context");
  try {
    const res = await fetchGatewayChatCompletions(
      {
        model,
        stream: false,
        max_tokens: 2000,
        temperature: 0.25,
        messages,
        tools: [submitTool],
        tool_choice: {
          type: "function",
          function: { name: "submit_portfolio_context" },
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

  let output: PortfolioContextOutput | null = null;
  if (!errorMessage && rawResponse) {
    try {
      const parsed = JSON.parse(rawResponse) as Record<string, unknown>;
      output = coercePortfolioContext(parsed, tickers);
      if (!output) errorMessage = "parse_failed";
    } catch (err) {
      errorMessage = `json_parse:${err instanceof Error ? err.message : "unknown"}`;
    }
  }

  if (!output) {
    output = fallbackPortfolioContext(opts.hardData, opts.snapshot.cashEur);
  }

  return {
    output,
    latencyMs: Date.now() - startedAt,
    rawResponse,
    errorMessage,
  };
}

export const runPortfolioContextStep: StepHandler = async (
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

  const started = Date.now();
  const snapshot = await buildPortfolioSnapshot(ctx.userId);
  const result = await runPortfolioContextAgent({
    brief,
    hardData,
    snapshot,
  });

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: PORTFOLIO_CONTEXT_AGENT_KIND,
      outputJson: JSON.stringify(result.output),
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    console.error(
      "[screening/portfolio-context] persist failed",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await insertAiLog({
      userId: ctx.userId,
      source: "screening_portfolio_context",
      model: await resolveScreeningGatewayModel("screening_portfolio_context"),
      promptSystem: "portfolio_context_system_prompt",
      promptUser: `candidates=${hardData.candidates.length}`,
      response: result.rawResponse.slice(0, 20_000),
      durationMs: result.latencyMs,
      status: result.errorMessage ? "error" : "success",
      errorMessage: result.errorMessage?.slice(0, 2000) ?? "",
    });
  } catch {
    // best-effort
  }

  recordPortfolioContextStep(Date.now() - started, result.output.perCandidate);

  return {
    status: "ok",
    payload: {
      candidates: result.output.perCandidate.length,
      cashAvailableEur: result.output.cashAvailableEur,
      llmError: result.errorMessage,
    },
  };
};

registerHandler(PORTFOLIO_CONTEXT_AGENT_KIND, runPortfolioContextStep);
