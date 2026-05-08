import { NextRequest, NextResponse } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { runSnapshotCompaction } from "@/lib/compact-snapshots";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const runJob = withCronLogging("compact-snapshots", runSnapshotCompaction);

function authorize(req: NextRequest) {
  return verifyCronAuth("compact-snapshots", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runJob();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runJob();
}
