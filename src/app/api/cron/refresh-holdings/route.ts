import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { runRefreshHoldingsJob } from "@/lib/cron-refresh-holdings";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runRefreshHoldings = withCronLogging("refresh-holdings", runRefreshHoldingsJob);

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("refresh-holdings", req);
  if (denied) return denied;
  return runRefreshHoldings();
}
