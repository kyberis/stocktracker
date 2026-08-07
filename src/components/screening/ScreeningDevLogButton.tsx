"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Temporary Dev button (bottom-right) that opens a modal with raw screening
 * agent outputs for the current user. On a run page it scopes to that run and
 * surfaces sources + per-agent results. The endpoint gates access to
 * admins / dev env / `screening_dev_lab_enabled`.
 */

interface DevOutput {
  id: string;
  runId: string | null;
  agentKind: string;
  ticker: string | null;
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

function extractSources(outputJson: string): Array<{ label: string; url?: string; asOf?: string }> {
  try {
    const parsed = JSON.parse(outputJson) as Record<string, unknown>;
    const out: Array<{ label: string; url?: string; asOf?: string }> = [];

    const pushSource = (s: unknown) => {
      if (!s || typeof s !== "object") return;
      const row = s as Record<string, unknown>;
      const label = String(row.label ?? row.url ?? "").trim();
      if (!label) return;
      out.push({
        label: label.slice(0, 160),
        url: row.url != null ? String(row.url).slice(0, 500) : undefined,
        asOf: row.asOf != null ? String(row.asOf).slice(0, 40) : undefined,
      });
    };

    if (Array.isArray(parsed.sources)) {
      for (const s of parsed.sources) pushSource(s);
    }
    const guidance = parsed.guidance as Record<string, unknown> | undefined;
    if (guidance && Array.isArray(guidance.sources)) {
      for (const s of guidance.sources) pushSource(s);
    }
    if (Array.isArray(parsed.catalysts)) {
      for (const c of parsed.catalysts) {
        if (c && typeof c === "object") {
          const cat = c as Record<string, unknown>;
          if (Array.isArray(cat.sources)) {
            for (const s of cat.sources) pushSource(s);
          }
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

function runIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const m = pathname.match(/\/screening\/runs\/([^/?#]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export function ScreeningDevLogButton() {
  const pathname = usePathname();
  const scopedRunId = useMemo(() => runIdFromPath(pathname), [pathname]);
  const [visible, setVisible] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [outputs, setOutputs] = useState<DevOutput[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      const qs = new URLSearchParams({ limit: scopedRunId ? "50" : "20" });
      if (scopedRunId) qs.set("runId", scopedRunId);
      const res = await fetch(`/api/screening/dev/outputs?${qs.toString()}`, {
        cache: "no-store",
      });
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
  }, [scopedRunId]);

  useEffect(() => {
    if (open) {
      setOutputs(null);
      void refresh();
    }
  }, [open, scopedRunId, refresh]);

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
        {scopedRunId ? "Run agents" : "Agent log"}
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
                  {scopedRunId
                    ? `Run ${scopedRunId.slice(0, 8)}… — per-agent outputs`
                    : "Last 20 agent outputs"}
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
                <p className="text-[12.5px] text-[color:var(--muted)]">
                  {scopedRunId
                    ? "No agent outputs for this run yet — refresh as steps finish."
                    : "No agent outputs yet."}
                </p>
              )}
              <ul className="flex list-none flex-col gap-3 p-0">
                {outputs?.map((o) => {
                  const sources = extractSources(o.outputJson);
                  const expanded = expandedId === o.id;
                  return (
                    <li
                      key={o.id}
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[color:var(--muted)]">
                        <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5 uppercase tracking-wider text-teal-600 dark:text-teal-300">
                          {o.agentKind}
                        </span>
                        {o.ticker ? (
                          <span className="font-mono text-[color:var(--foreground)]">{o.ticker}</span>
                        ) : null}
                        <span>{new Date(o.createdAt).toLocaleString()}</span>
                        <span>{o.latencyMs} ms</span>
                        {!scopedRunId && o.runId ? (
                          <span className="font-mono">run {o.runId.slice(0, 8)}</span>
                        ) : null}
                      </div>

                      {sources.length > 0 ? (
                        <div className="mt-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                            Sources consulted
                          </p>
                          <ul className="mt-1 list-none space-y-1 p-0">
                            {sources.map((s, i) => (
                              <li key={`${s.label}-${i}`} className="text-[12px] text-[color:var(--foreground)]">
                                {s.url ? (
                                  <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                                  >
                                    {s.label}
                                  </a>
                                ) : (
                                  s.label
                                )}
                                {s.asOf ? (
                                  <span className="ml-1.5 text-[11px] text-[color:var(--muted)]">
                                    · {s.asOf}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : o.id)}
                        className="mt-2 text-[12px] font-semibold text-teal-700 dark:text-teal-300"
                      >
                        {expanded ? "Hide result" : "Show result JSON"}
                      </button>
                      {expanded ? (
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/[0.03] p-2 text-[11.5px] leading-tight text-[color:var(--foreground)] dark:bg-white/[0.04]">
                          {prettyJson(o.outputJson)}
                        </pre>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
