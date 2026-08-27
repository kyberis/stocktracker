import { NextResponse, type NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { requireRealEstateAccess } from "@/lib/real-estate-screening/guard";
import {
  getReResult,
  getReScreeningRun,
  listReStepsForRun,
} from "@/lib/db/real-estate-screening";
import { progressFromSteps } from "@/lib/real-estate-screening/orchestrator/runner";
import { reportStaleAfterDays } from "@/lib/real-estate-screening/schemas";

export const dynamic = "force-dynamic";

export const GET = withMetrics(
  "/api/real-estate/screening/[runId]",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireRealEstateAccess(req);
    if (error || !session) return error;
    const runId = (ctx as { params?: { runId?: string } })?.params?.runId
      ?? new URL(req.url).pathname.split("/").pop()
      ?? "";
    const run = await getReScreeningRun(runId, session.userId);
    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const steps = await listReStepsForRun(run.id);
    const result = await getReResult(run.id);
    const created = Date.parse(run.createdAt);
    const stale =
      Number.isFinite(created) &&
      Date.now() - created > reportStaleAfterDays * 86_400_000 &&
      (run.status === "completed" || run.status === "partial");
    return NextResponse.json({
      run: {
        id: run.id,
        status: run.status,
        phase: run.phase,
        error: run.error,
        createdAt: run.createdAt,
        finishedAt: run.finishedAt,
        zonas: JSON.parse(run.zonasJson || "[]"),
        params: JSON.parse(run.paramsJson || "{}"),
        stale,
      },
      progress: progressFromSteps(steps),
      payload: result ? JSON.parse(result.payloadJson || "null") : null,
      cobertura: result ? JSON.parse(result.coberturaJson || "null") : null,
    });
  },
);
