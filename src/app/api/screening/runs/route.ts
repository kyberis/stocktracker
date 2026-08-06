import { NextResponse, type NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { requireScreeningAccess } from "@/lib/screening/guard";
import { buildMockRun, createMockRunId } from "@/lib/screening/mock-pipeline";
import { screeningBriefSchema } from "@/lib/screening/schemas";

/**
 * Stage E0: validates the brief with the contract the Intake agent will use, then
 * returns a run whose progress is derived from the id. Nothing is persisted, so
 * no screening criteria are stored against the user yet.
 */
export const POST = withMetrics("/api/screening/runs", async (req: NextRequest) => {
  const { session, error } = await requireScreeningAccess(req);
  if (error || !session) return error;

  const parsed = await parseBody(req, screeningBriefSchema);
  if (!parsed.success) return parsed.error;

  const runId = createMockRunId();
  const run = buildMockRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Could not create run" }, { status: 500 });
  }

  return NextResponse.json({ run }, { status: 201 });
});
