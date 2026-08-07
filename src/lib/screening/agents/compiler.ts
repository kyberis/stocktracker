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
  compilerReportDraftSchema,
  hardDataOutputSchema,
  screeningBriefSchema,
  type CompilerBullet,
  type CompilerReportDraft,
  type HardDataOutput,
  type ScreeningBrief,
} from "@/lib/screening/schemas";

export const COMPILER_AGENT_KIND = "compiler";
export const COMPILER_MODEL = "openai/gpt-4o-mini";

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
    const bullet = String(row.bullet ?? "").trim().slice(0, 320);
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
  gatewayHeaders?: Headers;
}

export interface RunCompilerAgentResult {
  draft: CompilerReportDraft;
  latencyMs: number;
  rawResponse: string;
  errorMessage: string | null;
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
    };
  }

  const gatewayConfigured = await resolveGatewayApiKey(opts.gatewayHeaders);
  if (!gatewayConfigured) {
    return {
      draft: fallbackFromHardData(opts.hardData, opts.brief),
      latencyMs: Date.now() - startedAt,
      rawResponse: "",
      errorMessage: "gateway_not_configured",
    };
  }

  const systemPrompt = buildCompilerPrompt({
    brief: opts.brief,
    hardData: opts.hardData,
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
    })),
    gaps: opts.hardData.gaps,
  };

  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: `Hard-data ranking (JSON):\n${JSON.stringify(compactHardData)}\n\nPlease call submit_report_draft.`,
    },
  ];

  let rawResponse = "";
  let errorMessage: string | null = null;
  try {
    const res = await fetchGatewayChatCompletions(
      {
        model: COMPILER_MODEL,
        stream: false,
        max_tokens: 1800,
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
      );
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

  const result = await runCompilerAgent({ brief, hardData });

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
