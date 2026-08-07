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

export interface KickScreeningWorkerOpts {
  runId?: string | null;
  req?: NextRequest;
  /** Override Authorization header (e.g. forward the cron Bearer). */
  authorization?: string;
  /**
   * `await` — block until the worker HTTP call returns (reliable; preferred
   * from POST /runs and the recover cron). `defer` — fire-and-forget via
   * waitUntil (used for self-chaining after a step finishes).
   */
  mode?: "await" | "defer";
  /** Abort the awaited fetch after this many ms (default 50s). */
  timeoutMs?: number;
}

export interface KickScreeningWorkerResult {
  ok: boolean;
  status?: number;
  body?: string;
  error?: string;
}

async function postWorker(
  origin: string,
  auth: string,
  body: string,
  timeoutMs: number,
): Promise<KickScreeningWorkerResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${origin}/api/internal/screening/worker`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: auth,
      },
      body,
      signal: controller.signal,
    });
    const text = (await res.text().catch(() => "")).slice(0, 500);
    if (!res.ok) {
      console.error(
        `[screening/worker-kick] ${res.status} from ${origin}: ${text}`,
      );
      return { ok: false, status: res.status, body: text };
    }
    return { ok: true, status: res.status, body: text };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[screening/worker-kick] fetch failed", message);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kick the internal screening worker. Prefer `mode: "await"` from request
 * handlers so a dropped waitUntil cannot leave Hard Data pending forever.
 */
export async function kickScreeningWorker(
  opts: KickScreeningWorkerOpts,
): Promise<KickScreeningWorkerResult> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth =
    opts.authorization?.trim() ||
    (cronSecret ? `Bearer ${cronSecret}` : "");
  if (!auth) {
    console.warn(
      "[screening/worker-kick] CRON_SECRET not set — worker not kicked",
    );
    return { ok: false, error: "missing_cron_secret" };
  }
  const origin = resolveScreeningWorkerOrigin(opts.req);
  const body = JSON.stringify(opts.runId ? { runId: opts.runId } : {});
  const timeoutMs = Math.max(5_000, opts.timeoutMs ?? 50_000);
  const mode = opts.mode ?? "defer";

  if (mode === "await") {
    return postWorker(origin, auth, body, timeoutMs);
  }

  deferTask(async () => {
    await postWorker(origin, auth, body, timeoutMs);
  });
  return { ok: true };
}
