import type { ScreeningRunRow } from "@/lib/db/screening";
import type { QaVerdict, ScreeningStepRow } from "@/lib/db";
import type { ScreeningRunListItem, ScreeningRunStatus } from "@/lib/screening/schemas";

export interface ToListItemOptions {
  qaGating?: boolean;
  qaVerdict?: QaVerdict | null;
}

/**
 * Map a DB run (+ optional steps) to the compact list card shown on /screening.
 */
export function toScreeningRunListItem(
  row: ScreeningRunRow,
  steps: ScreeningStepRow[] = [],
  options: ToListItemOptions = {},
): ScreeningRunListItem {
  let summary = "";
  let candidateCount: number | null = null;
  try {
    const brief = JSON.parse(row.briefJson) as {
      includeSectors?: string[];
      excludeSectors?: string[];
      regions?: string[];
      candidateCount?: number;
    };
    const parts: string[] = [];
    if (brief.includeSectors?.length) {
      parts.push(brief.includeSectors.slice(0, 3).join(", "));
    }
    if (brief.excludeSectors?.length) {
      parts.push(`excl. ${brief.excludeSectors.slice(0, 2).join(", ")}`);
    }
    if (brief.regions?.length) {
      parts.push(brief.regions.slice(0, 2).join(" · "));
    }
    summary = parts.join(" · ").slice(0, 160);
    if (
      typeof brief.candidateCount === "number" &&
      Number.isFinite(brief.candidateCount)
    ) {
      candidateCount = Math.min(5, Math.max(0, Math.round(brief.candidateCount)));
    }
  } catch {
    summary = "";
  }

  const compilerDone = steps.some(
    (s) => s.agentKind === "compiler" && s.status === "done",
  );
  const anyFailed = steps.some((s) => s.status === "failed");
  const anyRunning = steps.some(
    (s) => s.status === "running" || s.status === "pending",
  );

  let status: ScreeningRunStatus = "queued";
  if (row.status === "completed" || compilerDone) status = "completed";
  else if (anyFailed) status = "failed";
  else if (anyRunning || row.status === "running" || row.status === "authorized") {
    status = row.mockedPipeline && steps.length === 0 ? "completed" : "running";
  }

  // Mock fixture runs without a step queue are treated as completed so the
  // history card deep-links into the mock progress/report path.
  const baseReportReady =
    compilerDone || (row.mockedPipeline && status === "completed");

  // When QA gating is on, we also require a passing verdict. Mock rows keep
  // their pre-QA readiness (no QA step ever runs on the fixture).
  const reportReady = options.qaGating && !row.mockedPipeline
    ? baseReportReady &&
      (options.qaVerdict === "pass" ||
        options.qaVerdict === "pass_with_degradation")
    : baseReportReady;

  if (row.mockedPipeline && steps.length === 0) {
    status = "completed";
  }

  return {
    runId: row.id,
    intent: row.intent,
    status,
    createdAt: row.createdAt,
    mocked: row.mockedPipeline,
    summary: summary || "—",
    candidateCount,
    reportReady,
  };
}
