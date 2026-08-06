import { NextResponse, type NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { requireScreeningAccess } from "@/lib/screening/guard";
import { buildMockRun, createMockRunId } from "@/lib/screening/mock-pipeline";
import { screeningBriefSchema } from "@/lib/screening/schemas";
import { runSanityLimits } from "@/lib/screening/rules/sanity-limits";
import { createScreeningRun } from "@/lib/db";
import { recordScreeningRunCreated } from "@/lib/screening/metrics";

/**
 * Persist the brief the Intake agent produced (E1 thin) and return a mock run
 * whose progress is derived from its id (E0 pipeline).
 *
 * The mock run id keeps the `mock-<epoch>-<rand>` shape so the existing
 * `GET /api/screening/runs/[runId]` route still works. When the real research
 * pipeline lands, it will take the persisted `screening_runs.id` as the runId.
 */
export const POST = withMetrics("/api/screening/runs", async (req: NextRequest) => {
  const { session, error } = await requireScreeningAccess(req);
  if (error || !session) return error;

  const parsed = await parseBody(req, screeningBriefSchema);
  if (!parsed.success) return parsed.error;

  const sanity = runSanityLimits(parsed.data);
  if (!sanity.ok) {
    return NextResponse.json(
      {
        error: "brief_infeasible",
        issues: sanity.issues,
      },
      { status: 422 },
    );
  }

  const runId = createMockRunId();
  const run = buildMockRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Could not create run" }, { status: 500 });
  }

  try {
    await createScreeningRun({
      userId: session.userId,
      status: "authorized",
      intent: parsed.data.intent,
      briefJson: JSON.stringify(parsed.data),
      mockedPipeline: true,
    });
  } catch (err) {
    // Persistence is best-effort in the mock stage — the UI must still receive
    // a run so the demo does not stall.
    console.error(
      "[screening/runs] persist failed",
      err instanceof Error ? err.message : err,
    );
  }

  recordScreeningRunCreated(parsed.data.intent, true);

  return NextResponse.json({ run }, { status: 201 });
});
