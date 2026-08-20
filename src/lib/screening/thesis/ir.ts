import { resolveGatewayApiKey } from "@/lib/ai/gateway";
import { fetchScreeningGatewayChatCompletions as fetchGatewayChatCompletions } from "@/lib/screening/gateway";
import {
  getLatestScreeningAgentOutputUnscoped,
  insertScreeningAgentOutput,
} from "@/lib/db";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import { fetchFmpIrBundle, summariseIrBundleForLlm } from "@/lib/screening/data/fmp-ir";
import { fetchIrSiteDocuments } from "@/lib/screening/data/ir-site-docs";
import {
  cleanCompanyNameForSearch,
  researchSymbolForListed,
} from "@/lib/screening/data/research-symbol";
import { accrueScreeningLlmCost } from "@/lib/screening/cost";
import { extractLlmUsage } from "@/lib/screening/llm-usage";
import { resolveScreeningGatewayModel } from "@/lib/screening/resolve-model";
import { screeningBriefSchema } from "@/lib/screening/schemas";
import { insufficientSoft } from "@/lib/screening/thesis/insufficient-soft";
import { THESIS_HARD_DATA_KIND, THESIS_IR_KIND } from "@/lib/screening/thesis/kinds";
import {
  thesisHardDataOutputSchema,
  thesisIrOutputSchema,
  thesisSoftAssessmentSchema,
  type ThesisIrOutput,
  type ThesisSoftAssessment,
} from "@/lib/screening/thesis/schemas";

export { THESIS_IR_KIND };

const FIELDS = ["EQ:A1", "EQ:A3", "EQ:B7", "EQ:J2", "EQ:F10"] as const;

function gapOutput(ticker: string): ThesisIrOutput {
  return thesisIrOutputSchema.parse({
    ticker,
    soft_assessments: FIELDS.map((field_id) =>
      insufficientSoft({
        ticker,
        field_id,
        assessed_by: "llm:screening-thesis-ir",
      }),
    ),
    references: [],
    gaps: ["llm_or_sources_unavailable"],
  });
}

const runThesisIrStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const ticker = ctx.step.ticker?.toUpperCase().trim();
  if (!ticker) {
    return { status: "error", errorMessage: "ticker_missing", fatal: true };
  }
  let locale = "en";
  try {
    locale = screeningBriefSchema.parse(JSON.parse(ctx.briefJson)).locale;
  } catch {
    // keep en
  }

  const hdRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    THESIS_HARD_DATA_KIND,
  );
  const hd = hdRow
    ? thesisHardDataOutputSchema.safeParse(JSON.parse(hdRow.outputJson))
    : null;
  const candidate =
    hd?.success
      ? hd.data.candidates.find((c) => c.ticker.toUpperCase() === ticker)
      : undefined;

  const researchTicker = await researchSymbolForListed({
    ticker,
    companyName: candidate?.name,
    researchTicker: candidate?.researchTicker,
  });
  const [tavilyOn, serperOn] = await Promise.all([
    isFeatureEnabledForUser("screening_tavily_research_enabled", ctx.userId),
    isFeatureEnabledForUser("screening_ir_serper_jina_enabled", ctx.userId),
  ]);
  const [bundle, irDocs] = await Promise.all([
    fetchFmpIrBundle({ ticker: researchTicker }),
    tavilyOn || serperOn
      ? fetchIrSiteDocuments({
          ticker: researchTicker,
          companyName: cleanCompanyNameForSearch(candidate?.name || ticker),
          runId: ctx.runId,
          preferSerperJina: serperOn,
        })
      : Promise.resolve(null),
  ]);

  const evidence = {
    ...summariseIrBundleForLlm(bundle),
    irSiteDocuments: irDocs
      ? {
          irPageUrl: irDocs.irPageUrl,
          documents: irDocs.documents.slice(0, 4).map((d) => ({
            url: d.url,
            title: d.title,
            asOf: d.asOf,
            excerpt: d.excerpt?.slice(0, 800),
          })),
        }
      : null,
  };

  let output = gapOutput(ticker);
  const started = Date.now();
  const gatewayOk = await resolveGatewayApiKey();
  let tokensInput = 0;
  let tokensOutput = 0;
  if (gatewayOk) {
    const model = await resolveScreeningGatewayModel("screening_ir_business");
    try {
      const res = await fetchGatewayChatCompletions({
        model,
        stream: false,
        max_tokens: 1800,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You extract SoftAssessments for ${ticker}. Language: ${locale}.
One object per field_id: EQ:A1 (explain the business in 3 sentences), EQ:A3 (revenue model), EQ:B7 (moat type), EQ:J2 (dated catalysts), EQ:F10 (management language).
Rules: score 1-5 only with a literal quote (min 10 chars) from EVIDENCE. If you cannot cite, score null and confidence insufficient_evidence. Never buy/sell/hold. Reply only via submit_soft.`,
          },
          {
            role: "user",
            content: `EVIDENCE_JSON:\n${JSON.stringify(evidence).slice(0, 24000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_soft",
              description: "Soft assessments with mandatory quotes or null scores",
              parameters: {
                type: "object",
                additionalProperties: false,
                required: ["soft_assessments"],
                properties: {
                  soft_assessments: { type: "array" },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_soft" } },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{
            message?: {
              tool_calls?: Array<{ function?: { arguments?: string } }>;
            };
          }>;
          usage?: unknown;
        };
        const usage = extractLlmUsage(data);
        tokensInput = usage.tokensInput;
        tokensOutput = usage.tokensOutput;
        const raw =
          data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "";
        const parsed = JSON.parse(raw) as { soft_assessments?: unknown };
        const items = Array.isArray(parsed.soft_assessments)
          ? parsed.soft_assessments
          : [];
        const soft: ThesisSoftAssessment[] = [];
        for (const field_id of FIELDS) {
          const match = items.find(
            (row) =>
              row &&
              typeof row === "object" &&
              String((row as { field_id?: string }).field_id) === field_id,
          );
          const candidateRow = match
            ? thesisSoftAssessmentSchema.safeParse({
                ...(match as object),
                asset_id: ticker,
                field_id,
                assessed_at: new Date().toISOString(),
                assessed_by: "llm:screening-thesis-ir",
              })
            : null;
          if (candidateRow?.success) soft.push(candidateRow.data);
          else {
            soft.push(
              insufficientSoft({
                ticker,
                field_id,
                assessed_by: "llm:screening-thesis-ir",
              }),
            );
          }
        }
        output = thesisIrOutputSchema.parse({
          ticker,
          soft_assessments: soft,
          references: irDocs?.irPageUrl
            ? [
                {
                  url: irDocs.irPageUrl,
                  asOf: new Date().toISOString().slice(0, 10),
                  label: "IR hub",
                },
              ]
            : [],
          gaps: [],
        });
      }
    } catch (err) {
      output.gaps = [
        `llm:${err instanceof Error ? err.message.slice(0, 80) : "error"}`,
      ];
    }
    await accrueScreeningLlmCost({
      runId: ctx.runId,
      model,
      tokensInput,
      tokensOutput,
    });
  }

  await insertScreeningAgentOutput({
    userId: ctx.userId,
    runId: ctx.runId,
    agentKind: THESIS_IR_KIND,
    ticker,
    outputJson: JSON.stringify(output),
    latencyMs: Date.now() - started,
  });
  return { status: "ok", payload: { ticker } };
};

registerHandler(THESIS_IR_KIND, runThesisIrStep);
