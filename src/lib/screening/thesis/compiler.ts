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
import { SCREENING_MAX_CANDIDATES } from "@/lib/screening/constants";
import { screeningBriefSchema } from "@/lib/screening/schemas";
import { THESIS_COMPILER_KIND, THESIS_HARD_DATA_KIND } from "@/lib/screening/thesis/kinds";
import {
  thesisCompilerOutputSchema,
  thesisHardDataOutputSchema,
} from "@/lib/screening/thesis/schemas";

export { THESIS_COMPILER_KIND };

const runThesisCompilerStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const started = Date.now();
  let limit = SCREENING_MAX_CANDIDATES;
  try {
    const brief = screeningBriefSchema.parse(JSON.parse(ctx.briefJson));
    limit = brief.intent === "analyze" ? 1 : SCREENING_MAX_CANDIDATES;
  } catch {
    // keep default
  }
  const hdRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    THESIS_HARD_DATA_KIND,
  );
  const hd = hdRow
    ? thesisHardDataOutputSchema.safeParse(JSON.parse(hdRow.outputJson))
    : null;
  const ranked = [...(hd?.success ? hd.data.candidates : [])].sort(
    (a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0),
  );
  const tickers = ranked.slice(0, limit).map((c) => c.ticker);
  const output = thesisCompilerOutputSchema.parse({
    tickers,
    notes: ["Shortlist from Hard Data rank. Narrative is produced in thesis_evaluate."],
    generatedAt: new Date().toISOString(),
  });
  await insertScreeningAgentOutput({
    userId: ctx.userId,
    runId: ctx.runId,
    agentKind: THESIS_COMPILER_KIND,
    outputJson: JSON.stringify(output),
    latencyMs: Date.now() - started,
  });
  return { status: "ok", payload: { tickerCount: tickers.length } };
};

registerHandler(THESIS_COMPILER_KIND, runThesisCompilerStep);
