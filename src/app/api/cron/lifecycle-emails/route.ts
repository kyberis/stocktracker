import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { runLifecycleEmailsJob } from "@/lib/cron-lifecycle-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runLifecycleEmails = withCronLogging("lifecycle-emails", runLifecycleEmailsJob);

function authorize(req: NextRequest) {
  return verifyCronAuth("lifecycle-emails", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runLifecycleEmails();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runLifecycleEmails();
}
