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
import { fallbackThesisDraft } from "@/lib/screening/thesis/fallback-draft";
import {
  buildReadableThesis,
  joinReadableThesis,
} from "@/lib/screening/thesis/readable";
import {
  maxConvictionForAssessment,
  scoreThesisAssessment,
} from "@/lib/screening/thesis/score-assessment";
import {
  THESIS_EVALUATE_KIND,
  THESIS_HARD_DATA_KIND,
  THESIS_RESEARCH_KIND,
} from "@/lib/screening/thesis/kinds";
import {
  ADVICE_LANGUAGE,
  THESIS_RULESET_VERSION,
  thesisDraftSchema,
  thesisEvaluateOutputSchema,
  thesisHardDataOutputSchema,
  thesisIrOutputSchema,
  thesisSoftAssessmentSchema,
  type ThesisEvaluateTicker,
  type ThesisSoftAssessment,
} from "@/lib/screening/thesis/schemas";

export { THESIS_EVALUATE_KIND };

const DISCLAIMER_EN =
  "This analysis is informational and does not constitute investment advice. AI output may be incomplete.";
const DISCLAIMER_ES =
  "Este análisis es informativo y no constituye asesoramiento de inversión. La salida de IA puede estar incompleta.";

function parseSoftFromRows(
  rows: Array<{ outputJson: string }>,
): ThesisSoftAssessment[] {
  const out: ThesisSoftAssessment[] = [];
  for (const row of rows) {
    try {
      const parsed = thesisIrOutputSchema.safeParse(JSON.parse(row.outputJson));
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
  const [hdRow, researchRows] = await Promise.all([
    getLatestScreeningAgentOutputUnscoped(ctx.runId, THESIS_HARD_DATA_KIND),
    listScreeningAgentOutputsByRunAndKind(ctx.runId, THESIS_RESEARCH_KIND),
  ]);
  const hd = hdRow
    ? thesisHardDataOutputSchema.safeParse(JSON.parse(hdRow.outputJson))
    : null;
  const shortlist = hd?.success ? hd.data.tickers.slice(0, 5) : [];
  const allSoft = parseSoftFromRows(researchRows);

  const evaluations: ThesisEvaluateTicker[] = [];
  for (const ticker of shortlist) {
    const facts = (hd?.success ? hd.data.facts : []).filter(
      (f) => f.asset_id.toUpperCase() === ticker.toUpperCase(),
    );
    const soft = allSoft.filter(
      (s) => s.asset_id.toUpperCase() === ticker.toUpperCase(),
    );
    const candidate = hd?.success
      ? hd.data.candidates.find(
          (c) => c.ticker.toUpperCase() === ticker.toUpperCase(),
        )
      : undefined;
    const assessment = scoreThesisAssessment({
      facts,
      soft,
      sector: candidate?.sector,
      industry: candidate?.industry,
    });
    const cap = maxConvictionForAssessment(assessment);
    let draft =
      fallbackThesisDraft(ticker, locale, assessment, facts, { candidate }) ??
      fallbackThesisDraft(ticker, "en", assessment, facts, { candidate });
    const gatewayOk = await resolveGatewayApiKey();
    let tokensInput = 0;
    let tokensOutput = 0;
    if (gatewayOk) {
      const model = await resolveScreeningGatewayModel("screening_compiler");
      try {
        const res = await fetchGatewayChatCompletions({
          model,
          stream: false,
          max_tokens: 2200,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: `You write an attractiveness research note for ${ticker}. Language: ${locale}.
Structure: for EACH assessment gate (pe_vs_history, eps_growth, margin_trend, graham_rule, balance_sheet, moat, capital_allocation, price_to_book) explain in the writeup:
1) the DATA (numbers with units/periods from FACTS),
2) WHAT IT MEANS (plain definition),
3) HOW TO INTERPRET it for this company (pass/fail/unknown/skipped from assessment.gates).
End with a CONCLUSION synthesizing the eight checks — what fits, what worries, data gaps.
Never use buy/sell/hold or Spanish comprar/vender/mantener. Use only FACTS and SOFT quotes.
Conviction 1-${cap}. If a gate failed, status=watchlist and conviction <=2.
Call submit_draft with statement (2–4 sentences), writeup (full note), premortem, scenarios, gaps, disclaimer.`,
            },
            {
              role: "user",
              content: JSON.stringify({
                candidate: candidate
                  ? {
                      name: candidate.name,
                      sector: candidate.sector,
                      industry: candidate.industry,
                      analysisSummary: candidate.analysisSummary,
                      growthNote: candidate.growthNote,
                      valuationNote: candidate.valuationNote,
                      targetPrice: candidate.targetPrice,
                      upsidePct: candidate.upsidePct,
                      fwdPe: candidate.fwdPe,
                      histPeAvg: candidate.histPeAvg,
                      peerPe: candidate.peerPe,
                      priceToBook: candidate.priceToBook,
                    }
                  : null,
                assessment,
                facts: facts.map((f) => ({
                  field_id: f.field_id,
                  value: f.value,
                  unit: f.unit,
                  period: f.period,
                  method: f.method,
                })),
                soft: soft.map((s) => ({
                  field_id: s.field_id,
                  score: s.score,
                  confidence: s.confidence,
                  rationale: s.rationale,
                  evidence: s.evidence,
                })),
                gaps: candidate ? [] : ["candidate_row_missing"],
              }).slice(0, 14000),
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_draft",
                description: "Attractiveness thesis draft",
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
          if (
            typeof parsedJson.statement === "string" &&
            ADVICE_LANGUAGE.test(parsedJson.statement)
          ) {
            parsedJson.statement = draft?.statement;
          }
          const parsed = thesisDraftSchema.safeParse({
            ...parsedJson,
            ticker,
            conviction: Math.min(cap, Number(parsedJson.conviction) || 1),
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
      // Also allow attractiveness gate ids as kill metric aliases via calc: fields
      draft = {
        ...draft,
        kill_criteria: draft.kill_criteria.filter(
          (k) =>
            ids.has(k.metric_field_id) ||
            k.metric_field_id.startsWith("calc:") ||
            k.metric_field_id.startsWith("EQ:"),
        ),
      };
    }
    const metrics = (hd?.success ? hd.data.metrics ?? [] : []).filter(
      (m) => m.ticker.toUpperCase() === ticker.toUpperCase(),
    );
    const article = buildReadableThesis({
      locale,
      companyName: candidate?.name || ticker,
      ticker,
      industry: candidate?.industry,
      businessSummary: candidate?.analysisSummary,
      assessment,
      facts,
      soft,
      draft,
      metrics,
    });
    const writeup = joinReadableThesis(article, locale).slice(0, 8000);
    if (draft) {
      draft = { ...draft, writeup };
    }
    evaluations.push({
      ticker,
      companyName: candidate?.name || ticker,
      assessment,
      thesis_draft: draft,
      narrative: writeup,
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
