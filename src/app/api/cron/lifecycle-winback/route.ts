import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { runLifecycleWinbackJob } from "@/lib/cron-lifecycle-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runLifecycleWinback = withCronLogging("lifecycle-winback", runLifecycleWinbackJob);

function authorize(req: NextRequest) {
  return verifyCronAuth("lifecycle-winback", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runLifecycleWinback();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runLifecycleWinback();
}
