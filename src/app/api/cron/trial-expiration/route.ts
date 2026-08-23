import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { runTrialExpirationJob } from "@/lib/trial-expiration";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runTrialExpiration = withCronLogging("trial-expiration", runTrialExpirationJob);

function authorize(req: NextRequest) {
  return verifyCronAuth("trial-expiration", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runTrialExpiration();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runTrialExpiration();
}
