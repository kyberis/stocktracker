import rawMockReport from "../../../data/screening-mock-report-cribado-2026-08-05.json";
import { ensureReportCategories } from "./ensure-categories";
import {
  screeningReportSchema,
  type ScreeningReport,
  type ScreeningRun,
  type ScreeningRunStep,
  type ScreeningRunStatus,
} from "./schemas";

/**
 * Stage E0 pipeline: no agents, no market data, no persistence.
 *
 * Progress is derived from a timestamp encoded in the run id, so polling behaves
 * like the real thing (steps advance, the report appears at the end) without a
 * runs table. Stage E1 replaces this with `screening_runs` rows and a worker;
 * the HTTP contract in `schemas.ts` does not change.
 */

const RUN_ID_PREFIX = "mock";

/** Step order and mock duration. Kinds match the future `agent_kind` values. */
const MOCK_STEPS: Array<{ agentKind: string; seconds: number }> = [
  { agentKind: "intake", seconds: 1 },
  { agentKind: "hard_data", seconds: 2 },
  { agentKind: "ir_business", seconds: 3 },
  { agentKind: "web_sentiment", seconds: 2 },
  { agentKind: "portfolio_context", seconds: 2 },
  { agentKind: "risk", seconds: 1 },
  { agentKind: "compiler", seconds: 2 },
  { agentKind: "qa", seconds: 2 },
];

export const MOCK_RUN_TOTAL_SECONDS = MOCK_STEPS.reduce((sum, s) => sum + s.seconds, 0);

export function createMockRunId(now = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${RUN_ID_PREFIX}-${now.toString(36)}-${random}`;
}

/** Returns null when the id was not produced by this mock pipeline. */
export function parseMockRunId(runId: string): { createdAtMs: number } | null {
  const parts = runId.split("-");
  if (parts.length !== 3 || parts[0] !== RUN_ID_PREFIX) return null;
  const createdAtMs = parseInt(parts[1], 36);
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return null;
  return { createdAtMs };
}

export function buildMockRun(runId: string, now = Date.now()): ScreeningRun | null {
  const parsed = parseMockRunId(runId);
  if (!parsed) return null;

  const elapsed = Math.max(0, (now - parsed.createdAtMs) / 1000);
  let consumed = 0;
  const steps: ScreeningRunStep[] = MOCK_STEPS.map((step) => {
    const startsAt = consumed;
    consumed += step.seconds;
    if (elapsed >= consumed) {
      return { agentKind: step.agentKind, status: "done", elapsedSeconds: step.seconds };
    }
    if (elapsed > startsAt) {
      return {
        agentKind: step.agentKind,
        status: "running",
        elapsedSeconds: Math.round((elapsed - startsAt) * 10) / 10,
      };
    }
    return { agentKind: step.agentKind, status: "pending", elapsedSeconds: null };
  });

  const doneCount = steps.filter((s) => s.status === "done").length;
  const completed = doneCount === steps.length;
  const status: ScreeningRunStatus = completed ? "completed" : "running";

  return {
    runId,
    mode: "user_report",
    status,
    createdAt: new Date(parsed.createdAtMs).toISOString(),
    steps,
    progressPct: Math.round((doneCount / steps.length) * 100),
    mocked: true,
    reportReady: completed,
  };
}

let cachedReport: ScreeningReport | null = null;

/**
 * The fixture is parsed with the same schema the agent pipeline will use, so a
 * drift between fixture and contract fails here instead of in the UI.
 */
export function getMockScreeningReport(runId: string, candidateLimit?: number): ScreeningReport {
  if (!cachedReport) {
    cachedReport = screeningReportSchema.parse(rawMockReport);
  }
  const report: ScreeningReport = { ...cachedReport, jobId: runId };
  if (!candidateLimit || candidateLimit >= report.cards.length) {
    return ensureReportCategories(report);
  }

  // Honour the candidate count the user asked for instead of always showing five.
  const cards = report.cards.slice(0, candidateLimit);
  const kept = new Set(cards.map((c) => c.ticker));
  return ensureReportCategories({
    ...report,
    cards,
    comparisonRows: report.comparisonRows.filter((r) => kept.has(r.ticker)),
    priorityOrder: report.priorityOrder.filter((t) => kept.has(t)),
  });
}
