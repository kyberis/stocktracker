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
  aggregateIrBusinessOutputSchema,
  irBusinessOutputSchema,
  type AggregateIrBusinessOutput,
  type IrBusinessOutput,
} from "@/lib/screening/schemas";
import { IR_BUSINESS_AGENT_KIND } from "@/lib/screening/agents/ir-business";

export const AGGREGATE_IR_AGENT_KIND = "aggregate_ir_business";

/**
 * Barrier step: no LLM. Collects every per-ticker IR output for the run into
 * a single aggregate row the Compiler (and later QA) can read.
 */
export const runAggregateIrStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const rows = await listScreeningAgentOutputsByRunAndKind(
    ctx.runId,
    IR_BUSINESS_AGENT_KIND,
  );

  const tickers: IrBusinessOutput[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    try {
      const parsed = irBusinessOutputSchema.safeParse(
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

  const aggregate: AggregateIrBusinessOutput =
    aggregateIrBusinessOutputSchema.parse({
      tickers,
      generatedAt: new Date().toISOString(),
    });

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: AGGREGATE_IR_AGENT_KIND,
      outputJson: JSON.stringify(aggregate),
      latencyMs: 0,
    });
  } catch (err) {
    console.error(
      "[screening/aggregate-ir] persist failed",
      err instanceof Error ? err.message : err,
    );
    return {
      status: "error",
      errorMessage: "aggregate_persist_failed",
    };
  }

  return {
    status: "ok",
    payload: {
      tickerCount: tickers.length,
      contradictions: tickers.filter((t) => t.contradictionWithHardData).length,
    },
  };
};

registerHandler(AGGREGATE_IR_AGENT_KIND, runAggregateIrStep);
