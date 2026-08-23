import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { runCoverageReconcileJob } from "@/lib/cron-coverage-reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runCoverageReconcile = withCronLogging("coverage-reconcile", runCoverageReconcileJob);

export async function GET(request: NextRequest) {
  const denied = verifyCronAuth("coverage-reconcile", request);
  if (denied) return denied;
  return runCoverageReconcile();
}

export const POST = GET;
