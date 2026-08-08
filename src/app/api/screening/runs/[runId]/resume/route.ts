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
export const maxDuration = 60;

function runIdFromPath(pathname: string): string {
  const match = pathname.match(/\/api\/screening\/runs\/([^/]+)\/resume\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * POST /api/screening/runs/[runId]/resume
 *
 * User-facing kick when the progress UI detects a stall. Drains a few steps
 * inline, then continues in-process via waitUntil (same path as create-run).
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

    // Reclaim orphaned `running` steps before draining — the usual stuck case.
    const recovered = await recoverExpiredLeases(new Date());

    const { processed, moreWork } = await drainScreeningRun({
      runId: row.id,
      maxSteps: 4,
    });
    if (moreWork || recovered.requeued > 0) {
      continueScreeningRunInBackground(row.id);
    }

    const steps = await listStepsForRun(row.id).catch(() => []);
    const run = buildRunResponse(row, steps);
    return NextResponse.json({
      run,
      processed,
      moreWork,
      recovered,
    });
  },
);
