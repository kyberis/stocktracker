import type { NextRequest } from "next/server";

import { getRequestPublicOrigin } from "@/lib/http/request-public-origin";
import { deferTask } from "@/lib/task-runner";

/**
 * Resolve the base URL the screening worker should call itself on.
 * Prefer explicit app URL env vars so deferred kicks don't depend on
 * forwarded Host headers (which can be missing or wrong under waitUntil).
 */
export function resolveScreeningWorkerOrigin(req?: NextRequest): string {
  const fromEnv =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (req) return getRequestPublicOrigin(req);
  return "https://trefolio.com";
}

/**
 * Fire-and-forget kick of the internal screening worker. Auth uses CRON_SECRET
 * (same Bearer as Vercel Cron). Never throws to the caller.
 */
export function kickScreeningWorker(opts: {
  runId?: string | null;
  req?: NextRequest;
  /** Override Authorization header (e.g. forward the cron Bearer). */
  authorization?: string;
}): void {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth =
    opts.authorization?.trim() ||
    (cronSecret ? `Bearer ${cronSecret}` : "");
  if (!auth) {
    console.warn(
      "[screening/worker-kick] CRON_SECRET not set — worker not kicked",
    );
    return;
  }
  const origin = resolveScreeningWorkerOrigin(opts.req);
  const body = JSON.stringify(
    opts.runId ? { runId: opts.runId } : {},
  );

  deferTask(async () => {
    try {
      const res = await fetch(`${origin}/api/internal/screening/worker`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: auth,
        },
        body,
      });
      if (!res.ok) {
        const text = (await res.text().catch(() => "")).slice(0, 300);
        console.error(
          `[screening/worker-kick] ${res.status} from ${origin}: ${text}`,
        );
      }
    } catch (err) {
      console.error(
        "[screening/worker-kick] fetch failed",
        err instanceof Error ? err.message : err,
      );
    }
  });
}
