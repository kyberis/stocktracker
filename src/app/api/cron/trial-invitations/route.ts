import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { runTrialInvitationsJob } from "@/lib/cron-lifecycle-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runTrialInvitations = withCronLogging("trial-invitations", runTrialInvitationsJob);

function authorize(req: NextRequest) {
  return verifyCronAuth("trial-invitations", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runTrialInvitations();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runTrialInvitations();
}
