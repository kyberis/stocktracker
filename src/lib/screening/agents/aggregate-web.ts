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
  aggregateWebSentimentOutputSchema,
  webSentimentOutputSchema,
  type AggregateWebSentimentOutput,
  type WebSentimentOutput,
} from "@/lib/screening/schemas";
import { WEB_SENTIMENT_AGENT_KIND } from "@/lib/screening/agents/web-sentiment";

export const AGGREGATE_WEB_AGENT_KIND = "aggregate_web_sentiment";

/**
 * Barrier step: no LLM. Collects every per-ticker Web & Sentiment output
 * into a single aggregate row for Portfolio Context / Compiler.
 */
export const runAggregateWebStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const rows = await listScreeningAgentOutputsByRunAndKind(
    ctx.runId,
    WEB_SENTIMENT_AGENT_KIND,
  );

  const tickers: WebSentimentOutput[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    try {
      const parsed = webSentimentOutputSchema.safeParse(
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

  const aggregate: AggregateWebSentimentOutput =
    aggregateWebSentimentOutputSchema.parse({
      tickers,
      generatedAt: new Date().toISOString(),
    });

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: AGGREGATE_WEB_AGENT_KIND,
      outputJson: JSON.stringify(aggregate),
      latencyMs: 0,
    });
  } catch (err) {
    console.error(
      "[screening/aggregate-web] persist failed",
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
      unconfirmed: tickers.reduce(
        (n, t) =>
          n +
          t.signals.filter((s) => s.confirmation === "single_source_unconfirmed")
            .length,
        0,
      ),
    },
  };
};

registerHandler(AGGREGATE_WEB_AGENT_KIND, runAggregateWebStep);
