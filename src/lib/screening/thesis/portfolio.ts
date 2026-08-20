import {
  getLatestScreeningAgentOutputUnscoped,
  insertScreeningAgentOutput,
  listCashEntries,
  listHoldings,
} from "@/lib/db";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import { THESIS_HARD_DATA_KIND, THESIS_PORTFOLIO_KIND } from "@/lib/screening/thesis/kinds";
import { thesisHardDataOutputSchema } from "@/lib/screening/thesis/schemas";

export { THESIS_PORTFOLIO_KIND };

const runThesisPortfolioStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const started = Date.now();
  const hdRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    THESIS_HARD_DATA_KIND,
  );
  const hd = hdRow
    ? thesisHardDataOutputSchema.safeParse(JSON.parse(hdRow.outputJson))
    : null;
  const tickers = hd?.success ? hd.data.tickers : [];
  const [holdings, cash] = await Promise.all([
    listHoldings(ctx.userId).catch(() => []),
    listCashEntries(ctx.userId).catch(() => []),
  ]);
  const held = new Set(holdings.map((h) => h.ticker.toUpperCase()));
  const cashEur = cash.reduce((s, c) => s + (c.amountEUR || 0), 0);
  const perCandidate = tickers.map((ticker) => {
    const overlap = held.has(ticker.toUpperCase());
    return {
      ticker,
      positionKind: overlap ? "top_up_existing" : "new_position",
      overlapNotes: overlap
        ? "Already in the portfolio — adding would increase the same bet (checklist K6)."
        : "Not currently held. Correlation with the rest of the book is not measured here.",
      illustrativeAllocationEur: {
        min: Math.min(500, Math.max(0, cashEur * 0.05)),
        max: Math.min(5000, Math.max(100, cashEur * 0.15)),
      },
      note: "Illustrative cash split only — not conviction × ruin sizing (K5).",
    };
  });
  await insertScreeningAgentOutput({
    userId: ctx.userId,
    runId: ctx.runId,
    agentKind: THESIS_PORTFOLIO_KIND,
    outputJson: JSON.stringify({
      perCandidate,
      cashAvailableEur: Math.max(0, cashEur),
      generatedAt: new Date().toISOString(),
    }),
    latencyMs: Date.now() - started,
  });
  return { status: "ok", payload: { tickerCount: perCandidate.length } };
};

registerHandler(THESIS_PORTFOLIO_KIND, runThesisPortfolioStep);
