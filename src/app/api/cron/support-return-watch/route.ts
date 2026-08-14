import { NextRequest } from "next/server";

import { verifyCronAuth, withCronLogging } from "@/lib/cron-logging";
import { processDueUserReturnWatches } from "@/lib/user-return-watch";

const run = withCronLogging("support-return-watch", async () => {
  return processDueUserReturnWatches();
});

export async function POST(req: NextRequest) {
  const denied = verifyCronAuth("support-return-watch", req);
  if (denied) return denied;
  return run();
}
