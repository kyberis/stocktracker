import type { ScreeningStepRow } from "@/lib/db";
import type { ScreeningRunRow } from "@/lib/db/screening";
import type { ScreeningRun, ScreeningRunStep, ScreeningRunStatus } from "@/lib/screening/schemas";

/**
 * All agent kinds the UI expects to see in the progress timeline. Any kind not
 * present in `steps` (e.g. Web/Portfolio Context/Risk/QA in this slice)
 * is rendered as `skipped` so the timeline stays complete even when the
 * pipeline is intentionally partial.
 *
 * Note: `aggregate_ir_business` is an internal barrier and is NOT shown —
 * its progress is folded into the synthesised `ir_business` row.
 */
export const UI_STEP_ORDER: readonly string[] = [
  "intake",
  "hard_data",
  "ir_business",
  "web_sentiment",
  "portfolio_context",
  "risk",
  "compiler",
  "qa",
];

function elapsedFromDates(startedAt: string | null, endedAt: string | null): number | null {
  if (!startedAt) return null;
  const start = Date.parse(startedAt);
  if (!Number.isFinite(start)) return null;
  const end = endedAt ? Date.parse(endedAt) : Date.now();
  if (!Number.isFinite(end)) return null;
  return Math.max(0, Math.round(((end - start) / 1000) * 10) / 10);
}

function synthesiseFanOutStep(
  kind: string,
  rows: ScreeningStepRow[],
): ScreeningRunStep {
  const total = rows.length;
  const doneCount = rows.filter(
    (s) => s.status === "done" || s.status === "skipped",
  ).length;
  const anyFailed = rows.some((s) => s.status === "failed");
  const anyRunning = rows.some((s) => s.status === "running");
  const anyPending = rows.some((s) => s.status === "pending");

  let status: ScreeningRunStep["status"] = "pending";
  if (anyFailed && doneCount + rows.filter((s) => s.status === "failed").length === total) {
    status = "failed";
  } else if (doneCount === total && total > 0) {
    status = "done";
  } else if (anyRunning || (anyPending && doneCount > 0)) {
    status = "running";
  } else if (anyFailed) {
    status = "running"; // still progressing / retrying siblings
  }

  const startedAts = rows
    .map((s) => s.startedAt)
    .filter((v): v is string => Boolean(v));
  const completedAts = rows
    .map((s) => s.completedAt)
    .filter((v): v is string => Boolean(v));
  const earliestStart =
    startedAts.length > 0
      ? startedAts.reduce((a, b) => (a < b ? a : b))
      : null;
  const latestEnd =
    status === "done" && completedAts.length > 0
      ? completedAts.reduce((a, b) => (a > b ? a : b))
      : null;

  const failedMsg = rows.find((s) => s.status === "failed" && s.errorMessage)
    ?.errorMessage;

  return {
    agentKind: kind,
    status,
    elapsedSeconds: elapsedFromDates(earliestStart, latestEnd),
    subStepsTotal: total,
    subStepsDone: doneCount,
    errorMessage: failedMsg ?? null,
  };
}

const CORE_PENDING_KINDS = new Set([
  "hard_data",
  "ir_business",
  "web_sentiment",
  "portfolio_context",
  "risk",
  "compiler",
]);

/**
 * Placeholder timeline shown before the first poll returns — Intake done,
 * research agents + Compiler pending, QA "coming soon".
 */
export function buildOptimisticRun(runId: string): ScreeningRun {
  const steps: ScreeningRunStep[] = UI_STEP_ORDER.map((kind): ScreeningRunStep => {
    if (kind === "intake") {
      return { agentKind: kind, status: "done", elapsedSeconds: 0 };
    }
    if (CORE_PENDING_KINDS.has(kind)) {
      return { agentKind: kind, status: "pending", elapsedSeconds: null };
    }
    return { agentKind: kind, status: "skipped", elapsedSeconds: null };
  });
  return {
    runId,
    mode: "user_report",
    status: "queued",
    createdAt: new Date().toISOString(),
    steps,
    progressPct: 0,
    mocked: false,
    reportReady: false,
  };
}

/**
 * Compose the ScreeningRun shape the UI already renders. Steps not present in
 * DB are surfaced as `skipped` so the E3/E4 slice does not orphan the timeline.
 * Multiple `ir_business` rows are synthesised into one UI step with sub-counts.
 *
 * For real (non-mocked) runs, IR is shown as `pending` while Hard Data is still
 * active — otherwise the UI falsely says "coming soon" before fan-out inserts
 * the per-ticker rows.
 */
export function buildRunResponse(
  row: ScreeningRunRow,
  dbSteps: ScreeningStepRow[],
): ScreeningRun {
  const byKind = new Map<string, ScreeningStepRow[]>();
  for (const s of dbSteps) {
    if (
      s.agentKind === "aggregate_ir_business" ||
      s.agentKind === "aggregate_web_sentiment"
    ) {
      continue;
    }
    const list = byKind.get(s.agentKind) ?? [];
    list.push(s);
    byKind.set(s.agentKind, list);
  }

  const hardDataRows = byKind.get("hard_data") ?? [];
  const hardDataStatus = hardDataRows[0]?.status;
  const hardDataActive =
    !row.mockedPipeline &&
    (hardDataStatus === "pending" ||
      hardDataStatus === "running" ||
      hardDataRows.length === 0);

  // Once v2 fan-out inserts rows, those kinds appear in byKind. While Hard Data
  // is still active (before fan-out), show research agents as pending.
  const v2KindsPendingWhileHardData = [
    "web_sentiment",
    "portfolio_context",
    "risk",
  ] as const;

  const steps: ScreeningRunStep[] = UI_STEP_ORDER.map((kind): ScreeningRunStep => {
    const rows = byKind.get(kind) ?? [];
    if (rows.length === 0) {
      if (kind === "intake") {
        return { agentKind: kind, status: "done", elapsedSeconds: 0 };
      }
      // Real pipeline: IR / Compiler expected after Hard Data.
      if (kind === "ir_business" && hardDataActive) {
        return { agentKind: kind, status: "pending", elapsedSeconds: null };
      }
      if (kind === "compiler" && hardDataActive) {
        return { agentKind: kind, status: "pending", elapsedSeconds: null };
      }
      if (
        hardDataActive &&
        (v2KindsPendingWhileHardData as readonly string[]).includes(kind)
      ) {
        return { agentKind: kind, status: "pending", elapsedSeconds: null };
      }
      return { agentKind: kind, status: "skipped", elapsedSeconds: null };
    }
    if (kind === "ir_business" || kind === "web_sentiment" || rows.length > 1) {
      return synthesiseFanOutStep(kind, rows);
    }
    const dbStep = rows[0];
    const elapsed = elapsedFromDates(dbStep.startedAt, dbStep.completedAt);
    return {
      agentKind: dbStep.agentKind,
      status: dbStep.status,
      elapsedSeconds: elapsed,
      errorMessage: dbStep.errorMessage ?? null,
    };
  });

  const active = steps.filter(
    (s) => s.status !== "skipped" && s.agentKind !== "intake",
  );
  const doneOrTerminal = active.filter(
    (s) => s.status === "done" || s.status === "failed",
  );
  const total = Math.max(1, active.length);
  const progressPct = Math.min(
    100,
    Math.round((doneOrTerminal.length / total) * 100),
  );

  const hasFailed = active.some((s) => s.status === "failed");
  const allDone = active.length > 0 && active.every((s) => s.status === "done");
  let status: ScreeningRunStatus = "running";
  if (hasFailed && !allDone) status = "failed";
  else if (allDone) status = "completed";
  else if (row.status === "authorized" && active.every((s) => s.status === "pending")) {
    status = "queued";
  }

  const compilerDone = active.find((s) => s.agentKind === "compiler")?.status === "done";

  return {
    runId: row.id,
    mode: "user_report",
    status,
    createdAt: row.createdAt,
    steps,
    progressPct,
    mocked: row.mockedPipeline,
    reportReady: compilerDone,
  };
}
