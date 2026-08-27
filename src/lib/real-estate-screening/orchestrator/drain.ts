import { deferTask } from "@/lib/task-runner";
import { processOneReStep } from "./runner";

export async function drainReScreeningRun(opts: {
  runId: string;
  maxSteps?: number;
}): Promise<{ processed: number; moreWork: boolean }> {
  const maxSteps = Math.max(1, opts.maxSteps ?? 6);
  let processed = 0;
  let moreWork = false;
  for (let i = 0; i < maxSteps; i++) {
    const result = await processOneReStep(opts.runId);
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

export function continueReScreeningInBackground(runId: string): void {
  deferTask(async () => {
    await drainReScreeningRun({ runId, maxSteps: 6 });
  });
}
