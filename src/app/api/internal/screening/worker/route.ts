import { NextRequest, NextResponse } from "next/server";

import { verifyCronAuth } from "@/lib/cron-logging";
import { kickScreeningWorker } from "@/lib/screening/orchestrator/kick-worker";
import { processOneStep } from "@/lib/screening/orchestrator/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Internal worker for the screening orchestrator (HLD ADR-2). One HTTP request
 * = one leased step. On success (or handler-missing), the worker self-invokes
 * so the next pending step advances without needing Vercel Queues.
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

  // Self-invoke when the run still has work. Lease atomicity prevents double
  // processing if two kicks overlap.
  if (result.moreWork) {
    kickScreeningWorker({
      runId: bodyRunId,
      req,
      authorization: req.headers.get("authorization") ?? undefined,
    });
  }

  return NextResponse.json(result);
}
