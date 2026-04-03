"use client";

import React, { useCallback, useEffect, useState } from "react";

interface UserOption { id: string; username: string; email: string }

interface AiLogRow {
  id: string;
  userId: string;
  username: string;
  email: string;
  source: string;
  model: string;
  promptSystem: string;
  promptUser: string;
  response: string;
  tokensUsed: number;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  durationMs: number;
  status: string;
  createdAt: string;
}

interface CompareResult {
  model: string;
  response: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  costUsd: number;
  durationMs: number;
  error?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  fundamental: "Fundamentals",
  intelligence: "Intelligence",
  economic: "Economic",
  crypto: "Crypto",
  tax_assistant: "Tax Assistant",
  rebalancing: "Rebalancing",
  suggest_targets: "Suggest Targets",
  portfolio_ai: "Portfolio Chat",
  chart_chat: "Chart Chat",
  portfolio_review: "Portfolio Review",
  portfolio_score: "Portfolio Score",
  support_chat: "Support Chat",
  import: "Import Parsing",
  device_ai_summary: "Device Summary",
  weekly_digest: "Weekly Digest",
  weekly_digest_admin: "Weekly Digest (Admin)",
  digest_email: "Market Digest Email",
  admin_compare: "Admin Compare",
};

const SOURCE_TO_FLOW: Record<string, string> = {
  fundamental: "ai_analysis",
  intelligence: "ai_analysis",
  economic: "ai_analysis",
  crypto: "ai_analysis",
  tax_assistant: "ai_analysis",
  rebalancing: "ai_analysis",
  suggest_targets: "ai_analysis",
  portfolio_ai: "portfolio_chat",
  chart_chat: "chart_chat",
  portfolio_review: "portfolio_review",
  portfolio_score: "portfolio_score",
  support_chat: "support_chat",
  import: "import_portfolio",
  device_ai_summary: "device_summary",
  weekly_digest: "weekly_digest",
  weekly_digest_admin: "weekly_digest_admin",
  digest_email: "digest_email",
};

const ALLOWED_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "o4-mini", label: "o4-mini" },
];

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function AiComparePage() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserLabel, setSelectedUserLabel] = useState("");

  const [logs, setLogs] = useState<AiLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AiLogRow | null>(null);

  const [promptSystem, setPromptSystem] = useState("");
  const [promptUser, setPromptUser] = useState("");
  const [flowKey, setFlowKey] = useState("ai_analysis");
  const [promptTab, setPromptTab] = useState<"system" | "user">("system");

  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(["gpt-4o-mini", "gpt-4o"]));
  const [comparing, setComparing] = useState(false);
  const [results, setResults] = useState<CompareResult[]>([]);

  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setUsers((data.users ?? []).map((u: { id: string; username: string; email?: string }) => ({
        id: u.id, username: u.username, email: u.email || "",
      }))))
      .catch(() => {});
  }, []);

  const loadLogs = useCallback(async (userId: string, source?: string) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ userId, limit: "30" });
      if (source) params.set("source", source);
      const res = await fetch(`/api/admin/ai-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) loadLogs(selectedUserId, sourceFilter);
  }, [selectedUserId, sourceFilter, loadLogs]);

  const handleSelectLog = (log: AiLogRow) => {
    setSelectedLog(log);
    setPromptSystem(log.promptSystem);
    setPromptUser(log.promptUser);
    setFlowKey(SOURCE_TO_FLOW[log.source] || "ai_analysis");
  };

  const toggleModel = (model: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(model)) {
        if (next.size > 1) next.delete(model);
      } else {
        if (next.size < 4) next.add(model);
      }
      return next;
    });
  };

  const handleCompare = async () => {
    if (!promptSystem && !promptUser) return;
    setComparing(true);
    setResults([]);
    try {
      const res = await fetch("/api/admin/ai-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptSystem,
          promptUser,
          flowKey,
          models: Array.from(selectedModels),
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setComparing(false);
    }
  };

  const handleSetDefault = async (model: string) => {
    setSettingDefault(model);
    try {
      const configRes = await fetch("/api/admin/ai-models");
      const configData = await configRes.json();
      const config = { ...configData.config, [flowKey]: model };
      await fetch("/api/admin/ai-models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } finally {
      setSettingDefault(null);
    }
  };

  const filteredUsers = userSearch.length >= 1
    ? users.filter((u) =>
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const distinctSources = [...new Set(logs.map((l) => l.source))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Model Comparison</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Replay logged prompts against multiple models to compare quality, speed, and cost.
        </p>
      </div>

      {/* Step 1: User selection */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">1. Select User</h3>
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by username or email..."
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              if (!e.target.value) {
                setSelectedUserId("");
                setSelectedUserLabel("");
                setLogs([]);
                setSelectedLog(null);
              }
            }}
            className="w-full text-sm px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {filteredUsers.length > 0 && !selectedUserId && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-lg max-h-48 overflow-auto">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setSelectedUserLabel(u.username);
                    setUserSearch(u.username);
                    setSelectedLog(null);
                    setResults([]);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{u.username}</span>
                  <span className="ml-2 text-gray-400 dark:text-slate-500 text-xs">{u.email}</span>
                </button>
              ))}
            </div>
          )}
          {selectedUserId && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Selected: {selectedUserLabel}
            </p>
          )}
        </div>
      </div>

      {/* Step 2: Browse logs */}
      {selectedUserId && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">2. Pick a Logged Prompt</h3>
            {distinctSources.length > 0 && (
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="text-xs rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-2 py-1"
              >
                <option value="">All flows</option>
                {distinctSources.map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s] || s}</option>
                ))}
              </select>
            )}
          </div>

          {logsLoading ? (
            <p className="text-xs text-gray-500 dark:text-slate-400">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-slate-400">No AI logs found for this user.</p>
          ) : (
            <div className="max-h-64 overflow-auto space-y-1">
              {logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => handleSelectLog(log)}
                  className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                    selectedLog?.id === log.id
                      ? "bg-indigo-50 dark:bg-indigo-950 border border-indigo-300 dark:border-indigo-700"
                      : "hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 font-medium">
                      {SOURCE_LABELS[log.source] || log.source}
                    </span>
                    <span className="text-gray-400 dark:text-slate-500">
                      {log.model}
                    </span>
                    <span className="text-gray-400 dark:text-slate-500">
                      {log.tokensUsed} tokens
                    </span>
                    <span className="text-gray-400 dark:text-slate-500 ml-auto">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 mt-1 truncate">
                    {truncate(log.promptUser, 120)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Prompt preview + model selection */}
      {(selectedLog || promptSystem || promptUser) && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">3. Review Prompt & Select Models</h3>

          {/* Prompt tabs */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setPromptTab("system")}
              className={`px-3 py-1 text-xs font-medium rounded ${
                promptTab === "system"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
              }`}
            >
              System Prompt
            </button>
            <button
              onClick={() => setPromptTab("user")}
              className={`px-3 py-1 text-xs font-medium rounded ${
                promptTab === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
              }`}
            >
              User Prompt
            </button>
          </div>

          <textarea
            value={promptTab === "system" ? promptSystem : promptUser}
            onChange={(e) => promptTab === "system" ? setPromptSystem(e.target.value) : setPromptUser(e.target.value)}
            rows={6}
            className="w-full text-xs font-mono px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
          />

          {/* Flow key selector */}
          <div className="flex items-center gap-3 mt-3">
            <label className="text-xs text-gray-500 dark:text-slate-400">Flow:</label>
            <select
              value={flowKey}
              onChange={(e) => setFlowKey(e.target.value)}
              className="text-xs rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-2 py-1"
            >
              {Object.entries(SOURCE_TO_FLOW).filter(
                (_, i, arr) => arr.findIndex(([, v]) => v === arr[i][1]) === i
              ).map(([, flow]) => (
                <option key={flow} value={flow}>{flow}</option>
              ))}
            </select>
          </div>

          {/* Model checkboxes */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">Models to compare (select 1–4):</p>
            <div className="flex flex-wrap gap-2">
              {ALLOWED_MODELS.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs cursor-pointer transition-colors ${
                    selectedModels.has(m.value)
                      ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.has(m.value)}
                    onChange={() => toggleModel(m.value)}
                    className="rounded text-indigo-600"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleCompare}
            disabled={comparing || selectedModels.size === 0 || (!promptSystem && !promptUser)}
            className="btn-primary text-sm px-6 py-2 mt-4"
          >
            {comparing ? "Comparing…" : `Compare ${selectedModels.size} model${selectedModels.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Step 4: Results */}
      {results.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">4. Results</h3>
          <div className={`grid gap-4 ${results.length === 1 ? "grid-cols-1" : results.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"}`}>
            {results.map((r) => (
              <div
                key={r.model}
                className={`rounded-lg border p-4 ${
                  r.error
                    ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    {ALLOWED_MODELS.find((m) => m.value === r.model)?.label || r.model}
                  </span>
                  <button
                    onClick={() => handleSetDefault(r.model)}
                    disabled={settingDefault === r.model}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {settingDefault === r.model ? "Setting…" : "Set as default"}
                  </button>
                </div>

                {/* Stats */}
                <div className="flex gap-3 text-xs text-gray-500 dark:text-slate-400 mb-3">
                  <span>{r.durationMs}ms</span>
                  <span>{r.tokensTotal} tokens</span>
                  <span>In: {r.tokensInput} / Out: {r.tokensOutput}</span>
                </div>

                {r.error ? (
                  <div className="text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap break-all">
                    {r.error}
                  </div>
                ) : (
                  <div className="text-xs text-gray-700 dark:text-slate-300 font-mono whitespace-pre-wrap break-words max-h-96 overflow-auto rounded bg-gray-50 dark:bg-slate-900 p-3">
                    {r.response}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
