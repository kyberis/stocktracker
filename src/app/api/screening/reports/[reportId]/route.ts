import { NextResponse, type NextRequest } from "next/server";

import { withMetrics } from "@/lib/with-metrics";
import { requireScreeningAccess } from "@/lib/screening/guard";
import {
  buildMockRun,
  getMockScreeningReport,
  parseMockRunId,
} from "@/lib/screening/mock-pipeline";
import {
  getScreeningRun,
  listScreeningAgentOutputsByRun,
  listStepsForRun,
} from "@/lib/db";
import { composeScreeningReport } from "@/lib/screening/pipeline/build-report";

export const dynamic = "force-dynamic";

/**
 * GET /api/screening/reports/[reportId] — typed report rendered as HTML by the UI.
 *
 * Mock ids continue to serve the fixture. Real ids compose the report from
 * `screening_agent_outputs` (hard_data + compiler) at read time.
 */
export const GET = withMetrics(
  "/api/screening/reports/[reportId]",
  async (req: NextRequest) => {
    const { session, error } = await requireScreeningAccess(req);
    if (error || !session) return error;

    const reportId = decodeURIComponent(req.nextUrl.pathname.split("/").pop() || "");
    if (!reportId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const rawCount = req.nextUrl.searchParams.get("candidates");
    const parsedCount = rawCount ? Number.parseInt(rawCount, 10) : NaN;
    const candidateLimit = Number.isFinite(parsedCount)
      ? Math.min(Math.max(parsedCount, 1), 5)
      : undefined;

    // Legacy mock path.
    if (parseMockRunId(reportId)) {
      const run = buildMockRun(reportId);
      if (!run) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      if (!run.reportReady) {
        return NextResponse.json(
          { error: "Report not ready", run },
          { status: 409 },
        );
      }
      return NextResponse.json({
        report: getMockScreeningReport(reportId, candidateLimit),
        mocked: true,
      });
    }

    // Real path.
    const row = await getScreeningRun(reportId, session.userId);
    if (!row) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const [outputs, steps] = await Promise.all([
      listScreeningAgentOutputsByRun(row.id, session.userId),
      listStepsForRun(row.id),
    ]);

    // Pick the LATEST row per agent kind so retries don't collide.
    const latestByKind = new Map<string, (typeof outputs)[number]>();
    for (const o of outputs) {
      const prev = latestByKind.get(o.agentKind);
      if (!prev || Date.parse(o.createdAt) >= Date.parse(prev.createdAt)) {
        latestByKind.set(o.agentKind, o);
      }
    }
    const hardDataRow = latestByKind.get("hard_data");
    const compilerRow = latestByKind.get("compiler");
    const irAggregateRow = latestByKind.get("aggregate_ir_business") ?? null;
    const webAggregateRow = latestByKind.get("aggregate_web_sentiment") ?? null;
    const portfolioContextRow = latestByKind.get("portfolio_context") ?? null;
    const riskRow = latestByKind.get("risk") ?? null;
    if (!hardDataRow || !compilerRow) {
      return NextResponse.json(
        { error: "Report not ready", pendingAgentKinds: ["compiler"] },
        { status: 409 },
      );
    }

    const pending = [
      ...new Set(
        steps
          .filter(
            (s) =>
              s.status !== "done" &&
              s.status !== "skipped" &&
              s.agentKind !== "aggregate_ir_business" &&
              s.agentKind !== "aggregate_web_sentiment",
          )
          .map((s) => s.agentKind),
      ),
    ];

    const report = composeScreeningReport({
      run: row,
      hardDataRow,
      compilerRow,
      irAggregateRow,
      webAggregateRow,
      portfolioContextRow,
      riskRow,
      pendingAgentKinds: pending,
      candidateLimit,
    });
    if (!report) {
      return NextResponse.json(
        { error: "Report shape invalid" },
        { status: 500 },
      );
    }

    return NextResponse.json({ report, mocked: false });
  },
);
