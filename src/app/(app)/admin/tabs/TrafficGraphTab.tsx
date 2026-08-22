"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  formatTrafficNodeLabel,
  trafficNodeKind,
} from "@/lib/traffic/normalize";
import type { TrafficGraphData } from "@/lib/traffic/track";

import { StatCard } from "../shared";

const PERIODS = [
  { hours: 1, label: "1h" },
  { hours: 24, label: "24h" },
  { hours: 168, label: "7d" },
] as const;

const NODE_COLORS: Record<string, string> = {
  screen: "#6366f1",
  system: "#f59e0b",
  api: "#64748b",
  unknown: "#94a3b8",
};

function nodeColor(id: string): string {
  return NODE_COLORS[trafficNodeKind(id)] ?? NODE_COLORS.unknown;
}

function buildFlowGraph(data: TrafficGraphData): { nodes: Node[]; edges: Edge[] } {
  const sourceTotals = new Map<string, number>();
  const targetTotals = new Map<string, number>();

  for (const edge of data.edges) {
    sourceTotals.set(edge.source, (sourceTotals.get(edge.source) ?? 0) + edge.count);
    targetTotals.set(edge.target, (targetTotals.get(edge.target) ?? 0) + edge.count);
  }

  const sources = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1]);
  const targets = [...targetTotals.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = data.edges[0]?.count ?? 1;

  const nodes: Node[] = [
    ...sources.map(([id, total], index) => ({
      id,
      type: "default" as const,
      position: { x: 0, y: index * 72 },
      data: {
        label: (
          <div className="text-left">
            <div className="text-[11px] font-semibold leading-tight">
              {formatTrafficNodeLabel(id)}
            </div>
            <div className="text-[10px] text-[color:var(--muted)] tabular-nums">
              {total.toLocaleString()} req
            </div>
          </div>
        ),
      },
      sourcePosition: Position.Right,
      style: {
        borderColor: nodeColor(id),
        borderWidth: 2,
        borderRadius: 10,
        padding: "6px 10px",
        fontSize: 11,
        width: 180,
        background: "var(--card, #fff)",
      },
    })),
    ...targets.map(([id, total], index) => ({
      id,
      type: "default" as const,
      position: { x: 420, y: index * 72 },
      data: {
        label: (
          <div className="text-left">
            <div className="text-[11px] font-semibold leading-tight break-all">
              {formatTrafficNodeLabel(id)}
            </div>
            <div className="text-[10px] text-[color:var(--muted)] tabular-nums">
              {total.toLocaleString()} req
            </div>
          </div>
        ),
      },
      targetPosition: Position.Left,
      style: {
        borderColor: nodeColor(id),
        borderWidth: 2,
        borderRadius: 10,
        padding: "6px 10px",
        fontSize: 11,
        width: 220,
        background: "var(--card, #fff)",
      },
    })),
  ];

  const edges: Edge[] = data.edges.map((edge, index) => {
    const width = Math.max(1, Math.round((edge.count / maxCount) * 12));
    return {
      id: `e-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.count.toLocaleString(),
      labelStyle: { fontSize: 10, fill: "var(--muted, #64748b)" },
      style: {
        stroke: "#6366f1",
        strokeWidth: width,
        opacity: 0.85,
      },
      animated: edge.count >= maxCount * 0.5,
    };
  });

  return { nodes, edges };
}

export default function TrafficGraphTab() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<TrafficGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    void fetch(`/api/admin/traffic-graph?hours=${hours}&limit=50`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json() as Promise<TrafficGraphData>;
      })
      .then(setData)
      .catch(() => setError("Could not load traffic graph."))
      .finally(() => setLoading(false));
  }, [hours]);

  useEffect(() => {
    load();
  }, [load]);

  const { nodes, edges } = useMemo(
    () => (data ? buildFlowGraph(data) : { nodes: [], edges: [] }),
    [data],
  );

  const uniqueSources = useMemo(
    () => new Set(data?.edges.map((e) => e.source) ?? []).size,
    [data],
  );
  const uniqueApis = useMemo(
    () => new Set(data?.edges.map((e) => e.target) ?? []).size,
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Traffic graph</h2>
          <p className="text-sm text-[color:var(--muted)]">
            Origins (screens, crons, webhooks) → internal APIs. Line thickness = request volume.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map(({ hours: h, label }) => (
            <button
              key={h}
              type="button"
              onClick={() => setHours(h)}
              className={`px-3 py-1 text-[13px] font-medium rounded-md transition-colors ${
                hours === h
                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                  : "text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={load}
            className="px-3 py-1 text-[13px] font-medium rounded-md bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="card p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}

      {!loading && data && !data.redisAvailable ? (
        <div className="card p-4 text-sm text-amber-700 dark:text-amber-300">
          Upstash Redis is not configured. Traffic counters are disabled in this environment.
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total requests (top edges)" value={loading ? "—" : (data?.totalRequests ?? 0)} />
        <StatCard label="Unique origins" value={loading ? "—" : uniqueSources} />
        <StatCard label="Unique API groups" value={loading ? "—" : uniqueApis} />
        <StatCard label="Edges shown" value={loading ? "—" : (data?.edges.length ?? 0)} />
      </div>

      <div className="card p-2" style={{ height: 520 }}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-[color:var(--muted)]">
            Loading traffic graph…
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[color:var(--muted)]">
            No traffic recorded yet for this period. Browse the app or wait for API calls to accumulate.
          </div>
        ) : (
          <div aria-hidden className="h-full w-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              minZoom={0.3}
              maxZoom={1.5}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={16} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={(node) => nodeColor(String(node.id))}
                maskColor="rgba(0,0,0,0.08)"
              />
            </ReactFlow>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-[color:var(--muted)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-indigo-500" /> Screen
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500" /> Cron / webhook / admin
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-slate-500" /> API group
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[color:var(--border)]">
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Top traffic edges</h3>
          <p className="text-xs text-[color:var(--muted)]">Accessible table view of the graph data.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[color:var(--muted)] border-b border-[color:var(--border)]">
                <th className="px-4 py-2 font-medium">Origin</th>
                <th className="px-4 py-2 font-medium">API</th>
                <th className="px-4 py-2 font-medium text-right">Requests</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[color:var(--muted)]">
                    Loading…
                  </td>
                </tr>
              ) : data?.edges.length ? (
                data.edges.map((edge) => (
                  <tr
                    key={`${edge.source}-${edge.target}`}
                    className="border-b border-[color:var(--border)]/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2 font-mono text-xs">{edge.source}</td>
                    <td className="px-4 py-2 font-mono text-xs">{edge.target}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {edge.count.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[color:var(--muted)]">
                    No data for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
