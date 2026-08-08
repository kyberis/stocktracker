import { randomUUID } from "crypto";

import type { InsertStepInput } from "@/lib/db";
import type { QaIssue, QaOutput } from "@/lib/screening/schemas";

/** Hard cap on QA rounds (PRD). */
export const MAX_QA_ROUNDS = 2;

/** Agent kinds that operate per-ticker (candidates for directed rerun). */
const PER_TICKER_KINDS = new Set([
  "ir_business",
  "web_sentiment",
  "technicals",
  "hard_data",
]);

/** Aggregators paired with each per-ticker agent. */
const AGGREGATE_FOR: Record<string, string> = {
  ir_business: "aggregate_ir_business",
  web_sentiment: "aggregate_web_sentiment",
  technicals: "aggregate_technicals",
};

/** Downstream barrier steps that always re-run after any per-ticker change. */
const DOWNSTREAM_STEPS_AFTER_AGGREGATES = ["compiler", "qa"] as const;

export interface RerunPlan {
  /** True when a new round is allowed (below MAX_QA_ROUNDS). */
  canRun: boolean;
  /** Tickers we're re-running per agent kind. */
  targetsByAgent: Map<string, string[]>;
  /** Insert-ready step definitions (in dependency order). */
  steps: InsertStepInput[];
  /** Tickers marked as degraded because we've reached the round cap. */
  degradedTickers: string[];
}

/**
 * Group blocking QA issues by `(agent_kind, ticker)`, refuse to schedule a
 * round beyond MAX_QA_ROUNDS, and return the DAG of new steps to insert.
 *
 * Never mutates the passed-in DB; the caller is responsible for the actual
 * `insertSteps` call.
 */
export function planReruns(input: {
  qaOutput: QaOutput;
  priorRounds: number;
}): RerunPlan {
  const { qaOutput, priorRounds } = input;
  const blocking = qaOutput.issues.filter((i) => i.blocking);
  if (blocking.length === 0) {
    return {
      canRun: false,
      targetsByAgent: new Map(),
      steps: [],
      degradedTickers: [],
    };
  }

  if (priorRounds >= MAX_QA_ROUNDS) {
    // Round cap reached — anything still blocking becomes a degraded ticker.
    const tickers = new Set<string>();
    for (const i of blocking) if (i.ticker) tickers.add(i.ticker.toUpperCase());
    return {
      canRun: false,
      targetsByAgent: new Map(),
      steps: [],
      degradedTickers: [...tickers],
    };
  }

  const targetsByAgent = groupTargets(blocking);
  const steps: InsertStepInput[] = [];
  const perTickerIds: string[] = [];
  const aggregateIds: string[] = [];
  const seenAggregate = new Set<string>();

  for (const [agentKind, tickers] of targetsByAgent) {
    if (!PER_TICKER_KINDS.has(agentKind)) continue;
    for (const ticker of tickers) {
      const id = randomUUID();
      perTickerIds.push(id);
      steps.push({
        id,
        agentKind,
        ticker,
        dependsOn: [],
      });
    }
    const aggregateKind = AGGREGATE_FOR[agentKind];
    if (aggregateKind && !seenAggregate.has(aggregateKind)) {
      seenAggregate.add(aggregateKind);
      const aggregateId = randomUUID();
      aggregateIds.push(aggregateId);
      // depend on the per-ticker ids we just queued for THIS agent
      const dependsOn = steps
        .filter((s) => s.agentKind === agentKind)
        .map((s) => s.id!)
        .filter(Boolean);
      steps.push({
        id: aggregateId,
        agentKind: aggregateKind,
        dependsOn,
      });
    }
  }

  // If none of the flagged agent kinds are per-ticker (e.g. compiler-only
  // issues), we still schedule a fresh compiler + qa round to give the LLM a
  // chance to re-write with the QA hint.
  const compilerId = randomUUID();
  const qaId = randomUUID();
  steps.push({
    id: compilerId,
    agentKind: DOWNSTREAM_STEPS_AFTER_AGGREGATES[0],
    dependsOn: aggregateIds,
  });
  steps.push({
    id: qaId,
    agentKind: DOWNSTREAM_STEPS_AFTER_AGGREGATES[1],
    dependsOn: [compilerId],
  });

  return {
    canRun: true,
    targetsByAgent,
    steps,
    degradedTickers: [],
  };
}

function groupTargets(issues: QaIssue[]): Map<string, string[]> {
  const out = new Map<string, Set<string>>();
  for (const i of issues) {
    if (!i.agentKind || !i.ticker) continue;
    const kind = i.agentKind;
    if (!PER_TICKER_KINDS.has(kind)) continue;
    const set = out.get(kind) ?? new Set<string>();
    set.add(i.ticker.toUpperCase());
    out.set(kind, set);
  }
  const asArrayMap = new Map<string, string[]>();
  for (const [k, v] of out) asArrayMap.set(k, [...v]);
  return asArrayMap;
}
