type JobStatus<T = unknown> = {
  status: "running" | "completed" | "failed";
  result?: T;
  error?: string;
  startedAt: number;
};

const EVICTION_MS = 5 * 60 * 1000;

const jobs = new Map<string, JobStatus>();

function isVercel(): boolean {
  return !!process.env.VERCEL;
}

/**
 * Keep a deferred promise alive past the HTTP response on Vercel.
 *
 * Prefer a synchronous require of `@vercel/functions` when available so we
 * register `waitUntil` *before* the isolate can freeze. The previous dynamic
 * `import().then(...)` raced the response and silently dropped screening
 * worker kicks (steps stayed pending forever).
 */
function schedulePromise(promise: Promise<unknown>): void {
  if (!isVercel()) {
    // Locally the promise already runs in the long-lived Node process.
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { waitUntil } = require("@vercel/functions") as {
      waitUntil: (p: Promise<unknown>) => void;
    };
    waitUntil(promise);
  } catch (err) {
    // Fallback: dynamic import (still better than dropping the work).
    console.warn(
      "[task-runner] sync waitUntil unavailable, falling back to dynamic import",
      err instanceof Error ? err.message : err,
    );
    import("@vercel/functions")
      .then(({ waitUntil }) => waitUntil(promise))
      .catch((importErr) =>
        console.error(
          "[task-runner] waitUntil import failed",
          importErr instanceof Error ? importErr.message : importErr,
        ),
      );
  }
}

function evictStale(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.status !== "running" && now - job.startedAt > EVICTION_MS) {
      jobs.delete(id);
    }
  }
}

/**
 * Fire-and-forget background work.
 * On Vercel uses `waitUntil`; locally the promise simply runs in the background.
 */
export function deferTask(fn: () => Promise<void>): void {
  const promise = fn().catch((err) =>
    console.error("[task-runner] deferred task failed:", err),
  );
  schedulePromise(promise);
}

/**
 * Submit a trackable background job. Returns immediately with the job ID.
 * The caller can poll `getJobStatus` to check completion.
 */
export function submitJob<T>(
  id: string,
  fn: () => Promise<T>,
): string {
  evictStale();

  jobs.set(id, { status: "running", startedAt: Date.now() });

  const promise = fn()
    .then((result) => {
      jobs.set(id, { status: "completed", result, startedAt: Date.now() });
    })
    .catch((err) => {
      jobs.set(id, {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        startedAt: Date.now(),
      });
    });

  schedulePromise(promise);

  return id;
}

/**
 * Check the status of a previously submitted job.
 */
export function getJobStatus(id: string): JobStatus | null {
  return jobs.get(id) ?? null;
}

/**
 * Retry an async function with exponential backoff.
 * Delays between attempts: baseDelayMs, baseDelayMs*2, baseDelayMs*4, ...
 * Throws the last error if all attempts fail.
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 1000 } = {},
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }
  throw new Error("retryAsync: unreachable");
}
