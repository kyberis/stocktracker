import { NextRequest } from "next/server";

import { verifyCronAuth, withCronLogging } from "@/lib/cron-logging";
import { dispatchPendingProdOpsEvents } from "@/lib/prodops";

const runProdOpsDispatch = withCronLogging("prodops-dispatch", async () => {
  return dispatchPendingProdOpsEvents();
});

function authorize(req: NextRequest) {
  return verifyCronAuth("prodops-dispatch", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runProdOpsDispatch();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runProdOpsDispatch();
}
