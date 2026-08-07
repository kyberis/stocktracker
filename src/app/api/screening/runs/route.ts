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
} from "@/lib/db";
import { recordScreeningRunCreated } from "@/lib/screening/metrics";
import { getRequestPublicOrigin } from "@/lib/http/request-public-origin";
import { deferTask } from "@/lib/task-runner";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import { buildRunResponse } from "@/lib/screening/pipeline/build-run";
import { HARD_DATA_AGENT_KIND } from "@/lib/screening/agents/hard-data";
import { COMPILER_AGENT_KIND } from "@/lib/screening/agents/compiler";

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
    // Legacy mock path — unchanged.
    const runId = createMockRunId();
    const run = buildMockRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Could not create run" }, { status: 500 });
    }
    try {
      await createScreeningRun({
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

  // Real pipeline path.
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

  // Insert steps: hard_data first, compiler depends on it.
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

  // Link the most recent Intake output for this user (within the last hour)
  // to the newly created run. Best-effort — the worker doesn't depend on it.
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

  // Fire the worker without blocking the response.
  const origin = getRequestPublicOrigin(req);
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    deferTask(async () => {
      try {
        await fetch(`${origin}/api/internal/screening/worker`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({ runId: runRow.id }),
        });
      } catch (err) {
        console.error(
          "[screening/runs] worker kick failed",
          err instanceof Error ? err.message : err,
        );
      }
    });
  } else {
    console.warn(
      "[screening/runs] CRON_SECRET not set — worker not kicked, relying on cron recover",
    );
  }

  const run = buildRunResponse(runRow, []);
  return NextResponse.json({ run }, { status: 201 });
});
