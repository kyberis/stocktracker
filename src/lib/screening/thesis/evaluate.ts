import { resolveGatewayApiKey } from "@/lib/ai/gateway";
import { fetchScreeningGatewayChatCompletions as fetchGatewayChatCompletions } from "@/lib/screening/gateway";
import {
  getLatestScreeningAgentOutputUnscoped,
  insertScreeningAgentOutput,
  listScreeningAgentOutputsByRunAndKind,
} from "@/lib/db";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import { accrueScreeningLlmCost } from "@/lib/screening/cost";
import { extractLlmUsage } from "@/lib/screening/llm-usage";
import { resolveScreeningGatewayModel } from "@/lib/screening/resolve-model";
import { screeningBriefSchema } from "@/lib/screening/schemas";
import {
  maxConvictionForAssessment,
  scoreThesisAssessment,
} from "@/lib/screening/thesis/score-assessment";
import {
  THESIS_COMPILER_KIND,
  THESIS_EVALUATE_KIND,
  THESIS_HARD_DATA_KIND,
  THESIS_IR_KIND,
  THESIS_WEB_KIND,
} from "@/lib/screening/thesis/kinds";
import {
  ADVICE_LANGUAGE,
  THESIS_RULESET_VERSION,
  thesisCompilerOutputSchema,
  thesisDraftSchema,
  thesisEvaluateOutputSchema,
  thesisHardDataOutputSchema,
  thesisIrOutputSchema,
  thesisSoftAssessmentSchema,
  thesisWebOutputSchema,
  type ThesisDraft,
  type ThesisEvaluateTicker,
  type ThesisFact,
  type ThesisSoftAssessment,
} from "@/lib/screening/thesis/schemas";

export { THESIS_EVALUATE_KIND };

const DISCLAIMER_EN =
  "This analysis is informational and does not constitute investment advice. AI output may be incomplete.";
const DISCLAIMER_ES =
  "Este análisis es informativo y no constituye asesoramiento de inversión. La salida de IA puede estar incompleta.";

function parseSoftFromRows(
  rows: Array<{ outputJson: string }>,
  schema: typeof thesisIrOutputSchema | typeof thesisWebOutputSchema,
): ThesisSoftAssessment[] {
  const out: ThesisSoftAssessment[] = [];
  for (const row of rows) {
    try {
      const parsed = schema.safeParse(JSON.parse(row.outputJson));
      if (!parsed.success) continue;
      for (const s of parsed.data.soft_assessments) {
        const ok = thesisSoftAssessmentSchema.safeParse(s);
        if (ok.success) out.push(ok.data);
      }
    } catch {
      // skip
    }
  }
  return out;
}

function fallbackDraft(
  ticker: string,
  locale: string,
  assessment: ReturnType<typeof scoreThesisAssessment>,
  facts: ThesisFact[],
): ThesisDraft | null {
  const d1 = facts.find((f) => f.field_id === "EQ:D1");
  const gaps: string[] = [];
  if (d1?.value == null) gaps.push("EQ:D1 missing — cannot bind a cash-conversion kill criterion.");
  const kill =
    d1?.value != null
      ? [
          {
            metric_field_id: "EQ:D1" as const,
            operator: "<" as const,
            threshold: 0.6,
            window: "TTM 3y average",
            action: "review" as const,
            label: "FCF/NI average falls below 0.6",
          },
        ]
      : [];
  if (kill.length === 0) gaps.push("No code-evaluable kill criterion available from facts.");
  const raw = {
    ticker,
    statement: locale.startsWith("es")
      ? `Creo que ${ticker} puede mantener su calidad de negocio en 36 meses si la conversión de caja y el apalancamiento publicados se sostienen; el mercado ya descuenta parte de esa calidad.`
      : `I believe ${ticker} can sustain its published business quality over 36 months if cash conversion and leverage hold; the market already prices some of that quality.`,
    variant_perception: {
      consensus_view:
        "Consensus estimates were not fetched in this pipeline version (I1–I3 gap).",
      our_view:
        "Quality and balance-sheet facts are scored independently of price targets.",
      why_mispricing_persists:
        "Insufficient measured consensus — this is a gap, not a hidden edge.",
    },
    horizon_months: 36,
    conviction: Math.min(2, maxConvictionForAssessment(assessment)),
    conviction_rationale: "Fallback draft without a full LLM narrative pass.",
    kill_criteria: kill,
    premortem:
      "It is 2029 and this position is down 50 percent. The most likely causes are a broken cash-conversion story, a refinancing wall, or a thesis that was never falsifiable because consensus was not measured.",
    scenarios: [
      {
        label: "bear" as const,
        probability: 0.25,
        value: 0,
        key_assumptions: [{ driver: "fcf_ni", assumption: "breaks below 0.6" }],
      },
      {
        label: "base" as const,
        probability: 0.5,
        value: 0,
        key_assumptions: [{ driver: "fcf_ni", assumption: "holds near history" }],
      },
      {
        label: "bull" as const,
        probability: 0.25,
        value: 0,
        key_assumptions: [{ driver: "multiple", assumption: "mean reversion" }],
      },
    ],
    status: assessment.verdict === "watchlist_gate_failed" ? "watchlist" : "draft",
    gaps,
    disclaimer: locale.startsWith("es") ? DISCLAIMER_ES : DISCLAIMER_EN,
  };
  const parsed = thesisDraftSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const runThesisEvaluateStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const started = Date.now();
  let locale = "en";
  try {
    locale = screeningBriefSchema.parse(JSON.parse(ctx.briefJson)).locale;
  } catch {
    // keep
  }
  const [hdRow, compilerRow, irRows, webRows] = await Promise.all([
    getLatestScreeningAgentOutputUnscoped(ctx.runId, THESIS_HARD_DATA_KIND),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, THESIS_COMPILER_KIND),
    listScreeningAgentOutputsByRunAndKind(ctx.runId, THESIS_IR_KIND),
    listScreeningAgentOutputsByRunAndKind(ctx.runId, THESIS_WEB_KIND),
  ]);
  const hd = hdRow
    ? thesisHardDataOutputSchema.safeParse(JSON.parse(hdRow.outputJson))
    : null;
  const compiler = compilerRow
    ? thesisCompilerOutputSchema.safeParse(JSON.parse(compilerRow.outputJson))
    : null;
  const shortlist = compiler?.success ? compiler.data.tickers : hd?.success ? hd.data.tickers.slice(0, 5) : [];
  const allSoft = [
    ...parseSoftFromRows(irRows, thesisIrOutputSchema),
    ...parseSoftFromRows(webRows, thesisWebOutputSchema),
  ];

  const evaluations: ThesisEvaluateTicker[] = [];
  for (const ticker of shortlist) {
    const facts = (hd?.success ? hd.data.facts : []).filter(
      (f) => f.asset_id.toUpperCase() === ticker.toUpperCase(),
    );
    const soft = allSoft.filter((s) => s.asset_id.toUpperCase() === ticker.toUpperCase());
    const candidate = hd?.success
      ? hd.data.candidates.find((c) => c.ticker.toUpperCase() === ticker.toUpperCase())
      : undefined;
    const assessment = scoreThesisAssessment({ facts, soft });
    const cap = maxConvictionForAssessment(assessment);
    let draft = fallbackDraft(ticker, locale, assessment, facts);
    const gatewayOk = await resolveGatewayApiKey();
    let tokensInput = 0;
    let tokensOutput = 0;
    if (gatewayOk) {
      const model = await resolveScreeningGatewayModel("screening_compiler");
      try {
        const res = await fetchGatewayChatCompletions({
          model,
          stream: false,
          max_tokens: 1600,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: `Write a falsifiable investment thesis draft for ${ticker}. Language: ${locale}.
Never use buy/sell/hold. Kill criteria MUST use metric_field_id from FACTS (e.g. EQ:D1, EQ:E1). Premortem min 50 chars. Scenarios bull/base/bear probabilities sum to 1. Conviction 1-${cap}. If a gate failed, status=watchlist and conviction <=2.
Call submit_draft.`,
            },
            {
              role: "user",
              content: JSON.stringify({
                assessment,
                facts: facts.map((f) => ({
                  field_id: f.field_id,
                  value: f.value,
                  method: f.method,
                })),
                gaps: candidate ? [] : ["candidate_row_missing"],
              }).slice(0, 12000),
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_draft",
                description: "Thesis draft",
                parameters: { type: "object", additionalProperties: true },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_draft" } },
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
          const parsedJson = JSON.parse(raw) as Record<string, unknown>;
          if (typeof parsedJson.statement === "string" && ADVICE_LANGUAGE.test(parsedJson.statement)) {
            parsedJson.statement = fallbackDraft(ticker, locale, assessment, facts)?.statement;
          }
          const parsed = thesisDraftSchema.safeParse({
            ...parsedJson,
            ticker,
            conviction: Math.min(
              cap,
              Number(parsedJson.conviction) || 1,
            ),
            status:
              assessment.verdict === "watchlist_gate_failed"
                ? "watchlist"
                : parsedJson.status ?? "draft",
            disclaimer: locale.startsWith("es") ? DISCLAIMER_ES : DISCLAIMER_EN,
          });
          if (parsed.success) draft = parsed.data;
        }
      } catch {
        // keep fallback
      }
      await accrueScreeningLlmCost({
        runId: ctx.runId,
        model,
        tokensInput,
        tokensOutput,
      });
    }
    if (draft && draft.kill_criteria.length > 0) {
      const ids = new Set(facts.map((f) => f.field_id));
      draft = {
        ...draft,
        kill_criteria: draft.kill_criteria.filter((k) => ids.has(k.metric_field_id)),
      };
      if (draft.kill_criteria.length === 0) {
        draft = {
          ...draft,
          gaps: [...draft.gaps, "Kill criteria dropped — field_id not in facts."],
        };
      }
    }
    evaluations.push({
      ticker,
      companyName: candidate?.name || ticker,
      assessment,
      thesis_draft: draft,
      narrative: draft
        ? `${draft.statement}\n\n${draft.premortem}`
        : undefined,
    });
  }

  const output = thesisEvaluateOutputSchema.parse({
    evaluations,
    ruleset_version: THESIS_RULESET_VERSION,
    locale,
    generatedAt: new Date().toISOString(),
  });
  await insertScreeningAgentOutput({
    userId: ctx.userId,
    runId: ctx.runId,
    agentKind: THESIS_EVALUATE_KIND,
    outputJson: JSON.stringify(output),
    latencyMs: Date.now() - started,
  });
  return { status: "ok", payload: { tickerCount: evaluations.length } };
};

registerHandler(THESIS_EVALUATE_KIND, runThesisEvaluateStep);
