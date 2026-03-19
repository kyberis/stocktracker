import { NextRequest, NextResponse } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { runPortfolioSnapshotsJob } from "@/lib/cron-portfolio-snapshots";

export const dynamic = "force-dynamic";
/** Large user bases: batch Yahoo + per-user DB writes */
export const maxDuration = 300;

const runJob = withCronLogging("portfolio-snapshots", runPortfolioSnapshotsJob);

function authorize(req: NextRequest) {
  return verifyCronAuth("portfolio-snapshots", req.headers.get("authorization"));
}

/** Vercel Cron (scheduled). */
export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runJob();
}

/**
 * Same as GET — use for one-off production runs after deploy (`curl -X POST ...`).
 * Writes current portfolio value + cost basis for every user with holdings (all portfolios).
 */
export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runJob();
}
