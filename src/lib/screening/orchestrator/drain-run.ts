import { deferTask } from "@/lib/task-runner";
import { processOneStep } from "@/lib/screening/orchestrator/runner";

/**
 * Run screening steps **in-process** (no HTTP self-call).
 *
 * Self-fetch to `/api/internal/screening/worker` from the same Vercel
 * deployment has proven unreliable (Deployment Protection, cold-start
 * deadlock, dropped waitUntil) and left Hard Data at attempts=0 forever.
 * Calling `processOneStep` directly is the durable path.
 */
export async function drainScreeningRun(opts: {
  runId: string;
  /** Max steps to process in this call. */
  maxSteps?: number;
}): Promise<{ processed: number; moreWork: boolean }> {
  const maxSteps = Math.max(1, opts.maxSteps ?? 3);
  let processed = 0;
  let moreWork = false;

  for (let i = 0; i < maxSteps; i++) {
    const result = await processOneStep({ runId: opts.runId });
    if (result.processed === 0) {
      moreWork = false;
      break;
    }
    processed += result.processed;
    moreWork = result.moreWork;
    if (!moreWork) break;
  }

  return { processed, moreWork };
}

/**
 * Continue draining a run after the HTTP response via waitUntil, still
 * in-process (no HTTP hop).
 */
export function continueScreeningRunInBackground(runId: string): void {
  deferTask(async () => {
    // Cap so a single isolate does not run forever; recover cron picks up rest.
    const { moreWork } = await drainScreeningRun({ runId, maxSteps: 12 });
    if (moreWork) {
      console.warn(
        `[screening/drain] run ${runId} still has work after background drain`,
      );
    }
  });
}
