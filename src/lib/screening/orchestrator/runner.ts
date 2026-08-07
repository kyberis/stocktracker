import { randomUUID } from "crypto";

import {
  appendEvent,
  completeStep,
  countPendingStepsForRun,
  failStep,
  getScreeningRunUnscoped,
  leasePendingStep,
  updateScreeningRunStatus,
} from "@/lib/db";
import "@/lib/screening/orchestrator/register";
import {
  getHandler,
  type HandlerContext,
  type HandlerResult,
} from "@/lib/screening/orchestrator/handlers";
import { recordScreeningStep } from "@/lib/screening/metrics";

/** Default lease horizon per step. Handlers must finish inside this window. */
/** Web/IR steps fetch FMP + Tavily + LLM; 55s was too short and left orphans. */
export const DEFAULT_LEASE_MS = 180_000;

export interface RunnerOptions {
  /** Restrict work to one run (used by the immediate post-launch dispatch). */
  runId?: string | null;
  /** Unique id for this worker invocation — becomes the step's `lease_owner`. */
  ownerId?: string;
  leaseMs?: number;
}

export interface RunnerResult {
  processed: number;
  status: "no_work" | "processed" | "handler_missing" | "failed";
  stepId?: string;
  agentKind?: string;
  errorMessage?: string;
  /** True when the run still has queued / running steps and the worker should be re-invoked. */
  moreWork: boolean;
}

/**
 * Lease and execute a single step. The worker HTTP route calls this once per
 * request and self-invokes if `moreWork` is true.
 */
export async function processOneStep(opts: RunnerOptions = {}): Promise<RunnerResult> {
  const ownerId = opts.ownerId ?? `worker-${randomUUID()}`;
  const leaseMs = opts.leaseMs ?? DEFAULT_LEASE_MS;

  const step = await leasePendingStep({
    runId: opts.runId ?? null,
    ownerId,
    leaseMs,
  });
  if (!step) {
    return { processed: 0, status: "no_work", moreWork: false };
  }

  const handler = getHandler(step.agentKind);
  if (!handler) {
    const errorMessage = `no_handler_for_${step.agentKind}`;
    await failStep({ stepId: step.id, ownerId, errorMessage });
    recordScreeningStep({
      agentKind: step.agentKind,
      status: "failed",
      durationMs: 0,
      reason: "no_handler",
    });
    return {
      processed: 1,
      status: "handler_missing",
      stepId: step.id,
      agentKind: step.agentKind,
      errorMessage,
      moreWork: await runHasWork(step.runId),
    };
  }

  const run = await getScreeningRunUnscoped(step.runId).catch(() => null);
  const briefJson = run?.briefJson ?? "";
  const userId = run?.userId ?? "";

  const started = Date.now();
  let result: HandlerResult;
  try {
    const ctx: HandlerContext = {
      step,
      userId,
      runId: step.runId,
      briefJson,
    };
    result = await handler(ctx);
  } catch (err) {
    result = {
      status: "error",
      errorMessage: err instanceof Error ? err.message : "handler_threw",
    };
  }
  const durationMs = Date.now() - started;

  if (result.status === "ok") {
    await completeStep({ stepId: step.id, ownerId, payload: result.payload });
    recordScreeningStep({
      agentKind: step.agentKind,
      status: "done",
      durationMs,
    });
    // If this was the last step, mark the run as completed.
    const remaining = await countPendingStepsForRun(step.runId);
    if (remaining === 0 && run) {
      try {
        await updateScreeningRunStatus(step.runId, run.userId, "completed");
        await appendEvent({
          runId: step.runId,
          eventType: "ReportReady",
        });
      } catch {
        // best-effort
      }
    }
    return {
      processed: 1,
      status: "processed",
      stepId: step.id,
      agentKind: step.agentKind,
      moreWork: remaining > 0,
    };
  }

  // failure path
  await failStep({
    stepId: step.id,
    ownerId,
    errorMessage: result.errorMessage,
  });
  recordScreeningStep({
    agentKind: step.agentKind,
    status: "failed",
    durationMs,
    reason: result.errorMessage.slice(0, 64),
  });
  return {
    processed: 1,
    status: "failed",
    stepId: step.id,
    agentKind: step.agentKind,
    errorMessage: result.errorMessage,
    moreWork: await runHasWork(step.runId),
  };
}

async function runHasWork(runId: string): Promise<boolean> {
  try {
    const c = await countPendingStepsForRun(runId);
    return c > 0;
  } catch {
    return false;
  }
}
