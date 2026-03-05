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

function schedulePromise(promise: Promise<unknown>): void {
  if (isVercel()) {
    // Dynamic import so the module loads cleanly outside Vercel
    import("@vercel/functions").then(({ waitUntil }) => waitUntil(promise));
  }
  // Locally the promise already runs in the long-lived Node process — nothing else needed.
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
