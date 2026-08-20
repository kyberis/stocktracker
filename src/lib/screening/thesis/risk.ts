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
import { THESIS_HARD_DATA_KIND, THESIS_RISK_KIND } from "@/lib/screening/thesis/kinds";
import { thesisHardDataOutputSchema } from "@/lib/screening/thesis/schemas";

export { THESIS_RISK_KIND };

const runThesisRiskStep: StepHandler = async (
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
  const perCandidate = (hd?.success ? hd.data.candidates : []).map((c) => {
    const flags: string[] = [];
    if (c.thinLiquidity) flags.push("thin_liquidity");
    if (c.ndEbitda != null && c.ndEbitda >= 3) flags.push("leverage_gate");
    if (c.severeDilution) flags.push("dilution");
    return {
      ticker: c.ticker,
      riskFlags: flags,
      key_risks: flags.map((flag) => ({
        risk: flag,
        likelihood: "medium" as const,
        impact: flag === "leverage_gate" ? ("high" as const) : ("medium" as const),
        monitorable_via: flag === "leverage_gate" ? "EQ:E1" : undefined,
      })),
    };
  });
  await insertScreeningAgentOutput({
    userId: ctx.userId,
    runId: ctx.runId,
    agentKind: THESIS_RISK_KIND,
    outputJson: JSON.stringify({
      perCandidate,
      generatedAt: new Date().toISOString(),
    }),
    latencyMs: Date.now() - started,
  });
  return { status: "ok", payload: { tickerCount: perCandidate.length } };
};

registerHandler(THESIS_RISK_KIND, runThesisRiskStep);
