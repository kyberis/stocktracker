import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Archived: the Gmail → AI market-digest pipeline is no longer processed.
 * Stub kept so admin/manual triggers and the paused registry entry stay safe.
 */
const runArchivedDigestEmail = withCronLogging("digest-email", async () => ({
  skipped: true,
  archived: true,
  reason: "digest-email archived — market digest Gmail pipeline is no longer processed",
}));

function authorize(req: NextRequest) {
  return verifyCronAuth("digest-email", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runArchivedDigestEmail();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runArchivedDigestEmail();
}
