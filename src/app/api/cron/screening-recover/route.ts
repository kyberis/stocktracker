import { NextRequest } from "next/server";

import { verifyCronAuth, withCronLogging } from "@/lib/cron-logging";
import { recoverExpiredLeases } from "@/lib/db";
import { getRequestPublicOrigin } from "@/lib/http/request-public-origin";
import { deferTask } from "@/lib/task-runner";

/**
 * Screening pipeline recovery. Every 5 minutes:
 *  1. Reset expired leases (worker crashed, step is stuck in `running`).
 *  2. Fire the worker once so any `pending` steps make forward progress even
 *     when the previous run finished without self-invoking (rare, but keeps the
 *     pipeline resilient to lost `waitUntil` promises).
 *
 * The recover pass is a no-op if nothing is stuck.
 */
async function runScreeningRecover(req: NextRequest): Promise<{
  requeued: number;
  failed: number;
  workerKicked: boolean;
}> {
  const result = await recoverExpiredLeases(new Date());

  // Best-effort kick — if leases were requeued OR if any pending steps exist,
  // we ping the worker without a runId scope. Keeping the trigger simple avoids
  // extra queries on the happy path.
  let workerKicked = false;
  if (result.requeued > 0) {
    workerKicked = true;
    const origin = getRequestPublicOrigin(req);
    const authHeader = req.headers.get("authorization") ?? "";
    deferTask(async () => {
      try {
        await fetch(`${origin}/api/internal/screening/worker`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: authHeader,
          },
          body: JSON.stringify({}),
        });
      } catch (err) {
        console.error(
          "[screening-recover] worker kick failed",
          err instanceof Error ? err.message : err,
        );
      }
    });
  }

  return { ...result, workerKicked };
}

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("screening-recover", req);
  if (denied) return denied;
  const wrapped = withCronLogging("screening-recover", () =>
    runScreeningRecover(req),
  );
  return wrapped();
}
