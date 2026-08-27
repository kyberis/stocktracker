import { NextResponse, type NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { requireRealEstateAccess } from "@/lib/real-estate-screening/guard";
import { getReScreeningRun } from "@/lib/db/real-estate-screening";
import { continueReScreeningInBackground } from "@/lib/real-estate-screening/orchestrator/drain";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = withMetrics(
  "/api/real-estate/screening/[runId]/resume",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireRealEstateAccess(req);
    if (error || !session) return error;
    const runId =
      (ctx as { params?: { runId?: string } })?.params?.runId ??
      new URL(req.url).pathname.split("/").slice(-2, -1)[0] ??
      "";
    const run = await getReScreeningRun(runId, session.userId);
    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
    continueReScreeningInBackground(run.id);
    return NextResponse.json({ ok: true, runId: run.id });
  },
);
