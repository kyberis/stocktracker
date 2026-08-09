import type { ScreeningStepRow } from "@/lib/db";
import type { ScreeningRunRow } from "@/lib/db/screening";
import {
  SCREENING_STALE_MS,
  SCREENING_STUCK_MS,
  type ScreeningRun,
  type ScreeningRunStep,
  type ScreeningRunStatus,
} from "@/lib/screening/schemas";

/**
 * All agent kinds the UI expects to see in the progress timeline. Any kind not
 * present in `steps` (e.g. Web/Portfolio Context/Risk/QA in this slice)
 * is rendered as `skipped` so the timeline stays complete even when the
 * pipeline is intentionally partial.
 *
 * Note: `aggregate_*` barriers are internal and are NOT shown — progress is
 * folded into the synthesised per-ticker rows.
 */
export const UI_STEP_ORDER: readonly string[] = [
  "intake",
  "hard_data",
  "ir_business",
  "web_sentiment",
  "technicals",
  "portfolio_context",
  "risk",
  "compiler",
  "shortlist_research",
  "compiler_evaluate",
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
  } else if (anyRunning || anyPending || anyFailed) {
    // Fan-out rows already exist: show as running (with N/M) so the UI proves
    // work is queued even before a lease is claimed. Otherwise all-pending
    // technicals vanish from the feed and the run looks frozen.
    status = "running";
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
  "technicals",
  "portfolio_context",
  "risk",
  "compiler",
  "shortlist_research",
  "compiler_evaluate",
  "qa",
]);

/**
 * Placeholder timeline shown before the first poll returns — Intake done,
 * research agents + Compiler + QA pending.
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
  const now = new Date().toISOString();
  return {
    runId,
    mode: "user_report",
    status: "queued",
    createdAt: now,
    steps,
    progressPct: 0,
    mocked: false,
    reportReady: false,
    lastActivityAt: now,
    stallState: "ok",
  };
}

function maxIsoTimestamp(...candidates: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const c of candidates) {
    if (!c) continue;
    const ms = Date.parse(c);
    if (!Number.isFinite(ms)) continue;
    if (ms >= bestMs) {
      bestMs = ms;
      best = c;
    }
  }
  return best;
}

function stallStateForActivity(
  status: ScreeningRunStatus,
  lastActivityAt: string | null,
  nowMs: number = Date.now(),
): ScreeningRun["stallState"] {
  if (status === "completed" || status === "failed") return "ok";
  if (!lastActivityAt) return "stuck";
  const activityMs = Date.parse(lastActivityAt);
  if (!Number.isFinite(activityMs)) return "stuck";
  const age = nowMs - activityMs;
  if (age >= SCREENING_STUCK_MS) return "stuck";
  if (age >= SCREENING_STALE_MS) return "stale";
  return "ok";
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
export interface BuildRunOptions {
  /**
   * When true, `reportReady` requires both the compiler to be done AND the
   * latest QA step to have completed. When QA is completed but blocking, this
   * still returns `reportReady=true` after the round cap (verdict is
   * `pass_with_degradation`); the report reader is responsible for filtering
   * degraded tickers and possibly returning HTTP 409 mid-run.
   */
  qaGating?: boolean;
  /**
   * Latest QA verdict for the run, when available. Only used when
   * `qaGating=true`. `null` means QA has not completed yet — report is not
   * ready under gating.
   */
  qaVerdict?: "pass" | "fail" | "pass_with_degradation" | null;
  /**
   * How many QA rounds have completed (rows in `screening_qa_rounds`).
   * Optional. Only relevant when `qaGating=true`.
   */
  qaRoundsCompleted?: number;
  /** Round cap (defaults to 2). Only relevant when `qaGating=true`. */
  qaMaxRounds?: number;
}

export function buildRunResponse(
  row: ScreeningRunRow,
  dbSteps: ScreeningStepRow[],
  options: BuildRunOptions = {},
): ScreeningRun {
  const byKind = new Map<string, ScreeningStepRow[]>();
  for (const s of dbSteps) {
    if (
      s.agentKind === "aggregate_ir_business" ||
      s.agentKind === "aggregate_web_sentiment" ||
      s.agentKind === "aggregate_technicals"
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
    "technicals",
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
      // QA gating on: keep QA visible as pending until the step row exists
      // (inserted after Compiler), instead of "coming soon" / skipped.
      if (kind === "qa" && options.qaGating && !row.mockedPipeline) {
        return { agentKind: kind, status: "pending", elapsedSeconds: null };
      }
      return { agentKind: kind, status: "skipped", elapsedSeconds: null };
    }
    if (
      kind === "ir_business" ||
      kind === "web_sentiment" ||
      kind === "technicals" ||
      rows.length > 1
    ) {
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
  // Partial credit for in-flight steps so the bar moves after Hard Data and
  // does not look frozen at ~11% while IR/Web/Technicals research runs.
  let progressUnits = 0;
  for (const s of active) {
    if (s.status === "done" || s.status === "failed") {
      progressUnits += 1;
      continue;
    }
    if (s.status === "running") {
      const total = s.subStepsTotal ?? 0;
      const done = s.subStepsDone ?? 0;
      if (total > 0) {
        progressUnits += Math.min(1, (done + 0.35) / total);
      } else {
        progressUnits += 0.4;
      }
    }
  }
  const progressPct = Math.min(
    100,
    Math.round((progressUnits / Math.max(1, active.length)) * 100),
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
  const evaluateStep = active.find((s) => s.agentKind === "compiler_evaluate");
  const evaluateDone =
    !evaluateStep ||
    evaluateStep.status === "done" ||
    evaluateStep.status === "failed";
  const researchStep = active.find((s) => s.agentKind === "shortlist_research");
  const researchDone =
    !researchStep ||
    researchStep.status === "done" ||
    researchStep.status === "failed";

  let reportReady = compilerDone && researchDone && evaluateDone;
  if (options.qaGating) {
    // QA-gated: report is ready only when the latest verdict passes (or
    // pass_with_degradation after the round cap). null verdict means still
    // running -> not ready.
    reportReady =
      compilerDone &&
      researchDone &&
      evaluateDone &&
      (options.qaVerdict === "pass" ||
        options.qaVerdict === "pass_with_degradation");
  }

  const lastActivityAt = maxIsoTimestamp(
    row.updatedAt,
    ...dbSteps.map((s) => s.updatedAt),
    ...dbSteps.map((s) => s.completedAt),
    ...dbSteps.map((s) => s.startedAt),
  );

  return {
    runId: row.id,
    mode: "user_report",
    status,
    createdAt: row.createdAt,
    steps,
    progressPct,
    mocked: row.mockedPipeline,
    reportReady,
    lastActivityAt,
    stallState: stallStateForActivity(status, lastActivityAt),
    qa: options.qaGating
      ? {
          gating: true,
          verdict: options.qaVerdict ?? null,
          roundsCompleted: options.qaRoundsCompleted ?? 0,
          maxRounds: options.qaMaxRounds ?? 2,
        }
      : null,
  };
}
