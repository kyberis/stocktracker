import { NextRequest } from "next/server";

import { verifyCronAuth, withCronLogging } from "@/lib/cron-logging";
import { processDueUserReturnWatches } from "@/lib/user-return-watch";

const run = withCronLogging("support-return-watch", async () => {
  return processDueUserReturnWatches();
});

function authorize(req: NextRequest) {
  return verifyCronAuth("support-return-watch", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return run();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return run();
}
