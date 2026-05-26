import { NextRequest } from "next/server";

import { verifyCronAuth, withCronLogging } from "@/lib/cron-logging";
import { dispatchPendingProdOpsEvents } from "@/lib/prodops";

const runProdOpsDispatch = withCronLogging("prodops-dispatch", async () => {
  return dispatchPendingProdOpsEvents();
});

export async function POST(req: NextRequest) {
  const denied = verifyCronAuth("prodops-dispatch", req);
  if (denied) return denied;
  return runProdOpsDispatch();
}
