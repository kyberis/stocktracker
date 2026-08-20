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
import {
  THESIS_EVALUATE_KIND,
  THESIS_HARD_DATA_KIND,
  THESIS_IR_KIND,
  THESIS_QA_KIND,
  THESIS_WEB_KIND,
} from "@/lib/screening/thesis/kinds";
import {
  ADVICE_LANGUAGE,
  thesisEvaluateOutputSchema,
  thesisHardDataOutputSchema,
  thesisIrOutputSchema,
  thesisQaOutputSchema,
  thesisWebOutputSchema,
  type ThesisEvaluateTicker,
  type ThesisFact,
  type ThesisQaOutput,
  type ThesisSoftAssessment,
} from "@/lib/screening/thesis/schemas";

export { THESIS_QA_KIND };

export function collectThesisQaIssues(opts: {
  evaluations: ThesisEvaluateTicker[];
  facts: ThesisFact[];
  soft: ThesisSoftAssessment[];
}): { issues: ThesisQaOutput["issues"]; degraded: string[] } {
  const issues: ThesisQaOutput["issues"] = [];
  const degraded: string[] = [];

  for (const row of opts.evaluations) {
    const draft = row.thesis_draft;
    if (draft && ADVICE_LANGUAGE.test(`${draft.statement} ${draft.premortem}`)) {
      issues.push({
        ruleId: "T-ADV",
        ticker: row.ticker,
        summary: "Advisory language (buy/sell/hold) in thesis narrative",
        blocking: true,
      });
      degraded.push(row.ticker);
    }
    if (draft && draft.kill_criteria.length === 0) {
      issues.push({
        ruleId: "T-K2",
        ticker: row.ticker,
        summary: "No code-evaluable kill criterion bound to a fact field",
        blocking: false,
      });
    }
    if (
      row.assessment.verdict === "watchlist_gate_failed" &&
      (draft?.conviction ?? 0) > 2
    ) {
      issues.push({
        ruleId: "T-GATE",
        ticker: row.ticker,
        summary: "High conviction despite a failed gate",
        blocking: true,
      });
      degraded.push(row.ticker);
    }
  }

  for (const soft of opts.soft) {
    if (soft.score != null && soft.evidence.length === 0) {
      issues.push({
        ruleId: "T-SOFT",
        ticker: soft.asset_id,
        summary: `Soft score on ${soft.field_id} without a citable quote`,
        blocking: true,
      });
      degraded.push(soft.asset_id);
    }
  }

  for (const fact of opts.facts) {
    if (fact.method === "estimated" && !fact.estimation_method) {
      issues.push({
        ruleId: "T-EST",
        ticker: fact.asset_id,
        summary: `Estimated fact ${fact.field_id} is missing estimation_method`,
        blocking: true,
      });
      degraded.push(fact.asset_id);
    }
    // Disputed facts are provenance flags only — they must not auto-fire kill criteria.
    void fact.disputed;
  }

  return { issues, degraded: [...new Set(degraded)] };
}

const runThesisQaStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const started = Date.now();
  const [evRow, hdRow, irRows, webRows] = await Promise.all([
    getLatestScreeningAgentOutputUnscoped(ctx.runId, THESIS_EVALUATE_KIND),
    getLatestScreeningAgentOutputUnscoped(ctx.runId, THESIS_HARD_DATA_KIND),
    listScreeningAgentOutputsByRunAndKind(ctx.runId, THESIS_IR_KIND),
    listScreeningAgentOutputsByRunAndKind(ctx.runId, THESIS_WEB_KIND),
  ]);
  const ev = evRow
    ? thesisEvaluateOutputSchema.safeParse(JSON.parse(evRow.outputJson))
    : null;
  const hd = hdRow
    ? thesisHardDataOutputSchema.safeParse(JSON.parse(hdRow.outputJson))
    : null;
  const soft: ThesisSoftAssessment[] = [];
  for (const row of irRows) {
    const parsed = thesisIrOutputSchema.safeParse(JSON.parse(row.outputJson));
    if (parsed.success) soft.push(...parsed.data.soft_assessments);
  }
  for (const row of webRows) {
    const parsed = thesisWebOutputSchema.safeParse(JSON.parse(row.outputJson));
    if (parsed.success) soft.push(...parsed.data.soft_assessments);
  }

  const issues: ThesisQaOutput["issues"] = [];
  let degraded: string[] = [];
  if (!ev?.success) {
    issues.push({
      ruleId: "T0",
      ticker: null,
      summary: "thesis_evaluate output missing or invalid",
      blocking: true,
    });
  } else {
    const collected = collectThesisQaIssues({
      evaluations: ev.data.evaluations,
      facts: hd?.success ? hd.data.facts : [],
      soft,
    });
    issues.push(...collected.issues);
    degraded = collected.degraded;
  }
  const blocking = issues.some((i) => i.blocking);
  const output = thesisQaOutputSchema.parse({
    verdict: blocking
      ? degraded.length > 0
        ? "pass_with_degradation"
        : "fail"
      : "pass",
    issues,
    degradedTickers: [...new Set(degraded)],
    generatedAt: new Date().toISOString(),
  });
  await insertScreeningAgentOutput({
    userId: ctx.userId,
    runId: ctx.runId,
    agentKind: THESIS_QA_KIND,
    outputJson: JSON.stringify(output),
    latencyMs: Date.now() - started,
  });
  return { status: "ok", payload: { verdict: output.verdict } };
};

registerHandler(THESIS_QA_KIND, runThesisQaStep);
