import { NextResponse, type NextRequest } from "next/server";

import { withMetrics } from "@/lib/with-metrics";
import { requireScreeningAccess } from "@/lib/screening/guard";
import {
  getScreeningRun,
  listStepsForRun,
  recoverExpiredLeases,
} from "@/lib/db";
import { buildRunResponse } from "@/lib/screening/pipeline/build-run";
import {
  continueScreeningRunInBackground,
  drainScreeningRun,
} from "@/lib/screening/orchestrator/drain-run";

export const dynamic = "force-dynamic";
/** Must cover Tavily shortlist_research + evaluate; 60s left orphans mid-lease. */
export const maxDuration = 300;

function runIdFromPath(pathname: string): string {
  const match = pathname.match(/\/api\/screening\/runs\/([^/]+)\/resume\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * POST /api/screening/runs/[runId]/resume
 *
 * User-facing kick when the progress UI detects a stall. Reclaims expired
 * leases, drains one step inline for snappy UI feedback, then continues
 * in-process via waitUntil (same path as create-run).
 */
export const POST = withMetrics(
  "/api/screening/runs/[runId]/resume",
  async (req: NextRequest) => {
    const { session, error } = await requireScreeningAccess(req);
    if (error || !session) return error;

    const runId = runIdFromPath(req.nextUrl.pathname);
    if (!runId) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const row = await getScreeningRun(runId, session.userId);
    if (!row) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (row.mockedPipeline) {
      return NextResponse.json({ error: "Mock runs cannot be resumed" }, { status: 400 });
    }

    // Reclaim orphaned `running` steps before draining — the usual stuck case
    // (shortlist_research / IR killed mid-lease by a short maxDuration).
    const recovered = await recoverExpiredLeases(new Date());

    // One inline step for immediate feedback; heavy work continues in background
    // so the HTTP response cannot strand a long Tavily/LLM lease again.
    const { processed, moreWork } = await drainScreeningRun({
      runId: row.id,
      maxSteps: 1,
    });
    const stepsAfter = await listStepsForRun(row.id).catch(() => []);
    const stillQueued = stepsAfter.some(
      (s) => s.status === "pending" || s.status === "running",
    );
    if (moreWork || recovered.requeued > 0 || stillQueued) {
      continueScreeningRunInBackground(row.id);
    }

    const run = buildRunResponse(row, stepsAfter);
    return NextResponse.json({
      run,
      processed,
      moreWork: moreWork || stillQueued,
      recovered,
    });
  },
);
