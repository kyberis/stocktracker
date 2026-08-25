/**
 * Maps analytics_events.event names to product "tools" for engagement reports.
 */
import { EXPERIMENT_METRICS_CATALOG } from "@/lib/experiment-metrics-catalog";

export type ToolBucketId =
  | "portfolio"
  | "import"
  | "ai"
  | "alerts"
  | "social"
  | "billing"
  | "mcp"
  | "other";

export interface ToolBucketMeta {
  id: ToolBucketId;
  label: string;
}

export const TOOL_BUCKETS: ToolBucketMeta[] = [
  { id: "portfolio", label: "Portfolio" },
  { id: "import", label: "Import / Sync" },
  { id: "ai", label: "AI / Warren" },
  { id: "alerts", label: "Alerts" },
  { id: "social", label: "Social" },
  { id: "billing", label: "Billing" },
  { id: "mcp", label: "MCP" },
  { id: "other", label: "Other" },
];

const CATEGORY_TO_BUCKET: Record<string, ToolBucketId> = {
  activation: "portfolio",
  portfolio: "portfolio",
  import: "import",
  billing: "billing",
  engagement: "portfolio",
  ai: "ai",
  alerts: "alerts",
  social: "social",
  experiment: "other",
  other: "other",
};

const EXTRA_EVENT_BUCKETS: Record<string, ToolBucketId> = {
  holding_add: "portfolio",
  holding_delete: "portfolio",
  holding_edit: "portfolio",
  stock_view: "portfolio",
  portfolio_import: "import",
  snaptrade_sync: "import",
  snaptrade_connect: "import",
  csv_export: "portfolio",
  tax_report: "portfolio",
  alert_create: "alerts",
  price_alert_create: "alerts",
  portfolio_review_requested: "ai",
  portfolio_score_requested: "ai",
  warren_chat: "ai",
  ai_analysis: "ai",
  login: "other",
  signup: "other",
};

const catalogMap = new Map(
  EXPERIMENT_METRICS_CATALOG.map((m) => [m.key, CATEGORY_TO_BUCKET[m.category] ?? "other"]),
);

export function bucketForEvent(event: string): ToolBucketId {
  if (EXTRA_EVENT_BUCKETS[event]) return EXTRA_EVENT_BUCKETS[event];
  const fromCatalog = catalogMap.get(event);
  if (fromCatalog) return fromCatalog;
  if (event.startsWith("mcp_") || event.startsWith("tool_")) return "mcp";
  if (event.includes("alert")) return "alerts";
  if (event.includes("import") || event.includes("snaptrade")) return "import";
  if (event.includes("warren") || event.includes("ai_") || event.includes("chat")) return "ai";
  if (event.includes("billing") || event.includes("checkout") || event.includes("paywall")) {
    return "billing";
  }
  return "other";
}

export function aggregateToolsByBucket(
  eventsByType: { event: string; count: number }[],
): { bucket: ToolBucketId; label: string; count: number; topEvents: { event: string; count: number }[] }[] {
  const byBucket = new Map<ToolBucketId, { count: number; events: { event: string; count: number }[] }>();
  for (const row of eventsByType) {
    const bucket = bucketForEvent(row.event);
    const cur = byBucket.get(bucket) ?? { count: 0, events: [] };
    cur.count += row.count;
    cur.events.push(row);
    byBucket.set(bucket, cur);
  }
  return TOOL_BUCKETS.map((meta) => {
    const cur = byBucket.get(meta.id) ?? { count: 0, events: [] };
    const topEvents = [...cur.events].sort((a, b) => b.count - a.count).slice(0, 5);
    return { bucket: meta.id, label: meta.label, count: cur.count, topEvents };
  }).filter((b) => b.count > 0 || b.bucket === "portfolio");
}
