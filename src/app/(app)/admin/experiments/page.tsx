"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import ExperimentMetricsCatalogPanel, {
  appendMetricKey,
  parseMetricKeys,
} from "@/components/admin/ExperimentMetricsCatalogPanel";
import { getExperimentMetric } from "@/lib/experiment-metrics-catalog";

interface ExperimentVariant {
  key: string;
  weight: number;
}

interface Experiment {
  id: string;
  key: string;
  name: string;
  description: string;
  status: "draft" | "running" | "paused" | "archived";
  variants: ExperimentVariant[];
  metrics: string[];
  resetGeneration: number;
  createdAt: string;
  updatedAt: string;
  launchedAt: string;
  resetAt: string;
  assignedCount?: number;
}

interface VariantStats {
  variant: string;
  assigned: number;
  exposed: number;
  metrics: Record<string, { users: number; rate: number; last24h: number }>;
}

interface ExperimentStats {
  experimentId: string;
  key: string;
  status: Experiment["status"];
  variants: VariantStats[];
  metrics: string[];
}

const STATUS_STYLES: Record<Experiment["status"], string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200",
  running: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  archived: "bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300",
};

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export default function AdminExperimentsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<ExperimentStats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showMetricsCatalog, setShowMetricsCatalog] = useState(false);

  const [createForm, setCreateForm] = useState({
    key: "",
    name: "",
    description: "",
    variantsText: "control:30\nwarren_first_stock:70",
    metricsText: "first_stock_activation_shown,first_stock_example_sent,holding_add,portfolio_import",
  });

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVariantsText, setEditVariantsText] = useState("");
  const [editMetricsText, setEditMetricsText] = useState("");

  const selected = useMemo(
    () => experiments.find((e) => e.id === selectedId) || null,
    [experiments, selectedId],
  );

  const loadList = useCallback(async () => {
    const res = await fetch("/api/admin/experiments");
    if (!res.ok) throw new Error("Failed to load experiments");
    const data = (await res.json()) as { experiments: Experiment[] };
    setExperiments(data.experiments || []);
    return data.experiments || [];
  }, []);

  const loadStats = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/experiments/${id}/stats`);
    if (!res.ok) return;
    const data = (await res.json()) as { stats: ExperimentStats };
    setStats(data.stats);
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
      return;
    }
    if (!user) return;
    loadList()
      .then((list) => {
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0]!.id);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- select first only on initial load
  }, [user, router, loadList]);

  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name);
    setEditDescription(selected.description);
    setEditVariantsText(
      selected.variants.map((v) => `${v.key}:${v.weight}`).join("\n"),
    );
    setEditMetricsText(selected.metrics.join(","));
    void loadStats(selected.id);
  }, [selected, loadStats]);

  // Live refresh while an experiment is selected
  useEffect(() => {
    if (!selectedId) return;
    const timer = setInterval(() => {
      void loadStats(selectedId);
      void loadList().catch(() => {});
    }, 20000);
    return () => clearInterval(timer);
  }, [selectedId, loadStats, loadList]);

  function parseVariants(text: string): ExperimentVariant[] {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, weightRaw] = line.split(":");
        return {
          key: (key || "").trim(),
          weight: Number((weightRaw || "0").trim()) || 0,
        };
      });
  }

  function parseMetrics(text: string): string[] {
    return text
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }

  async function createExperiment() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: createForm.key.trim(),
          name: createForm.name.trim(),
          description: createForm.description.trim(),
          variants: parseVariants(createForm.variantsText),
          metrics: parseMetrics(createForm.metricsText),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setShowCreate(false);
      const list = await loadList();
      setSelectedId(data.experiment?.id || list[0]?.id || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!selected || selected.status !== "draft") return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/experiments/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          variants: parseVariants(editVariantsText),
          metrics: parseMetrics(editMetricsText),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: Experiment["status"]) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/experiments/${selected.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed");
      await loadList();
      await loadStats(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function resetAssignments() {
    if (!selected) return;
    if (
      !confirm(
        "Reset assignments? All users will be re-bucketed on next visit (sticky tags cleared).",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/experiments/${selected.id}/reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      await loadList();
      await loadStats(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== "admin" || loading) {
    return (
      <div className="p-6 text-sm text-gray-500 dark:text-slate-400">Loading…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Experiments
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            First-party A/B/C tests with sticky variant assignment and live metrics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/experiments/metrics" className="btn-secondary text-sm">
            Metrics catalog
          </Link>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => setShowMetricsCatalog((v) => !v)}
          >
            {showMetricsCatalog ? "Hide catalog" : "Browse metrics"}
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? "Cancel" : "New draft"}
          </button>
        </div>
      </div>

      {showMetricsCatalog && (
        <div className="card p-4 space-y-3">
          <ExperimentMetricsCatalogPanel
            compact
            selectedKeys={
              selected?.status === "draft"
                ? parseMetricKeys(editMetricsText)
                : showCreate
                  ? parseMetricKeys(createForm.metricsText)
                  : selected?.metrics || []
            }
            onAddMetric={
              selected?.status === "draft"
                ? (key) => setEditMetricsText((prev) => appendMetricKey(prev, key))
                : showCreate
                  ? (key) =>
                      setCreateForm((f) => ({
                        ...f,
                        metricsText: appendMetricKey(f.metricsText, key),
                      }))
                  : undefined
            }
          />
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Full page:{" "}
            <Link
              href="/admin/experiments/metrics"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              /admin/experiments/metrics
            </Link>
            {selected?.status === "draft" || showCreate
              ? " — click Add to append to the draft metrics field."
              : " — open a draft (or New draft) to add metrics from here."}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Create draft experiment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs space-y-1">
              <span className="text-gray-500 dark:text-slate-400">Key</span>
              <input
                value={createForm.key}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, key: e.target.value }))
                }
                placeholder="my_feature_test"
                className="w-full"
              />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-gray-500 dark:text-slate-400">Name</span>
              <input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="My feature test"
                className="w-full"
              />
            </label>
          </div>
          <label className="text-xs space-y-1 block">
            <span className="text-gray-500 dark:text-slate-400">Description</span>
            <textarea
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className="w-full"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs space-y-1">
              <span className="text-gray-500 dark:text-slate-400">
                Variants (key:weight per line, sum 100, include control)
              </span>
              <textarea
                value={createForm.variantsText}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, variantsText: e.target.value }))
                }
                rows={4}
                className="w-full font-mono text-xs"
              />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-gray-500 dark:text-slate-400">
                Metrics (comma-separated event names)
              </span>
              <textarea
                value={createForm.metricsText}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, metricsText: e.target.value }))
                }
                rows={4}
                className="w-full font-mono text-xs"
              />
              <span className="block text-[11px] text-gray-400 dark:text-slate-500">
                Must match{" "}
                <code className="font-mono">analytics_events.event</code>. See{" "}
                <button
                  type="button"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  onClick={() => setShowMetricsCatalog(true)}
                >
                  metrics catalog
                </button>
                .
              </span>
              <ul className="mt-1 space-y-0.5 text-[11px] text-gray-500 dark:text-slate-400">
                {parseMetricKeys(createForm.metricsText).map((key) => {
                  const def = getExperimentMetric(key);
                  return (
                    <li key={key}>
                      <span className="font-mono text-gray-700 dark:text-slate-200">{key}</span>
                      {def ? ` — ${def.title}` : " — not in catalog (still valid if event exists)"}
                    </li>
                  );
                })}
              </ul>
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            className="btn-primary text-sm"
            onClick={() => void createExperiment()}
          >
            Create draft
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="card p-2 space-y-1 max-h-[70vh] overflow-y-auto">
          {experiments.length === 0 && (
            <p className="p-3 text-sm text-gray-500 dark:text-slate-400">
              No experiments yet.
            </p>
          )}
          {experiments.map((exp) => (
            <button
              key={exp.id}
              type="button"
              onClick={() => setSelectedId(exp.id)}
              className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                selectedId === exp.id
                  ? "bg-indigo-50 dark:bg-indigo-500/15"
                  : "hover:bg-gray-50 dark:hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {exp.name}
                </span>
                <span
                  className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${STATUS_STYLES[exp.status]}`}
                >
                  {exp.status}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-0.5">
                {exp.key} · {exp.assignedCount ?? 0} assigned
              </p>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selected.name}
                  </h2>
                  <p className="text-xs font-mono text-gray-500 dark:text-slate-400 mt-0.5">
                    {selected.key}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.status === "draft" && (
                    <button
                      type="button"
                      disabled={busy}
                      className="btn-primary text-xs"
                      onClick={() => void setStatus("running")}
                    >
                      Launch
                    </button>
                  )}
                  {selected.status === "running" && (
                    <button
                      type="button"
                      disabled={busy}
                      className="btn-secondary text-xs"
                      onClick={() => void setStatus("paused")}
                    >
                      Pause
                    </button>
                  )}
                  {selected.status === "paused" && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        className="btn-primary text-xs"
                        onClick={() => void setStatus("running")}
                      >
                        Resume
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="btn-secondary text-xs"
                        onClick={() => void setStatus("archived")}
                      >
                        Archive
                      </button>
                    </>
                  )}
                  {selected.status !== "archived" && (
                    <button
                      type="button"
                      disabled={busy}
                      className="btn-danger text-xs"
                      onClick={() => void resetAssignments()}
                    >
                      Reset assignments
                    </button>
                  )}
                </div>
              </div>

              {selected.status === "draft" ? (
                <div className="space-y-3">
                  <label className="text-xs space-y-1 block">
                    <span className="text-gray-500 dark:text-slate-400">Name</span>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full"
                    />
                  </label>
                  <label className="text-xs space-y-1 block">
                    <span className="text-gray-500 dark:text-slate-400">
                      Description
                    </span>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full"
                    />
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs space-y-1">
                      <span className="text-gray-500 dark:text-slate-400">
                        Variants
                      </span>
                      <textarea
                        value={editVariantsText}
                        onChange={(e) => setEditVariantsText(e.target.value)}
                        rows={4}
                        className="w-full font-mono text-xs"
                      />
                    </label>
                    <label className="text-xs space-y-1">
                      <span className="text-gray-500 dark:text-slate-400">
                        Metrics
                      </span>
                      <textarea
                        value={editMetricsText}
                        onChange={(e) => setEditMetricsText(e.target.value)}
                        rows={4}
                        className="w-full font-mono text-xs"
                      />
                      <ul className="mt-1 space-y-0.5 text-[11px] text-gray-500 dark:text-slate-400">
                        {parseMetricKeys(editMetricsText).map((key) => {
                          const def = getExperimentMetric(key);
                          return (
                            <li key={key}>
                              <span className="font-mono text-gray-700 dark:text-slate-200">
                                {key}
                              </span>
                              {def
                                ? ` — ${def.title}`
                                : " — not in catalog (still valid if event exists)"}
                            </li>
                          );
                        })}
                      </ul>
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    className="btn-secondary text-sm"
                    onClick={() => void saveDraft()}
                  >
                    Save draft
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-slate-300 space-y-1">
                  <p>{selected.description || "No description"}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Variants:{" "}
                    {selected.variants
                      .map((v) => `${v.key} (${v.weight}%)`)
                      .join(" · ")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Metrics:{" "}
                    {selected.metrics.length === 0
                      ? "none"
                      : selected.metrics
                          .map((m) => {
                            const def = getExperimentMetric(m);
                            return def ? `${m} (${def.title})` : m;
                          })
                          .join(" · ")}{" "}
                    · reset gen {selected.resetGeneration}
                    {selected.launchedAt ? ` · launched ${selected.launchedAt}` : ""}
                    {selected.resetAt ? ` · last reset ${selected.resetAt}` : ""}
                  </p>
                </div>
              )}

              <div className="border-t border-[color:var(--border)] pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Preview treatments
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.variants.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() =>
                        router.push(
                          `/admin/experiments/preview?key=${encodeURIComponent(selected.key)}&variant=${encodeURIComponent(v.key)}`,
                        )
                      }
                    >
                      Preview {v.key}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-gray-500 dark:text-slate-400">
                  Opens the treatment UI with a client-only override (no assignment / metrics).
                </p>
              </div>
            </div>

            <div className="card p-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Live stats
                </h3>
                <button
                  type="button"
                  className="text-xs text-indigo-600 dark:text-indigo-400"
                  onClick={() => selected && void loadStats(selected.id)}
                >
                  Refresh
                </button>
              </div>
              {!stats ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  No stats yet.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400 border-b border-[color:var(--border)]">
                      <th className="py-2 pr-3">Variant</th>
                      <th className="py-2 pr-3">Assigned</th>
                      <th className="py-2 pr-3">Exposed</th>
                      {stats.metrics.map((m) => (
                        <th key={m} className="py-2 pr-3 font-mono normal-case">
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.variants.map((row) => (
                      <tr
                        key={row.variant}
                        className="border-b border-[color:var(--border)]/60"
                      >
                        <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{row.variant}</span>
                            <button
                              type="button"
                              className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                              onClick={() =>
                                router.push(
                                  `/admin/experiments/preview?key=${encodeURIComponent(selected.key)}&variant=${encodeURIComponent(row.variant)}`,
                                )
                              }
                            >
                              Preview
                            </button>
                          </div>
                        </td>
                        <td className="py-2 pr-3">{row.assigned}</td>
                        <td className="py-2 pr-3">{row.exposed}</td>
                        {stats.metrics.map((m) => {
                          const cell = row.metrics[m] || {
                            users: 0,
                            rate: 0,
                            last24h: 0,
                          };
                          return (
                            <td key={m} className="py-2 pr-3">
                              <div>
                                {cell.users}{" "}
                                <span className="text-gray-500 dark:text-slate-400">
                                  ({pct(cell.rate)})
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-400 dark:text-slate-500">
                                24h: {cell.last24h}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-6 text-sm text-gray-500 dark:text-slate-400">
            Select an experiment to view details and live metrics.
          </div>
        )}
      </div>
    </div>
  );
}
