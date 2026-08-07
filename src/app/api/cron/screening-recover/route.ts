import { NextRequest } from "next/server";

import { verifyCronAuth, withCronLogging } from "@/lib/cron-logging";
import { countPendingSteps, recoverExpiredLeases } from "@/lib/db";
import { kickScreeningWorker } from "@/lib/screening/orchestrator/kick-worker";

/**
 * Screening pipeline recovery. Every 5 minutes:
 *  1. Reset expired leases (worker crashed, step stuck in `running`).
 *  2. Fire the worker when anything is still pending/running — including
 *     never-leased steps whose original waitUntil kick was dropped.
 *
 * Without (2), a missed kick leaves the UI polling forever with Hard Data
 * stuck on "pending".
 */
async function runScreeningRecover(req: NextRequest): Promise<{
  requeued: number;
  failed: number;
  pending: number;
  workerKicked: boolean;
}> {
  const result = await recoverExpiredLeases(new Date());
  const pending = await countPendingSteps();

  let workerKicked = false;
  if (result.requeued > 0 || pending > 0) {
    workerKicked = true;
    kickScreeningWorker({
      req,
      authorization: req.headers.get("authorization") ?? undefined,
    });
  }

  return { ...result, pending, workerKicked };
}

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("screening-recover", req);
  if (denied) return denied;
  const wrapped = withCronLogging("screening-recover", () =>
    runScreeningRecover(req),
  );
  return wrapped();
}
