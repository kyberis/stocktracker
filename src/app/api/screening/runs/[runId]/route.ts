import { NextResponse, type NextRequest } from "next/server";

import { withMetrics } from "@/lib/with-metrics";
import { requireScreeningAccess } from "@/lib/screening/guard";
import { buildMockRun, parseMockRunId } from "@/lib/screening/mock-pipeline";
import { getScreeningRun, listStepsForRun } from "@/lib/db";
import { buildRunResponse } from "@/lib/screening/pipeline/build-run";

export const dynamic = "force-dynamic";

/** GET /api/screening/runs/[runId] — status + step progress. */
export const GET = withMetrics("/api/screening/runs/[runId]", async (req: NextRequest) => {
  const { session, error } = await requireScreeningAccess(req);
  if (error || !session) return error;

  const runId = decodeURIComponent(req.nextUrl.pathname.split("/").pop() || "");
  if (!runId) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  // Mock ids keep the legacy behaviour so anything the UI cached still resolves.
  if (parseMockRunId(runId)) {
    const run = buildMockRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json({ run });
  }

  const row = await getScreeningRun(runId, session.userId);
  if (!row) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  const steps = await listStepsForRun(row.id);
  const run = buildRunResponse(row, steps);
  return NextResponse.json({ run });
});
