import { NextRequest, NextResponse } from "next/server";

import { verifyCronAuth } from "@/lib/cron-logging";
import { kickScreeningWorker } from "@/lib/screening/orchestrator/kick-worker";
import { processOneStep } from "@/lib/screening/orchestrator/runner";

export const dynamic = "force-dynamic";
/** Web/IR steps can take >60s (FMP + Tavily + LLM); killing mid-step left orphans. */
export const maxDuration = 300;

/**
 * Max steps to drain inline before chaining. Keep modest so one request stays
 * under maxDuration, but high enough that the sequential tail
 * (portfolio_context → risk → compiler) rarely depends on a second hop.
 */
const MAX_STEPS_PER_REQUEST = 4;

/**
 * Internal worker for the screening orchestrator (HLD ADR-2).
 *
 * One HTTP request drains up to {@link MAX_STEPS_PER_REQUEST} steps so a
 * dropped waitUntil self-chain cannot strand the queue after Hard Data.
 * If work remains, we **await** the next kick (not waitUntil) — deferred
 * chains were dropping after portfolio_context and leaving risk pending.
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

  let chained = false;
  if (last.moreWork) {
    // Awaited hop — waitUntil/defer has been dropping the post-PC → risk chain.
    const kick = await kickScreeningWorker({
      runId: bodyRunId,
      req,
      authorization: req.headers.get("authorization") ?? undefined,
      mode: "await",
      timeoutMs: 120_000,
    });
    chained = kick.ok;
    if (!kick.ok) {
      console.error(
        "[screening/worker] awaited chain failed",
        kick.status ?? kick.error,
      );
    }
  }

  return NextResponse.json({
    ...last,
    processed,
    moreWork: last.moreWork,
    chained,
  });
}
