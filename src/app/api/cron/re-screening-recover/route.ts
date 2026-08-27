import { NextRequest } from "next/server";
import { verifyCronAuth, withCronLogging } from "@/lib/cron-logging";
import { countPendingReSteps, recoverExpiredReLeases } from "@/lib/db/real-estate-screening";
import { processOneReStep } from "@/lib/real-estate-screening/orchestrator/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_INLINE = 8;

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("re-screening-recover", req);
  if (denied) return denied;
  const wrapped = withCronLogging("re-screening-recover", async () => {
    const recovered = await recoverExpiredReLeases(new Date());
    const pendingBefore = await countPendingReSteps();
    let inlineProcessed = 0;
    if (pendingBefore > 0 || recovered.requeued > 0) {
      for (let i = 0; i < MAX_INLINE; i++) {
        const step = await processOneReStep();
        if (step.processed === 0) break;
        inlineProcessed += step.processed;
      }
    }
    return {
      ...recovered,
      pendingBefore,
      pendingAfter: await countPendingReSteps(),
      inlineProcessed,
    };
  });
  return wrapped();
}
