import { insertSteps } from "@/lib/db";
import { IR_FANOUT_MAX } from "@/lib/screening/constants";
import {
  THESIS_EVALUATE_KIND,
  THESIS_QA_KIND,
  THESIS_RESEARCH_KIND,
} from "@/lib/screening/thesis/kinds";

/**
 * After Hard Data: Research (per ticker) → Writer (evaluate) → QA.
 * Replaces the old IR/Web/Tech/Portfolio/Risk/Compiler DAG.
 */
export async function insertThesisFanout(
  runId: string,
  tickers: string[],
): Promise<{ irFanout: number }> {
  const candidates = tickers.slice(0, IR_FANOUT_MAX);
  if (candidates.length === 0) return { irFanout: 0 };

  const researchIds = candidates.map(() => crypto.randomUUID());
  const evaluateId = crypto.randomUUID();

  await insertSteps(runId, [
    ...candidates.map((ticker, i) => ({
      id: researchIds[i],
      agentKind: THESIS_RESEARCH_KIND,
      ticker,
      dependsOn: [] as string[],
    })),
    {
      id: evaluateId,
      agentKind: THESIS_EVALUATE_KIND,
      dependsOn: researchIds,
    },
    {
      agentKind: THESIS_QA_KIND,
      dependsOn: [evaluateId],
    },
  ]);

  return { irFanout: candidates.length };
}
