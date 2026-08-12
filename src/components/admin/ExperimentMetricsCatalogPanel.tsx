"use client";

import { useMemo, useState } from "react";
import {
  EXPERIMENT_METRICS_CATALOG,
  listExperimentMetricsByCategory,
  type ExperimentMetricDefinition,
  type ExperimentMetricSource,
} from "@/lib/experiment-metrics-catalog";

const SOURCE_LABEL: Record<ExperimentMetricSource, string> = {
  server: "Server trackEvent",
  client_allowlist: "Client allow-list",
  both: "Server + client",
};

function MetricRow({
  metric,
  selected,
  onAdd,
}: {
  metric: ExperimentMetricDefinition;
  selected?: boolean;
  onAdd?: (key: string) => void;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-soft)]/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-900 dark:bg-white/10 dark:text-white">
              {metric.key}
            </code>
            <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
              {SOURCE_LABEL[metric.source]}
            </span>
            {selected && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                In use
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{metric.title}</p>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-300">{metric.description}</p>
          <p className="mt-1 font-mono text-[11px] text-gray-400 dark:text-slate-500">{metric.where}</p>
          {metric.metadataKeys && metric.metadataKeys.length > 0 && (
            <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
              Metadata: {metric.metadataKeys.join(", ")}
            </p>
          )}
          {metric.recommendedFor && metric.recommendedFor.length > 0 && (
            <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400">
              Suggested for: {metric.recommendedFor.join(", ")}
            </p>
          )}
        </div>
        {onAdd && (
          <button
            type="button"
            className="btn-secondary shrink-0 text-xs"
            disabled={selected}
            onClick={() => onAdd(metric.key)}
          >
            {selected ? "Added" : "Add"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ExperimentMetricsCatalogPanel({
  selectedKeys = [],
  onAddMetric,
  compact = false,
}: {
  selectedKeys?: string[];
  onAddMetric?: (key: string) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = listExperimentMetricsByCategory();
    if (!q) return all;
    return all
      .map((g) => ({
        ...g,
        metrics: g.metrics.filter(
          (m) =>
            m.key.toLowerCase().includes(q) ||
            m.title.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            m.where.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.metrics.length > 0);
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {!compact && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Experiment metrics catalog
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">
                Events that land in <code className="font-mono text-xs">analytics_events</code> and
                can be listed on an experiment&apos;s metrics. Client{" "}
                <code className="font-mono text-xs">useTrack</code> / GA-only events are not
                included — they never reach Turso.
              </p>
            </>
          )}
          {compact && (
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {EXPERIMENT_METRICS_CATALOG.length} metrics available for experiments
            </p>
          )}
        </div>
        <label className="block min-w-[200px] flex-1 text-xs sm:max-w-xs">
          <span className="sr-only">Search metrics</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search key, title, path…"
            className="w-full"
          />
        </label>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">No metrics match.</p>
      ) : (
        groups.map((g) => (
          <section key={g.category} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              {g.label}
            </h3>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {g.metrics.map((m) => (
                <MetricRow
                  key={m.key}
                  metric={m}
                  selected={selected.has(m.key)}
                  onAdd={onAddMetric}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export function parseMetricKeys(text: string): string[] {
  return text
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

export function appendMetricKey(text: string, key: string): string {
  const keys = parseMetricKeys(text);
  if (keys.includes(key)) return text;
  return keys.length === 0 ? key : `${keys.join(",")},${key}`;
}
