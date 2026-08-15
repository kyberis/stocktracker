"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { TabSkeleton } from "../shared";
import type {
  EmailFlow,
  EnrichedCronMeta,
  EnrichedEmailFlowsResponse,
  EnrichedTemplatePreview,
  FlowNode,
  FlowNodeKind,
  FlowStatus,
} from "@/lib/email-flows/registry";

const STATUS_LABEL: Record<FlowStatus, string> = {
  enabled: "Enabled",
  flag_off: "Flag off",
  paused: "Paused",
  always_on: "Always on",
};

const STATUS_CLASS: Record<FlowStatus, string> = {
  enabled: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  flag_off: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  paused: "bg-red-500/10 text-red-600 dark:text-red-400",
  always_on: "bg-[color:var(--accent)]/10 text-[color:var(--accent)]",
};

const KIND_LABEL: Record<FlowNodeKind, string> = {
  trigger: "Trigger",
  wait: "Wait",
  condition: "Condition",
  email: "Email",
  parallel: "Parallel",
  note: "Note",
};

function nodeKindClass(kind: FlowNodeKind): string {
  switch (kind) {
    case "trigger":
      return "border-[color:var(--accent)] bg-[color:var(--accent)]/5";
    case "wait":
      return "border-dashed border-amber-400/60 bg-amber-50 dark:bg-amber-500/10";
    case "condition":
      return "border-violet-400/50 bg-violet-50 dark:bg-violet-500/10";
    case "email":
      return "border-emerald-400/50 bg-emerald-50 dark:bg-emerald-500/10";
    default:
      return "border-[color:var(--border)] bg-[color:var(--page-background)]";
  }
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1" aria-hidden={label ? undefined : true}>
      <div className="w-px h-4 bg-[color:var(--border)]" />
      {label ? (
        <span className="max-w-[140px] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--muted)] text-center">
          {label}
        </span>
      ) : null}
      <div className="w-px h-4 bg-[color:var(--border)]" />
    </div>
  );
}

function NodeCard({
  node,
  selected,
  onSelect,
  flagOff,
}: {
  node: FlowNode;
  selected: boolean;
  onSelect: (id: string) => void;
  flagOff?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      aria-pressed={selected}
      className={`w-[220px] min-h-11 text-left rounded-xl border px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${nodeKindClass(node.kind)} ${
        selected ? "ring-2 ring-emerald-500" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          {KIND_LABEL[node.kind]}
        </span>
        {flagOff ? (
          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">Flag off</span>
        ) : null}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-[color:var(--foreground)]">{node.label}</div>
      {node.templateSlug || node.hardcodedSender ? (
        <div className="mt-1 font-mono text-[10px] text-[color:var(--muted)] truncate">
          {node.templateSlug || node.hardcodedSender}
        </div>
      ) : null}
    </button>
  );
}

function FlowGraph({
  flow,
  selectedId,
  onSelect,
  flags,
}: {
  flow: EmailFlow;
  selectedId: string | null;
  onSelect: (id: string) => void;
  flags: Record<string, boolean>;
}) {
  const byId = useMemo(() => new Map(flow.nodes.map((node) => [node.id, node])), [flow.nodes]);

  const renderNode = (id: string, visited: Set<string>): ReactNode => {
    if (visited.has(id)) return null;
    visited.add(id);
    const node = byId.get(id);
    if (!node) return null;
    const children = node.children ?? [];
    const flagOff = node.featureFlag ? flags[node.featureFlag] === false : false;

    return (
      <div className="flex flex-col items-center">
        <NodeCard
          node={node}
          selected={selectedId === node.id}
          onSelect={onSelect}
          flagOff={flagOff}
        />
        {children.length === 1 ? (
          <>
            <Connector label={node.edgeLabels?.[children[0]]} />
            {renderNode(children[0], visited)}
          </>
        ) : null}
        {children.length > 1 ? (
          <div className="flex flex-wrap justify-center gap-4 mt-1">
            {children.map((childId) => (
              <div key={childId} className="flex flex-col items-center">
                <Connector label={node.edgeLabels?.[childId]} />
                {renderNode(childId, visited)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const outline: { kind: FlowNodeKind; label: string; description: string }[] = [];
  const walk = (id: string, seen: Set<string>) => {
    if (seen.has(id)) return;
    seen.add(id);
    const node = byId.get(id);
    if (!node) return;
    outline.push({ kind: node.kind, label: node.label, description: node.description });
    for (const child of node.children ?? []) walk(child, seen);
  };
  walk(flow.entryNodeId, new Set());

  return (
    <div className="overflow-x-auto pb-2">
      <ol className="sr-only">
        {outline.map((step, index) => (
          <li key={`${step.label}-${index}`}>
            {KIND_LABEL[step.kind]}: {step.label}. {step.description}
          </li>
        ))}
      </ol>
      <div className="min-w-min px-2 py-1">
        {renderNode(flow.entryNodeId, new Set())}
      </div>
    </div>
  );
}

function PreviewFrame({ html, title }: { html: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html || "<p style='font:13px sans-serif;color:#64748b;padding:16px'>No HTML body</p>");
    doc.close();
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      sandbox="allow-same-origin"
      className="w-full h-[360px] rounded-lg border border-[color:var(--border)] bg-white"
    />
  );
}

function NodeDetail({
  node,
  flags,
  crons,
  template,
}: {
  node: FlowNode;
  flags: Record<string, boolean>;
  crons: Record<string, EnrichedCronMeta>;
  template?: EnrichedTemplatePreview;
}) {
  const [lang, setLang] = useState<"en" | "es">("en");
  const cron = node.cronId ? crons[node.cronId] : undefined;
  const flagOn = node.featureFlag ? flags[node.featureFlag] : undefined;
  const subject = lang === "es" ? template?.subjectEs || template?.subject : template?.subject;
  const html = lang === "es" ? template?.bodyHtmlEs || template?.bodyHtml : template?.bodyHtml;

  return (
    <aside className="card p-4 space-y-4" aria-live="polite">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          {KIND_LABEL[node.kind]}
        </p>
        <h3 className="text-base font-semibold text-[color:var(--foreground)]">{node.label}</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{node.description}</p>
      </div>

      {node.conditionSummary ? (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)] mb-1">
            Condition
          </h4>
          <pre className="text-[11px] whitespace-pre-wrap rounded-lg border border-[color:var(--border)] bg-[color:var(--page-background)] p-2 text-[color:var(--foreground)]">
            {node.conditionSummary}
          </pre>
        </div>
      ) : null}

      {node.featureFlag ? (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)] mb-1">
            Feature flag
          </h4>
          <p className="text-sm">
            <code className="font-mono text-xs">{node.featureFlag}</code>
            <span className="ml-2 text-xs font-medium">
              {flagOn ? "On" : "Off"}
            </span>
          </p>
          <Link
            href="/admin/feature-flags"
            className="mt-1 inline-block text-xs text-[color:var(--accent)] underline underline-offset-2 min-h-11 leading-[44px] sm:min-h-0 sm:leading-normal"
          >
            Open Feature Flags
          </Link>
        </div>
      ) : null}

      {cron ? (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)] mb-1">
            Cron
          </h4>
          <p className="text-sm font-medium text-[color:var(--foreground)]">{cron.name}</p>
          <p className="font-mono text-xs text-[color:var(--muted)]">{cron.schedule}</p>
          <p className="text-xs text-[color:var(--muted)] mt-1">{cron.description}</p>
          {cron.paused ? (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">Paused in vercel.json</p>
          ) : null}
        </div>
      ) : null}

      {node.hardcodedSender ? (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)] mb-1">
            Code-owned body
          </h4>
          <p className="text-sm">
            <code className="font-mono text-xs">{node.hardcodedSender}</code>
            {node.bodySource === "code" ? (
              <span className="ml-2 text-xs text-[color:var(--muted)]">in src/lib/email.ts</span>
            ) : null}
          </p>
        </div>
      ) : null}

      {node.transactional != null ? (
        <p className="text-xs text-[color:var(--muted)]">
          {node.transactional
            ? "Transactional — sent even when marketing email is opted out."
            : "Marketing — suppressed when email_notifications_enabled is off."}
        </p>
      ) : null}

      {node.logsToEmailSends === false ? (
        <p className="text-xs text-[color:var(--muted)]">
          This send is not fully logged against email_sends / a template slug, so window stats may be empty.
        </p>
      ) : null}

      {template ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              Template preview
            </h4>
            <Link
              href="/admin/email-templates"
              className="text-xs text-[color:var(--accent)] underline underline-offset-2"
            >
              Edit templates
            </Link>
          </div>
          <p className="text-sm font-medium text-[color:var(--foreground)]">{template.name}</p>
          <p className="text-xs text-[color:var(--muted)]">
            Subject ({lang.toUpperCase()}): {subject || "—"}
          </p>
          <div className="flex rounded-lg border border-[color:var(--border)] overflow-hidden w-fit" role="group" aria-label="Preview language">
            {(["en", "es"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`min-h-11 px-3 text-xs font-medium ${
                  lang === code
                    ? "bg-[color:var(--accent)] text-white"
                    : "text-[color:var(--muted)] hover:bg-[color:var(--page-background)]"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <PreviewFrame html={html || ""} title={`${template.name} preview (${lang})`} />
          {template.stats ? (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-[color:var(--muted)]">Sent 7d / 30d</dt>
                <dd className="font-semibold">{template.stats.sent7d} / {template.stats.sent30d}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">Delivered 7d / 30d</dt>
                <dd className="font-semibold">{template.stats.delivered7d} / {template.stats.delivered30d}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">Bounced 7d / 30d</dt>
                <dd className="font-semibold">{template.stats.bounced7d} / {template.stats.bounced30d}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">Failed 7d / 30d</dt>
                <dd className="font-semibold">{template.stats.failed7d} / {template.stats.failed30d}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : node.templateSlug ? (
        <p className="text-xs text-[color:var(--muted)]">
          Template <code>{node.templateSlug}</code> is not in the database yet.
        </p>
      ) : null}
    </aside>
  );
}

export default function EmailFlowsTab() {
  const [data, setData] = useState<EnrichedEmailFlowsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-flows");
      if (!res.ok) {
        setError("Could not load email flows.");
        setLoading(false);
        return;
      }
      const payload = (await res.json()) as EnrichedEmailFlowsResponse;
      setData(payload);
      setSelectedFlowId((current) => current ?? payload.flows[0]?.id ?? null);
    } catch {
      setError("Could not load email flows.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flow = data?.flows.find((item) => item.id === selectedFlowId) ?? data?.flows[0];
  const selectedNode =
    flow?.nodes.find((node) => node.id === selectedNodeId) ?? flow?.nodes.find((node) => node.id === flow.entryNodeId);

  useEffect(() => {
    if (flow && (!selectedNodeId || !flow.nodes.some((node) => node.id === selectedNodeId))) {
      setSelectedNodeId(flow.entryNodeId);
    }
  }, [flow, selectedNodeId]);

  if (loading) return <TabSkeleton />;

  if (error || !data || !flow) {
    return (
      <div className="card p-8 text-center" role="alert">
        <p className="text-sm text-[color:var(--muted)]">{error || "No email flows registered."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Email Flows</h2>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          Read-only map of current automations. Edit templates and flags elsewhere; this page does not create flows.
        </p>
      </div>

      <div role="tablist" aria-label="Email flows" className="flex flex-wrap gap-2">
        {data.flows.map((item) => {
          const selected = item.id === flow.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setSelectedFlowId(item.id);
                setSelectedNodeId(item.entryNodeId);
              }}
              className={`min-h-11 px-3 py-1.5 rounded-lg text-left text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                selected
                  ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--foreground)]"
                  : "border-[color:var(--border)] text-[color:var(--muted)] hover:bg-[color:var(--page-background)]"
              }`}
            >
              <span className="block font-medium">{item.name}</span>
              <span className={`mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_CLASS[item.status]}`}>
                {STATUS_LABEL[item.status]}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-[color:var(--muted)]">{flow.description}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <div className="card p-4">
          <FlowGraph
            flow={flow}
            selectedId={selectedNode?.id ?? null}
            onSelect={setSelectedNodeId}
            flags={data.flags}
          />
        </div>
        {selectedNode ? (
          <NodeDetail
            node={selectedNode}
            flags={data.flags}
            crons={data.crons}
            template={selectedNode.templateSlug ? data.templates[selectedNode.templateSlug] : undefined}
          />
        ) : null}
      </div>
    </div>
  );
}
