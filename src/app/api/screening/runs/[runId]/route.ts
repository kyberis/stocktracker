import { NextResponse, type NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { requireScreeningAccess } from "@/lib/screening/guard";
import { buildMockRun } from "@/lib/screening/mock-pipeline";

export const dynamic = "force-dynamic";

/** GET /api/screening/runs/[runId] — status + step progress. */
export const GET = withMetrics("/api/screening/runs/[runId]", async (req: NextRequest) => {
  const { session, error } = await requireScreeningAccess(req);
  if (error || !session) return error;

  const runId = decodeURIComponent(req.nextUrl.pathname.split("/").pop() || "");
  const run = buildMockRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({ run });
});
