import { NextResponse, type NextRequest } from "next/server";

import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { requireScreeningAccess } from "@/lib/screening/guard";
import {
  buildMockRun,
  createMockRunId,
} from "@/lib/screening/mock-pipeline";
import { screeningBriefSchema } from "@/lib/screening/schemas";
import { runSanityLimits } from "@/lib/screening/rules/sanity-limits";
import {
  appendEvent,
  createScreeningRun,
  insertSteps,
  linkPendingAgentOutputToRun,
  listScreeningRunsByUser,
  listStepsForRun,
} from "@/lib/db";
import { recordScreeningRunCreated } from "@/lib/screening/metrics";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import { buildRunResponse } from "@/lib/screening/pipeline/build-run";
import { toScreeningRunListItem } from "@/lib/screening/pipeline/build-run-list-item";
import { HARD_DATA_AGENT_KIND } from "@/lib/screening/agents/hard-data";
import { COMPILER_AGENT_KIND } from "@/lib/screening/agents/compiler";
import { kickScreeningWorker } from "@/lib/screening/orchestrator/kick-worker";

/**
 * List recent screening runs for the authenticated user (entry-page history).
 */
export const GET = withMetrics("/api/screening/runs", async (req: NextRequest) => {
  const { session, error } = await requireScreeningAccess(req);
  if (error || !session) return error;

  const rows = await listScreeningRunsByUser(session.userId, 20);
  const runs = await Promise.all(
    rows.map(async (row) => {
      const steps = row.mockedPipeline ? [] : await listStepsForRun(row.id);
      return toScreeningRunListItem(row, steps);
    }),
  );
  return NextResponse.json({ runs });
});

/**
 * Create a screening run.
 *
 * Two paths, gated by `screening_pipeline_real_enabled`:
 *  1. **Mock (default):** persist the brief and return a `mock-*` id whose
 *     progress derives from the id timestamp. Same as before.
 *  2. **Real (flag on):** persist the run and step queue in Turso, link the
 *     Intake output, and kick the internal worker. The returned run id is the
 *     real DB id — `mock-*` ids no longer appear.
 */
export const POST = withMetrics("/api/screening/runs", async (req: NextRequest) => {
  const { session, error } = await requireScreeningAccess(req);
  if (error || !session) return error;

  const parsed = await parseBody(req, screeningBriefSchema);
  if (!parsed.success) return parsed.error;

  const sanity = runSanityLimits(parsed.data);
  if (!sanity.ok) {
    return NextResponse.json(
      { error: "brief_infeasible", issues: sanity.issues },
      { status: 422 },
    );
  }

  const realPipeline = await isFeatureEnabledForUser(
    "screening_pipeline_real_enabled",
    session.userId,
  );

  if (!realPipeline) {
    const runId = createMockRunId();
    const run = buildMockRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Could not create run" }, { status: 500 });
    }
    try {
      await createScreeningRun({
        id: runId,
        userId: session.userId,
        status: "authorized",
        intent: parsed.data.intent,
        briefJson: JSON.stringify(parsed.data),
        mockedPipeline: true,
      });
    } catch (err) {
      console.error(
        "[screening/runs] persist failed",
        err instanceof Error ? err.message : err,
      );
    }
    recordScreeningRunCreated(parsed.data.intent, true);
    return NextResponse.json({ run }, { status: 201 });
  }

  let runRow;
  try {
    runRow = await createScreeningRun({
      userId: session.userId,
      status: "authorized",
      intent: parsed.data.intent,
      briefJson: JSON.stringify(parsed.data),
      mockedPipeline: false,
    });
  } catch (err) {
    console.error(
      "[screening/runs] real persist failed",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Could not create run" }, { status: 500 });
  }

  try {
    const hardDataStepId = crypto.randomUUID();
    await insertSteps(runRow.id, [
      { id: hardDataStepId, agentKind: HARD_DATA_AGENT_KIND },
      { agentKind: COMPILER_AGENT_KIND, dependsOn: [hardDataStepId] },
    ]);
  } catch (err) {
    console.error(
      "[screening/runs] insertSteps failed",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Could not queue steps" }, { status: 500 });
  }

  try {
    await appendEvent({
      runId: runRow.id,
      eventType: "RunAuthorized",
      payload: { intent: parsed.data.intent },
    });
  } catch {
    // best-effort
  }

  try {
    await linkPendingAgentOutputToRun({
      userId: session.userId,
      agentKind: "intake",
      runId: runRow.id,
      withinMinutes: 60,
    });
  } catch (err) {
    console.error(
      "[screening/runs] intake link failed",
      err instanceof Error ? err.message : err,
    );
  }

  recordScreeningRunCreated(parsed.data.intent, false);

  // Await the first worker hop so Hard Data is leased before we return.
  // waitUntil-only kicks have been observed to drop on Vercel, leaving the
  // UI stuck on "pending" forever until the recover cron (or a manual kick).
  const kick = await kickScreeningWorker({
    runId: runRow.id,
    req,
    mode: "await",
    timeoutMs: 55_000,
  });
  if (!kick.ok) {
    console.error(
      "[screening/runs] awaited worker kick failed",
      kick.status ?? kick.error,
    );
    // Still return 201 — recover cron will pick the pending steps up.
  }

  // Re-read steps so the response reflects any progress the kick made.
  const steps = await listStepsForRun(runRow.id).catch(() => []);
  const run = buildRunResponse(runRow, steps);
  return NextResponse.json({ run }, { status: 201 });
});
