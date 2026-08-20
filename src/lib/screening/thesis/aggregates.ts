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
  THESIS_AGGREGATE_IR_KIND,
  THESIS_AGGREGATE_TECHNICALS_KIND,
  THESIS_AGGREGATE_WEB_KIND,
  THESIS_IR_KIND,
  THESIS_TECHNICALS_KIND,
  THESIS_WEB_KIND,
} from "@/lib/screening/thesis/kinds";

async function collect(ctx: HandlerContext, kind: string, outKind: string) {
  const rows = await listScreeningAgentOutputsByRunAndKind(ctx.runId, kind);
  const items: unknown[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.outputJson) as { ticker?: string };
      const key = String(parsed.ticker ?? row.ticker ?? "").toUpperCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push(parsed);
    } catch {
      // skip
    }
  }
  await insertScreeningAgentOutput({
    userId: ctx.userId,
    runId: ctx.runId,
    agentKind: outKind,
    outputJson: JSON.stringify({
      tickers: items,
      generatedAt: new Date().toISOString(),
    }),
    latencyMs: 0,
  });
  return items.length;
}

const runAggIr: StepHandler = async (ctx) => {
  const n = await collect(ctx, THESIS_IR_KIND, THESIS_AGGREGATE_IR_KIND);
  return { status: "ok", payload: { tickerCount: n } };
};
const runAggWeb: StepHandler = async (ctx) => {
  const n = await collect(ctx, THESIS_WEB_KIND, THESIS_AGGREGATE_WEB_KIND);
  return { status: "ok", payload: { tickerCount: n } };
};
const runAggTech: StepHandler = async (ctx) => {
  const n = await collect(ctx, THESIS_TECHNICALS_KIND, THESIS_AGGREGATE_TECHNICALS_KIND);
  return { status: "ok", payload: { tickerCount: n } };
};

registerHandler(THESIS_AGGREGATE_IR_KIND, runAggIr);
registerHandler(THESIS_AGGREGATE_WEB_KIND, runAggWeb);
registerHandler(THESIS_AGGREGATE_TECHNICALS_KIND, runAggTech);
