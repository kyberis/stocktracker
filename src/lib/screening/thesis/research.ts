import { resolveGatewayApiKey } from "@/lib/ai/gateway";
import { fetchScreeningGatewayChatCompletions as fetchGatewayChatCompletions } from "@/lib/screening/gateway";
import {
  getLatestScreeningAgentOutputUnscoped,
  insertScreeningAgentOutput,
} from "@/lib/db";
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
import { jinaKeysPresent } from "@/lib/screening/data/jina-extract";
import { serperKeysPresent } from "@/lib/screening/data/serper-search";
import { accrueScreeningLlmCost } from "@/lib/screening/cost";
import { extractLlmUsage } from "@/lib/screening/llm-usage";
import { resolveScreeningGatewayModel } from "@/lib/screening/resolve-model";
import { screeningBriefSchema } from "@/lib/screening/schemas";
import {
  mergeSoftPreferringQuotes,
  seedSoftFromPublished,
} from "@/lib/screening/thesis/seed-soft";
import {
  THESIS_HARD_DATA_KIND,
  THESIS_RESEARCH_KIND,
} from "@/lib/screening/thesis/kinds";
import {
  thesisHardDataOutputSchema,
  thesisIrOutputSchema,
  thesisSoftAssessmentSchema,
  type ThesisSoftAssessment,
} from "@/lib/screening/thesis/schemas";

export { THESIS_RESEARCH_KIND };

/** Soft fields needed for moat + capital allocation narrative. */
const FIELDS = ["EQ:A1", "EQ:B7", "EQ:F10"] as const;

/**
 * Single research step: IR + profile soft assessments for moat / business.
 * Replaces separate IR / Web / Technicals fan-out for the attractiveness pipeline.
 */
const runThesisResearchStep: StepHandler = async (
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
  const preferSerperJina = serperKeysPresent() && jinaKeysPresent();
  const [bundle, irDocs] = await Promise.all([
    fetchFmpIrBundle({ ticker: researchTicker }),
    fetchIrSiteDocuments({
      ticker: researchTicker,
      companyName: cleanCompanyNameForSearch(candidate?.name || ticker),
      runId: ctx.runId,
      preferSerperJina,
    }),
  ]);

  const evidence = {
    ...summariseIrBundleForLlm(bundle),
    listedTicker: ticker,
    researchTicker,
    candidate: candidate
      ? {
          name: candidate.name,
          sector: candidate.sector,
          industry: candidate.industry,
          analysisSummary: candidate.analysisSummary,
          moatVerdict: candidate.moatVerdict,
          buyback: candidate.buyback,
        }
      : null,
    irSiteDocuments: irDocs.documents.length
      ? {
          irPageUrl: irDocs.irPageUrl,
          documents: irDocs.documents.slice(0, 4).map((d) => ({
            url: d.url,
            title: d.title,
            asOf: d.asOf,
            excerpt: d.excerpt?.slice(0, 1200),
          })),
        }
      : null,
  };
  const seeds = seedSoftFromPublished({
    ticker,
    candidate,
    news: bundle.news,
  });

  let output = thesisIrOutputSchema.parse({
    ticker,
    soft_assessments: mergeSoftPreferringQuotes(
      [],
      seeds,
      FIELDS,
      ticker,
      "code:screening-thesis-research-seed",
    ),
    references: [],
    gaps: ["llm_or_sources_pending"],
  });
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
        max_tokens: 1400,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You extract SoftAssessments for ${ticker}. Language: ${locale}.
Fields: EQ:A1 (business in 3 sentences), EQ:B7 (moat / pricing power), EQ:F10 (capital allocation: buybacks, dividends, reinvestment).
Cite a literal quote (min 10 chars) from EVIDENCE. If no quote, score null and confidence insufficient_evidence.
Never buy/sell/hold. Reply only via submit_soft.`,
          },
          {
            role: "user",
            content: `EVIDENCE_JSON:\n${JSON.stringify(evidence).slice(0, 20000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_soft",
              description: "Soft assessments with quotes or null scores",
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
        const llmSoft: ThesisSoftAssessment[] = [];
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
                assessed_by: "llm:screening-thesis-research",
              })
            : null;
          if (candidateRow?.success) llmSoft.push(candidateRow.data);
        }
        output = thesisIrOutputSchema.parse({
          ticker,
          soft_assessments: mergeSoftPreferringQuotes(
            llmSoft,
            seeds,
            FIELDS,
            ticker,
            "llm:screening-thesis-research",
          ),
          references: irDocs.irPageUrl
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
    agentKind: THESIS_RESEARCH_KIND,
    ticker,
    outputJson: JSON.stringify(output),
    latencyMs: Date.now() - started,
  });
  return { status: "ok", payload: { ticker } };
};

registerHandler(THESIS_RESEARCH_KIND, runThesisResearchStep);
