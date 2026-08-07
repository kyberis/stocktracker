import { NextRequest, NextResponse } from "next/server";

import { verifyCronAuth } from "@/lib/cron-logging";
import { getRequestPublicOrigin } from "@/lib/http/request-public-origin";
import { deferTask } from "@/lib/task-runner";
import { processOneStep } from "@/lib/screening/orchestrator/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Internal worker for the screening orchestrator (HLD ADR-2). One HTTP request
 * = one leased step. On success (or handler-missing), the worker self-invokes
 * with a small jitter to advance the run, so we don't need Vercel Queues.
 *
 * Auth: shares CRON_SECRET with the cron routes. The `screening-recover` cron
 * and the `POST /api/screening/runs` route both call this endpoint directly.
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

  const result = await processOneStep({ runId: bodyRunId ?? undefined });

  // Self-invoke when the run still has work to do. Fire-and-forget via waitUntil
  // so the response returns immediately; a small jitter smooths out concurrent
  // invocations when a step completes very fast.
  if (result.moreWork) {
    const origin = getRequestPublicOrigin(req);
    const authHeader = req.headers.get("authorization") ?? "";
    const runIdToChain = result.stepId ? bodyRunId : bodyRunId; // preserve scope
    deferTask(async () => {
      const jitter = 100 + Math.floor(Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, jitter));
      try {
        await fetch(`${origin}/api/internal/screening/worker`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: authHeader,
          },
          body: JSON.stringify({ runId: runIdToChain }),
        });
      } catch (err) {
        console.error(
          "[screening/worker] self-invoke failed",
          err instanceof Error ? err.message : err,
        );
      }
    });
  }

  return NextResponse.json(result);
}
