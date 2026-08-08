import { NextResponse, type NextRequest } from "next/server";

import { withMetrics } from "@/lib/with-metrics";
import { requireScreeningAccess } from "@/lib/screening/guard";
import {
  buildMockRun,
  getMockScreeningReport,
  parseMockRunId,
} from "@/lib/screening/mock-pipeline";
import {
  countQaRoundsForRun,
  getLatestQaVerdictForRun,
  getScreeningRun,
  insertScreeningAgentOutput,
  listScreeningAgentOutputsByRun,
  listStepsForRun,
} from "@/lib/db";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import { backfillHardDataOutputJson } from "@/lib/screening/data/enrich-candidates";
import { backfillTechnicalsAggregateOutputJson } from "@/lib/screening/data/backfill-technicals";
import { composeScreeningReport } from "@/lib/screening/pipeline/build-report";
import { MAX_QA_ROUNDS } from "@/lib/screening/qa/rerun";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    let hardDataRow = latestByKind.get("hard_data");
    const compilerRow = latestByKind.get("compiler");
    const irAggregateRow = latestByKind.get("aggregate_ir_business") ?? null;
    const webAggregateRow = latestByKind.get("aggregate_web_sentiment") ?? null;
    let technicalsAggregateRow =
      latestByKind.get("aggregate_technicals") ?? null;
    const portfolioContextRow = latestByKind.get("portfolio_context") ?? null;
    const riskRow = latestByKind.get("risk") ?? null;
    const qaRow = latestByKind.get("qa") ?? null;
    if (!hardDataRow || !compilerRow) {
      return NextResponse.json(
        { error: "Report not ready", pendingAgentKinds: ["compiler"] },
        { status: 409 },
      );
    }

    const qaGating = await isFeatureEnabledForUser(
      "screening_qa_enabled",
      session.userId,
    );
    if (qaGating) {
      const [verdictRow, roundsCount] = await Promise.all([
        getLatestQaVerdictForRun(row.id),
        countQaRoundsForRun(row.id),
      ]);
      const verdict = verdictRow?.verdict ?? null;
      const passed =
        verdict === "pass" || verdict === "pass_with_degradation";
      if (!passed) {
        // Still verifying, or fail with rounds remaining -> keep the client
        // polling. Round cap is enforced by the QA agent, which flips the
        // verdict to `pass_with_degradation` once retries are exhausted.
        const roundsRemaining =
          verdict === "fail" && roundsCount < MAX_QA_ROUNDS;
        return NextResponse.json(
          {
            error: "Report not ready",
            pendingAgentKinds: ["qa"],
            qaVerdict: verdict,
            qaRoundsCompleted: roundsCount,
            roundsRemaining,
          },
          { status: 409 },
        );
      }
    }

    // Older runs may have Hard Data enriched with outdated FMP field names
    // (PE / EV null while ND/EBITDA was filled). Re-enrich at read time.
    try {
      const backfilledJson = await backfillHardDataOutputJson(
        hardDataRow.outputJson,
      );
      if (backfilledJson) {
        const persisted = await insertScreeningAgentOutput({
          runId: row.id,
          userId: session.userId,
          agentKind: "hard_data",
          outputJson: backfilledJson,
          latencyMs: 0,
        });
        hardDataRow = persisted;
      }
    } catch (err) {
      console.error("[screening/report] hard_data backfill failed", err);
    }

    // Backfill technicals aggregate for older runs where the technicals agent
    // never ran (pre-Phase 2). Best-effort: fetches FMP OHLC once per candidate.
    try {
      const tickers = extractTickersFromHardData(hardDataRow.outputJson);
      const backfilledTechJson = await backfillTechnicalsAggregateOutputJson({
        existingOutputJson: technicalsAggregateRow?.outputJson ?? null,
        tickers,
      });
      if (backfilledTechJson) {
        const persisted = await insertScreeningAgentOutput({
          runId: row.id,
          userId: session.userId,
          agentKind: "aggregate_technicals",
          outputJson: backfilledTechJson,
          latencyMs: 0,
        });
        technicalsAggregateRow = persisted;
      }
    } catch (err) {
      console.error("[screening/report] technicals backfill failed", err);
    }

    const pending = [
      ...new Set(
        steps
          .filter(
            (s) =>
              s.status !== "done" &&
              s.status !== "skipped" &&
              s.agentKind !== "aggregate_ir_business" &&
              s.agentKind !== "aggregate_web_sentiment" &&
              s.agentKind !== "aggregate_technicals" &&
              // Phase 1 shadow mode: QA is non-blocking, don't surface it as
              // pending. Phase 3 will gate the endpoint on QA verdict instead.
              s.agentKind !== "qa",
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
      technicalsAggregateRow,
      portfolioContextRow,
      riskRow,
      qaRow,
      pendingAgentKinds: pending,
      candidateLimit,
    });
    if (!report) {
      return NextResponse.json(
        { error: "Report shape invalid" },
        { status: 500 },
      );
    }

    // If QA degraded every candidate, surface a refund-eligible error so the
    // UI can point users to /profile/refund. We keep the run row in
    // `completed` (there is no `failed` status in the DB); the client
    // distinguishes via `error: verified_no_candidates` + `refundEligible`.
    if (report.cards.length === 0) {
      return NextResponse.json(
        {
          error: "verified_no_candidates",
          refundEligible: true,
          verification: report.verification,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ report, mocked: false });
  },
);

function extractTickersFromHardData(outputJson: string): string[] {
  try {
    const parsed = JSON.parse(outputJson) as {
      candidates?: Array<{ ticker?: unknown }>;
    };
    const list: string[] = [];
    for (const c of parsed.candidates ?? []) {
      if (typeof c?.ticker === "string" && c.ticker.trim().length > 0) {
        list.push(c.ticker.trim().toUpperCase());
      }
    }
    return list.slice(0, 5);
  } catch {
    return [];
  }
}
