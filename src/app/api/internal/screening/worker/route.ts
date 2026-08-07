import { NextRequest, NextResponse } from "next/server";

import { verifyCronAuth } from "@/lib/cron-logging";
import { kickScreeningWorker } from "@/lib/screening/orchestrator/kick-worker";
import { processOneStep } from "@/lib/screening/orchestrator/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Max steps to drain in one worker invocation before returning. */
const MAX_STEPS_PER_REQUEST = 3;

/**
 * Internal worker for the screening orchestrator (HLD ADR-2).
 *
 * One HTTP request drains up to {@link MAX_STEPS_PER_REQUEST} steps so a
 * dropped waitUntil self-chain cannot strand the queue after Hard Data.
 * If work remains, we still fire a deferred kick as a belt-and-suspenders.
 *
 * Auth: shares CRON_SECRET with the cron routes.
 */
export async function POST(req: NextRequest) {
  const denied = verifyCronAuth("screening-worker", req);
  if (denied) return denied;

  let bodyRunId: string | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      runId?: string;
    };
    if (typeof body.runId === "string" && body.runId.length > 0) {
      bodyRunId = body.runId;
    }
  } catch {
    // ignore — no-body invocations are allowed
  }

  let processed = 0;
  let last = await processOneStep({ runId: bodyRunId ?? undefined });
  if (last.processed > 0) processed += last.processed;

  while (last.moreWork && processed < MAX_STEPS_PER_REQUEST) {
    last = await processOneStep({ runId: bodyRunId ?? undefined });
    if (last.processed === 0) break;
    processed += last.processed;
  }

  if (last.moreWork) {
    // Deferred chain for remaining work (IR fan-out can be >3 steps).
    void kickScreeningWorker({
      runId: bodyRunId,
      req,
      authorization: req.headers.get("authorization") ?? undefined,
      mode: "defer",
    });
  }

  return NextResponse.json({
    ...last,
    processed,
    moreWork: last.moreWork,
  });
}
