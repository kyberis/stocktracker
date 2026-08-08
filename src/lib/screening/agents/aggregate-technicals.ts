import {
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
  aggregateTechnicalsOutputSchema,
  technicalsOutputSchema,
  type AggregateTechnicalsOutput,
  type TechnicalsOutput,
} from "@/lib/screening/schemas";
import { TECHNICALS_AGENT_KIND } from "@/lib/screening/agents/technicals";

export const AGGREGATE_TECHNICALS_AGENT_KIND = "aggregate_technicals";

/**
 * Barrier step: no LLM. Collects every per-ticker technicals output for the
 * run into a single aggregate row. Mirrors `aggregate-ir.ts` / `aggregate-web.ts`.
 */
export const runAggregateTechnicalsStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const rows = await listScreeningAgentOutputsByRunAndKind(
    ctx.runId,
    TECHNICALS_AGENT_KIND,
  );

  const tickers: TechnicalsOutput[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    try {
      const parsed = technicalsOutputSchema.safeParse(
        JSON.parse(row.outputJson),
      );
      if (!parsed.success) continue;
      const key = parsed.data.ticker.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tickers.push(parsed.data);
    } catch {
      // skip malformed rows
    }
  }

  const aggregate: AggregateTechnicalsOutput =
    aggregateTechnicalsOutputSchema.parse({
      tickers,
      generatedAt: new Date().toISOString(),
    });

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: AGGREGATE_TECHNICALS_AGENT_KIND,
      outputJson: JSON.stringify(aggregate),
      latencyMs: 0,
    });
  } catch (err) {
    console.error(
      "[screening/aggregate-technicals] persist failed",
      err instanceof Error ? err.message : err,
    );
    return { status: "error", errorMessage: "aggregate_persist_failed" };
  }

  return {
    status: "ok",
    payload: {
      tickerCount: tickers.length,
      withHistory: tickers.filter((t) => (t.gaps ?? []).length === 0).length,
    },
  };
};

registerHandler(
  AGGREGATE_TECHNICALS_AGENT_KIND,
  runAggregateTechnicalsStep,
);
