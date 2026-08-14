import { getGlobalFmpApiKey, insertScreeningAgentOutput } from "@/lib/db";
import { FmpMarketDataProvider } from "@/lib/api-providers/fmp-market-data";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import { deriveScreeningTechnicals } from "@/lib/screening/data/technicals-derive";
import { noteScreeningProviderQuota } from "@/lib/screening/provider-circuit";
import {
  technicalsOutputSchema,
  type TechnicalsOutput,
} from "@/lib/screening/schemas";

export const TECHNICALS_AGENT_KIND = "technicals";

/**
 * Per-ticker deterministic technicals from FMP OHLC (1y).
 *
 * Non-blocking by design: if FMP fails we persist a nulled row so the
 * aggregator still gets a placeholder and the report can compose without
 * this ticker's technicals block.
 */
export const runTechnicalsStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const ticker = ctx.step.ticker?.toUpperCase().trim();
  if (!ticker) {
    return { status: "error", errorMessage: "ticker_missing", fatal: true };
  }

  const startedAt = Date.now();
  const apiKey = getGlobalFmpApiKey();

  let output: TechnicalsOutput;
  if (!apiKey) {
    output = deriveScreeningTechnicals({
      ticker,
      history: [],
      currentPrice: null,
      currency: null,
    });
    output.gaps = ["missing_fmp_api_key"];
  } else {
    try {
      const provider = new FmpMarketDataProvider(apiKey);
      const [quote, history] = await Promise.all([
        provider.getQuote(ticker).catch(() => null),
        provider.getHistorical(ticker, "1y").catch(() => []),
      ]);
      output = deriveScreeningTechnicals({
        ticker,
        history: history ?? [],
        currentPrice: quote?.regularMarketPrice ?? null,
        currency: quote?.currency ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (/\b429\b|rate limit/i.test(msg)) {
        noteScreeningProviderQuota({
          provider: "fmp",
          statusCode: 429,
          detail: msg.slice(0, 300),
        });
      }
      output = deriveScreeningTechnicals({
        ticker,
        history: [],
        currentPrice: null,
        currency: null,
      });
      output.gaps = [
        `fetch_failed:${msg.slice(0, 80)}`,
      ];
    }
  }

  const validated = technicalsOutputSchema.safeParse(output);
  const payloadJson = validated.success
    ? JSON.stringify(validated.data)
    : JSON.stringify(output);

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: TECHNICALS_AGENT_KIND,
      ticker,
      outputJson: payloadJson,
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error(
      "[screening/technicals] persist failed",
      ticker,
      err instanceof Error ? err.message : err,
    );
    return { status: "error", errorMessage: "persist_failed" };
  }

  return {
    status: "ok",
    payload: {
      ticker,
      hasHistory: (output.gaps ?? []).length === 0,
      aboveMa200: output.aboveMa200,
      return1yPct: output.return1yPct,
    },
  };
};

registerHandler(TECHNICALS_AGENT_KIND, runTechnicalsStep);
