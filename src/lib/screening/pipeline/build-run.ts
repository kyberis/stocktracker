import type { ScreeningStepRow } from "@/lib/db";
import type { ScreeningRunRow } from "@/lib/db/screening";
import type { ScreeningRun, ScreeningRunStep, ScreeningRunStatus } from "@/lib/screening/schemas";

/**
 * All agent kinds the UI expects to see in the progress timeline. Any kind not
 * present in `steps` (e.g. IR/Web/Portfolio Context/Risk/QA in this slice)
 * is rendered as `skipped` so the timeline stays complete even when the
 * pipeline is intentionally partial.
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

/**
 * Compose the ScreeningRun shape the UI already renders. Steps not present in
 * DB are surfaced as `skipped` so the E3 slice does not orphan the timeline.
 */
export function buildRunResponse(
  row: ScreeningRunRow,
  dbSteps: ScreeningStepRow[],
): ScreeningRun {
  const byKind = new Map<string, ScreeningStepRow>();
  for (const s of dbSteps) byKind.set(s.agentKind, s);

  // Consider "intake" as done because the brief already exists.
  const steps: ScreeningRunStep[] = UI_STEP_ORDER.map((kind): ScreeningRunStep => {
    const dbStep = byKind.get(kind);
    if (!dbStep) {
      if (kind === "intake") {
        return { agentKind: kind, status: "done", elapsedSeconds: 0 };
      }
      return { agentKind: kind, status: "skipped", elapsedSeconds: null };
    }
    const elapsed = elapsedFromDates(dbStep.startedAt, dbStep.completedAt);
    return {
      agentKind: dbStep.agentKind,
      status: dbStep.status,
      elapsedSeconds: elapsed,
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

  // Report is ready when the Compiler step is done (its output row is what the
  // GET /reports route reads). Hard Data alone is not enough.
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
