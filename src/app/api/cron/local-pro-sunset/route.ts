import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { runExpiredLocalProJob } from "@/lib/local-pro-sunset";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const run = withCronLogging("local-pro-sunset", runExpiredLocalProJob);

function authorize(req: NextRequest) {
  return verifyCronAuth("local-pro-sunset", req);
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
