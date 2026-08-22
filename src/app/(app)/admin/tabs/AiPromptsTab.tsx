"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

interface PromptGroup {
  id: string;
  label: string;
}

interface PromptListItem {
  id: string;
  group: string;
  agent?: "warren" | "clara" | "will";
  label: string;
  description: string;
  sourceFile: string;
  flowKey?: string;
  systemChars: number;
  userChars: number;
  notes?: string;
  isSample?: boolean;
}

interface PromptDetail extends Omit<PromptListItem, "systemChars" | "userChars"> {
  systemPrompt: string;
  userPrompt?: string;
}

const AGENT_BADGES: Record<string, string> = {
  warren: "Warren",
  clara: "Clara",
  will: "Will",
};

function formatChars(n: number): string {
  if (n < 1000) return `${n} chars`;
  return `${(n / 1000).toFixed(1)}k chars`;
}

function AiPromptsTab() {
  const [groups, setGroups] = useState<PromptGroup[]>([]);
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PromptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-prompts", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setPrompts(data.prompts || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prompts.filter((p) => {
      if (groupFilter && p.group !== groupFilter) return false;
      if (!q) return true;
      return (
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.sourceFile.toLowerCase().includes(q) ||
        (p.flowKey?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [prompts, groupFilter, search]);

  async function openPrompt(id: string) {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch("/api/admin/ai-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetail(data.entry);
      }
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false);
    }
  }

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return <p className="text-[color:var(--muted)]">Loading prompts...</p>;
  }

  if (selectedId) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setDetail(null);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to catalog
          </button>
          {detail && (
            <span className="text-xs font-mono text-[color:var(--muted)]">{detail.sourceFile}</span>
          )}
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" role="status" aria-label="Loading prompt" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="card p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{detail.label}</h2>
                {detail.agent && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {AGENT_BADGES[detail.agent]}
                  </span>
                )}
                {detail.isSample && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Sample context
                  </span>
                )}
                {detail.flowKey && (
                  <span className="text-[11px] font-mono text-[color:var(--muted)]">{detail.flowKey}</span>
                )}
              </div>
              <p className="text-sm text-[color:var(--muted)]">{detail.description}</p>
              {detail.notes && (
                <p className="text-xs text-amber-600 dark:text-amber-400">{detail.notes}</p>
              )}
            </div>

            <PromptBlock
              title="System prompt"
              text={detail.systemPrompt}
              copyKey="system"
              copied={copied}
              onCopy={copyText}
            />
            {detail.userPrompt && (
              <PromptBlock
                title="User prompt template"
                text={detail.userPrompt}
                copyKey="user"
                copied={copied}
                onCopy={copyText}
              />
            )}
          </div>
        ) : (
          <p className="text-[color:var(--muted)]">Prompt not found.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--muted)]">
        Canonical system prompts for every AI agent and flow on the platform.
        Runtime prompts in AI Logs may include user-specific context on top of these templates.
      </p>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label htmlFor="prompt-search" className="block text-xs font-medium text-[color:var(--muted)] mb-1">
            Search
          </label>
          <input
            id="prompt-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Label, file, flow key..."
            className="px-3 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm text-[color:var(--foreground)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
          />
        </div>
        <div>
          <label htmlFor="prompt-group" className="block text-xs font-medium text-[color:var(--muted)] mb-1">
            Group
          </label>
          <select
            id="prompt-group"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm text-[color:var(--foreground)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => fetchCatalog()}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Refresh
        </button>
        <span className="text-xs text-[color:var(--muted)] ml-auto self-center">
          {filtered.length} prompt{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {filtered.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => openPrompt(prompt.id)}
            className="card w-full text-left p-4 hover:border-indigo-500/40 transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[color:var(--foreground)]">{prompt.label}</span>
                  {prompt.agent && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                      {AGENT_BADGES[prompt.agent]}
                    </span>
                  )}
                  {prompt.isSample && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                      sample
                    </span>
                  )}
                </div>
                <p className="text-xs text-[color:var(--muted)] line-clamp-2">{prompt.description}</p>
                <p className="text-[11px] font-mono text-[color:var(--muted)] truncate">{prompt.sourceFile}</p>
              </div>
              <div className="text-right text-[11px] text-[color:var(--muted)] shrink-0">
                <div>{formatChars(prompt.systemChars)}</div>
                {prompt.userChars > 0 && <div>+ {formatChars(prompt.userChars)} user</div>}
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[color:var(--muted)] py-8 text-center">No prompts match your filters.</p>
        )}
      </div>
    </div>
  );
}

function PromptBlock({
  title,
  text,
  copyKey,
  copied,
  onCopy,
}: {
  title: string;
  text: string;
  copyKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[color:var(--border)] bg-black/5 dark:bg-white/5">
        <h3 className="text-sm font-medium text-[color:var(--foreground)]">{title}</h3>
        <button
          type="button"
          onClick={() => onCopy(text, copyKey)}
          className="text-xs px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          {copied === copyKey ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono text-[color:var(--foreground)] max-h-[60vh] overflow-y-auto">
        {text}
      </pre>
    </div>
  );
}

export default AiPromptsTab;
