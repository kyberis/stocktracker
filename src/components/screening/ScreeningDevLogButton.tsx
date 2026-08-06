"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Temporary Dev button (bottom-right) that opens a modal with the raw Intake
 * agent outputs for the current user. The endpoint itself gates access to
 * admins / dev env / `screening_dev_lab_enabled`, so we only need to fail
 * silently on 404 to hide the button for regular users.
 */

interface DevOutput {
  id: string;
  runId: string | null;
  agentKind: string;
  latencyMs: number;
  createdAt: string;
  outputJson: string;
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function ScreeningDevLogButton() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [outputs, setOutputs] = useState<DevOutput[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const probe = useCallback(async () => {
    try {
      const res = await fetch("/api/screening/dev/outputs?limit=1", { cache: "no-store" });
      setVisible(res.ok);
    } catch {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    void probe();
  }, [probe]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/screening/dev/outputs?limit=20", { cache: "no-store" });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setOutputs([]);
        return;
      }
      const data = (await res.json()) as { outputs?: DevOutput[] };
      setOutputs(data.outputs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "network_error");
      setOutputs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && outputs === null) {
      void refresh();
    }
  }, [open, outputs, refresh]);

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/[0.08] px-3.5 text-[12px] font-semibold text-teal-700 shadow-sm backdrop-blur-sm hover:bg-teal-500/[0.15] dark:text-teal-300"
        aria-label="Open agent log (Dev)"
      >
        <span className="rounded-full bg-teal-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
          Dev
        </span>
        Agent log
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="screening-dev-log-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="card mx-3 mb-3 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-t-[20px] border border-[color:var(--border)] bg-[color:var(--surface)] sm:mb-0 sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
                  Dev — agent log · temporary
                </p>
                <h2
                  id="screening-dev-log-title"
                  className="text-sm font-semibold text-[color:var(--foreground)]"
                >
                  Last 20 Intake outputs
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={loading}
                  className="btn-secondary inline-flex min-h-9 items-center rounded-lg px-3 text-[12px] font-semibold disabled:opacity-60"
                >
                  {loading ? "Loading…" : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary inline-flex min-h-9 items-center rounded-lg px-3 text-[12px] font-semibold"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
            </header>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              {error && (
                <p className="text-[12.5px] text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              {outputs && outputs.length === 0 && !error && (
                <p className="text-[12.5px] text-[color:var(--muted)]">No agent outputs yet.</p>
              )}
              <ul className="flex list-none flex-col gap-3 p-0">
                {outputs?.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[color:var(--muted)]">
                      <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5 uppercase tracking-wider text-teal-600 dark:text-teal-300">
                        {o.agentKind}
                      </span>
                      <span>{new Date(o.createdAt).toLocaleString()}</span>
                      <span>{o.latencyMs} ms</span>
                      {o.runId && <span className="font-mono">run {o.runId.slice(0, 8)}</span>}
                    </div>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/[0.03] p-2 text-[11.5px] leading-tight text-[color:var(--foreground)] dark:bg-white/[0.04]">
                      {prettyJson(o.outputJson)}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
