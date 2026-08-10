import { NextRequest } from "next/server";

import { verifyCronAuth, withCronLogging } from "@/lib/cron-logging";
import { countPendingSteps, recoverExpiredLeases } from "@/lib/db";
import { processOneStep } from "@/lib/screening/orchestrator/runner";
import { kickScreeningWorker } from "@/lib/screening/orchestrator/kick-worker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Drain this many orphaned steps inline so recover does not rely on waitUntil. */
const MAX_INLINE_STEPS = 8;

/**
 * Screening pipeline recovery. Every 2 minutes:
 *  1. Reset expired leases (worker crashed, step stuck in `running`).
 *  2. Process pending steps **inline** (await) — never-leased steps whose
 *     original waitUntil kick was dropped.
 *  3. If work remains, fire a deferred kick as backup.
 */
async function runScreeningRecover(req: NextRequest): Promise<{
  requeued: number;
  failed: number;
  pendingBefore: number;
  pendingAfter: number;
  inlineProcessed: number;
  workerKicked: boolean;
}> {
  const result = await recoverExpiredLeases(new Date());
  const pendingBefore = await countPendingSteps();

  let inlineProcessed = 0;
  if (pendingBefore > 0 || result.requeued > 0) {
    for (let i = 0; i < MAX_INLINE_STEPS; i++) {
      const stepResult = await processOneStep({});
      if (stepResult.processed === 0) break;
      inlineProcessed += stepResult.processed;
    }
  }

  const pendingAfter = await countPendingSteps();
  let workerKicked = false;
  if (pendingAfter > 0) {
    workerKicked = true;
    // Awaited kick so the recover cron itself finishes the next hop.
    await kickScreeningWorker({
      req,
      authorization: req.headers.get("authorization") ?? undefined,
      mode: "await",
      timeoutMs: 45_000,
    });
  }

  return {
    ...result,
    pendingBefore,
    pendingAfter: await countPendingSteps(),
    inlineProcessed,
    workerKicked,
  };
}

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("screening-recover", req);
  if (denied) return denied;
  const wrapped = withCronLogging("screening-recover", () =>
    runScreeningRecover(req),
  );
  return wrapped();
}
