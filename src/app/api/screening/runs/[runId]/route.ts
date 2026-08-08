import { NextResponse, type NextRequest } from "next/server";

import { withMetrics } from "@/lib/with-metrics";
import { requireScreeningAccess } from "@/lib/screening/guard";
import { buildMockRun, parseMockRunId } from "@/lib/screening/mock-pipeline";
import {
  countQaRoundsForRun,
  getLatestQaVerdictForRun,
  getScreeningRun,
  listStepsForRun,
} from "@/lib/db";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
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
  const qaGating = await isFeatureEnabledForUser(
    "screening_qa_enabled",
    session.userId,
  );
  const [steps, qaVerdictRow, qaRoundsCompleted] = await Promise.all([
    listStepsForRun(row.id),
    qaGating ? getLatestQaVerdictForRun(row.id) : Promise.resolve(null),
    qaGating ? countQaRoundsForRun(row.id) : Promise.resolve(0),
  ]);
  const run = buildRunResponse(row, steps, {
    qaGating,
    qaVerdict: qaVerdictRow?.verdict ?? null,
    qaRoundsCompleted,
  });
  return NextResponse.json({ run });
});
