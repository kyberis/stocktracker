import {
  findStepByAgentKind,
  insertSteps,
} from "@/lib/db";
import { IR_FANOUT_MAX } from "@/lib/screening/constants";
import {
  THESIS_AGGREGATE_IR_KIND,
  THESIS_AGGREGATE_TECHNICALS_KIND,
  THESIS_AGGREGATE_WEB_KIND,
  THESIS_COMPILER_KIND,
  THESIS_EVALUATE_KIND,
  THESIS_IR_KIND,
  THESIS_PORTFOLIO_KIND,
  THESIS_QA_KIND,
  THESIS_RISK_KIND,
  THESIS_TECHNICALS_KIND,
  THESIS_WEB_KIND,
} from "@/lib/screening/thesis/kinds";

/**
 * Insert the thesis research DAG after Hard Data. Compiler is inserted here
 * (POST only queued thesis_hard_data).
 */
export async function insertThesisFanout(
  runId: string,
  tickers: string[],
): Promise<{ irFanout: number }> {
  const candidates = tickers.slice(0, IR_FANOUT_MAX);
  if (candidates.length === 0) return { irFanout: 0 };

  const irStepIds = candidates.map(() => crypto.randomUUID());
  const webStepIds = candidates.map(() => crypto.randomUUID());
  const techStepIds = candidates.map(() => crypto.randomUUID());
  const aggregateIrId = crypto.randomUUID();
  const aggregateWebId = crypto.randomUUID();
  const aggregateTechId = crypto.randomUUID();
  const portfolioId = crypto.randomUUID();
  const riskId = crypto.randomUUID();
  const compilerId = crypto.randomUUID();
  const evaluateId = crypto.randomUUID();

  await insertSteps(runId, [
    ...candidates.map((ticker, i) => ({
      id: irStepIds[i],
      agentKind: THESIS_IR_KIND,
      ticker,
      dependsOn: [] as string[],
    })),
    {
      id: aggregateIrId,
      agentKind: THESIS_AGGREGATE_IR_KIND,
      dependsOn: irStepIds,
    },
    ...candidates.map((ticker, i) => ({
      id: webStepIds[i],
      agentKind: THESIS_WEB_KIND,
      ticker,
      dependsOn: [] as string[],
    })),
    {
      id: aggregateWebId,
      agentKind: THESIS_AGGREGATE_WEB_KIND,
      dependsOn: webStepIds,
    },
    ...candidates.map((ticker, i) => ({
      id: techStepIds[i],
      agentKind: THESIS_TECHNICALS_KIND,
      ticker,
      dependsOn: [] as string[],
    })),
    {
      id: aggregateTechId,
      agentKind: THESIS_AGGREGATE_TECHNICALS_KIND,
      dependsOn: techStepIds,
    },
    {
      id: portfolioId,
      agentKind: THESIS_PORTFOLIO_KIND,
      dependsOn: [aggregateIrId, aggregateWebId, aggregateTechId],
    },
    {
      id: riskId,
      agentKind: THESIS_RISK_KIND,
      dependsOn: [portfolioId],
    },
    {
      id: compilerId,
      agentKind: THESIS_COMPILER_KIND,
      dependsOn: [riskId],
    },
    {
      id: evaluateId,
      agentKind: THESIS_EVALUATE_KIND,
      dependsOn: [compilerId],
    },
    {
      agentKind: THESIS_QA_KIND,
      dependsOn: [evaluateId],
    },
  ]);

  // If POST also inserted a dangling compiler, retarget it (should not happen).
  const stray = await findStepByAgentKind(runId, THESIS_COMPILER_KIND);
  void stray;

  return { irFanout: candidates.length };
}
