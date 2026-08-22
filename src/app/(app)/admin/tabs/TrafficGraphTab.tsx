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
import type { FullTrafficGraphData, TrafficEdge } from "@/lib/traffic/track";

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
  provider: "#10b981",
  unknown: "#94a3b8",
};

const COL_ORIGIN = 0;
const COL_API = 380;
const COL_PROVIDER = 820;

function nodeColor(id: string): string {
  return NODE_COLORS[trafficNodeKind(id)] ?? NODE_COLORS.unknown;
}

function makeNode(
  id: string,
  total: number,
  x: number,
  y: number,
  column: "origin" | "api" | "provider",
  width: number,
): Node {
  return {
    id,
    type: "default",
    position: { x, y },
    data: {
      label: (
        <div className="text-left">
          <div className="text-[11px] font-semibold leading-tight break-all">
            {formatTrafficNodeLabel(id)}
          </div>
          <div className="text-[10px] text-[color:var(--muted)] tabular-nums">
            {total.toLocaleString()} calls
          </div>
        </div>
      ),
    },
    ...(column === "origin" || column === "api" ? { sourcePosition: Position.Right } : {}),
    ...(column === "api" || column === "provider" ? { targetPosition: Position.Left } : {}),
    style: {
      borderColor: nodeColor(id),
      borderWidth: 2,
      borderRadius: 10,
      padding: "6px 10px",
      fontSize: 11,
      width,
      background: "var(--card, #fff)",
    },
  };
}

function buildFlowGraph(data: FullTrafficGraphData): { nodes: Node[]; edges: Edge[] } {
  const originTotals = new Map<string, number>();
  const apiTotals = new Map<string, number>();
  const providerTotals = new Map<string, number>();

  for (const edge of data.sourceApi.edges) {
    originTotals.set(edge.source, (originTotals.get(edge.source) ?? 0) + edge.count);
    apiTotals.set(edge.target, (apiTotals.get(edge.target) ?? 0) + edge.count);
  }
  for (const edge of data.apiProvider.edges) {
    apiTotals.set(edge.source, (apiTotals.get(edge.source) ?? 0) + edge.count);
    providerTotals.set(edge.target, (providerTotals.get(edge.target) ?? 0) + edge.count);
  }

  const origins = [...originTotals.entries()].sort((a, b) => b[1] - a[1]);
  const apis = [...apiTotals.entries()].sort((a, b) => b[1] - a[1]);
  const providers = [...providerTotals.entries()].sort((a, b) => b[1] - a[1]);

  const allEdges: TrafficEdge[] = [
    ...data.sourceApi.edges,
    ...data.apiProvider.edges,
  ];
  const maxCount = allEdges.reduce((max, e) => Math.max(max, e.count), 1);

  const nodes: Node[] = [
    ...origins.map(([id, total], index) =>
      makeNode(id, total, COL_ORIGIN, index * 72, "origin", 180),
    ),
    ...apis.map(([id, total], index) =>
      makeNode(id, total, COL_API, index * 72, "api", 220),
    ),
    ...providers.map(([id, total], index) =>
      makeNode(id, total, COL_PROVIDER, index * 72, "provider", 180),
    ),
  ];

  const flowEdges: Edge[] = [
    ...data.sourceApi.edges.map((edge, index) => ({
      id: `sa-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.count.toLocaleString(),
      labelStyle: { fontSize: 10, fill: "var(--muted, #64748b)" },
      style: {
        stroke: "#6366f1",
        strokeWidth: Math.max(1, Math.round((edge.count / maxCount) * 12)),
        opacity: 0.85,
      },
      animated: edge.count >= maxCount * 0.5,
    })),
    ...data.apiProvider.edges.map((edge, index) => ({
      id: `ap-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.count.toLocaleString(),
      labelStyle: { fontSize: 10, fill: "var(--muted, #64748b)" },
      style: {
        stroke: "#10b981",
        strokeWidth: Math.max(1, Math.round((edge.count / maxCount) * 12)),
        opacity: 0.85,
      },
      animated: edge.count >= maxCount * 0.5,
    })),
  ];

  return { nodes, edges: flowEdges };
}

export default function TrafficGraphTab() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<FullTrafficGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    void fetch(`/api/admin/traffic-graph?hours=${hours}&limit=50`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json() as Promise<FullTrafficGraphData>;
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
    () => new Set(data?.sourceApi.edges.map((e) => e.source) ?? []).size,
    [data],
  );
  const uniqueApis = useMemo(() => {
    const apis = new Set<string>();
    data?.sourceApi.edges.forEach((e) => apis.add(e.target));
    data?.apiProvider.edges.forEach((e) => apis.add(e.source));
    return apis.size;
  }, [data]);
  const uniqueProviders = useMemo(
    () => new Set(data?.apiProvider.edges.map((e) => e.target) ?? []).size,
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Traffic graph</h2>
          <p className="text-sm text-[color:var(--muted)]">
            Origins → internal APIs → external services. Line thickness = call volume.
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="HTTP requests (top edges)" value={loading ? "—" : (data?.totalRequests ?? 0)} />
        <StatCard label="Provider calls (top edges)" value={loading ? "—" : (data?.totalProviderCalls ?? 0)} />
        <StatCard label="Unique origins" value={loading ? "—" : uniqueSources} />
        <StatCard label="Unique API groups" value={loading ? "—" : uniqueApis} />
        <StatCard label="External services" value={loading ? "—" : uniqueProviders} />
      </div>

      <div className="card p-2" style={{ height: 560 }}>
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
              minZoom={0.25}
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
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> External provider
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[color:var(--border)]">
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Origin → API</h3>
        </div>
        <EdgeTable loading={loading} edges={data?.sourceApi.edges ?? []} col1="Origin" col2="API" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[color:var(--border)]">
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">API → External service</h3>
        </div>
        <EdgeTable loading={loading} edges={data?.apiProvider.edges ?? []} col1="API" col2="Provider" />
      </div>
    </div>
  );
}

function EdgeTable({
  loading,
  edges,
  col1,
  col2,
}: {
  loading: boolean;
  edges: TrafficEdge[];
  col1: string;
  col2: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-[color:var(--muted)] border-b border-[color:var(--border)]">
            <th className="px-4 py-2 font-medium">{col1}</th>
            <th className="px-4 py-2 font-medium">{col2}</th>
            <th className="px-4 py-2 font-medium text-right">Calls</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-[color:var(--muted)]">
                Loading…
              </td>
            </tr>
          ) : edges.length ? (
            edges.map((edge) => (
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
  );
}
