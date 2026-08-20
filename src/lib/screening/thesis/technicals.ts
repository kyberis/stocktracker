import { getGlobalFmpApiKey, insertScreeningAgentOutput } from "@/lib/db";
import { FmpMarketDataProvider } from "@/lib/api-providers/fmp-market-data";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import { deriveScreeningTechnicals } from "@/lib/screening/data/technicals-derive";
import { THESIS_TECHNICALS_KIND } from "@/lib/screening/thesis/kinds";

export { THESIS_TECHNICALS_KIND };

const runThesisTechnicalsStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const ticker = ctx.step.ticker?.toUpperCase().trim();
  if (!ticker) return { status: "error", errorMessage: "ticker_missing", fatal: true };
  const startedAt = Date.now();
  const apiKey = getGlobalFmpApiKey();
  let output = deriveScreeningTechnicals({
    ticker,
    history: [],
    currentPrice: null,
    currency: null,
  });
  if (apiKey) {
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
    } catch {
      output.gaps = ["fetch_failed"];
    }
  } else {
    output.gaps = ["missing_fmp_api_key"];
  }
  await insertScreeningAgentOutput({
    userId: ctx.userId,
    runId: ctx.runId,
    agentKind: THESIS_TECHNICALS_KIND,
    ticker,
    outputJson: JSON.stringify(output),
    latencyMs: Date.now() - startedAt,
  });
  return { status: "ok", payload: { ticker } };
};

registerHandler(THESIS_TECHNICALS_KIND, runThesisTechnicalsStep);
