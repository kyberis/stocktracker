import { NextResponse, type NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { requireScreeningAccess } from "@/lib/screening/guard";
import { buildMockRun, getMockScreeningReport } from "@/lib/screening/mock-pipeline";

export const dynamic = "force-dynamic";

/**
 * GET /api/screening/reports/[reportId] — typed report rendered as HTML by the UI.
 * In stage E0 the id is the run id and the payload comes from the fixture.
 */
export const GET = withMetrics("/api/screening/reports/[reportId]", async (req: NextRequest) => {
  const { session, error } = await requireScreeningAccess(req);
  if (error || !session) return error;

  const reportId = decodeURIComponent(req.nextUrl.pathname.split("/").pop() || "");
  const run = buildMockRun(reportId);
  if (!run) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (!run.reportReady) {
    return NextResponse.json({ error: "Report not ready", run }, { status: 409 });
  }

  const rawCount = req.nextUrl.searchParams.get("candidates");
  const parsedCount = rawCount ? Number.parseInt(rawCount, 10) : NaN;
  const candidateLimit = Number.isFinite(parsedCount) ? Math.min(Math.max(parsedCount, 1), 5) : undefined;

  return NextResponse.json({ report: getMockScreeningReport(reportId, candidateLimit), mocked: true });
});
