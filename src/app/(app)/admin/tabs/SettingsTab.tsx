"use client";

import React, { createContext, FormEvent, useContext, useEffect, useRef, useState } from "react";
import XKeysCard from "./XKeysCard";
import { CRON_REGISTRY } from "@/lib/cron-registry";

/* ── Batch Settings Context ───────────────────────────────── */

interface BatchSettingsData {
  flags?: Record<string, boolean>;
  resendKey?: { hasKey: boolean; maskedKey: string };
  supportChat?: {
    enabled: boolean;
    starterDailyLimit: number;
    proDailyLimit: number;
    welcomeMessage: string;
    customInstructions: string;
    messagesThisMonth: number;
  };
  stripePrices?: Record<string, string>;
  promoBanner?: { config: { enabled: boolean; title: string; badge: string; description: string; ctaText: string; ctaLink: string } };
  gaConfig?: { gaId: string; source: "env" | "database"; googleAdsId: string; googleAdsSource: "env" | "database" };
  adConfig?: { clientId: string; globalEnabled: boolean; slots: Record<string, { enabled: boolean; slotId: string }> };
  utmTaxonomy?: { config: { sources: string[]; mediums: string[]; campaigns: string[]; notes: string } };
  cronStats?: { stats: any[]; recent: any[] };
  grafana?: { url: string; source: "cloud" | "local" | "none"; cloudConfigured: boolean };
  capacity?: { available: boolean; currentCount: number; maxCount: number; remaining: number };
  rateLimits?: { perUser: any[] };
  aiModels?: Record<string, string>;
}

const BatchSettingsContext = createContext<BatchSettingsData | null | undefined>(undefined);

/** undefined = still loading, null = batch failed, object = loaded */
function useBatchSettings(): BatchSettingsData | null | undefined {
  return useContext(BatchSettingsContext);
}

/* ── Settings Tab ─────────────────────────────────────────── */

function ApiKeyCard({
  title,
  description,
  endpoint,
  placeholder,
}: {
  title: string;
  description: string;
  endpoint: string;
  placeholder: string;
}) {
  const batch = useBatchSettings();
  const loadedRef = useRef(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (endpoint === "/api/admin/resend-key" && batch?.resendKey) {
      setHasKey(batch.resendKey.hasKey);
      setMaskedKey(batch.resendKey.maskedKey || "");
      return;
    }
    fetch(endpoint, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setHasKey(d.hasKey);
        setMaskedKey(d.maskedKey || "");
      })
      .catch(() => {});
  }, [batch, endpoint]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: newKey.trim() }),
    });
    if (res.ok) {
      setHasKey(newKey.trim().length > 0);
      setMaskedKey(newKey.trim() ? `${newKey.trim().slice(0, 4)}...${newKey.trim().slice(-4)}` : "");
      setNewKey("");
      setShowInput(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    setSaving(true);
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "" }),
    });
    if (res.ok) {
      setHasKey(false);
      setMaskedKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">{description}</p>

      {hasKey && !showInput && (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-mono">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {maskedKey}
          </span>
          <button onClick={() => setShowInput(true)} className="btn-secondary text-xs px-3 py-1.5">
            Change
          </button>
          <button onClick={handleRemove} disabled={saving} className="btn-danger text-xs px-3 py-1.5">
            Remove
          </button>
        </div>
      )}

      {(!hasKey || showInput) && (
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={placeholder}
            className="text-sm flex-1"
          />
          <button
            onClick={handleSave}
            disabled={saving || !newKey.trim()}
            className="btn-primary text-xs px-4 py-2 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {showInput && (
            <button onClick={() => { setShowInput(false); setNewKey(""); }} className="btn-secondary text-xs px-3 py-2">
              Cancel
            </button>
          )}
        </div>
      )}

      {saved && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">API key updated successfully.</p>
      )}
    </div>
  );
}

function MetricsCard() {
  const batch = useBatchSettings();
  const loadedRef = useRef(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [grafanaUrl, setGrafanaUrl] = useState<string | null>(null);
  const [grafanaSource, setGrafanaSource] = useState<"cloud" | "local" | "none">("none");
  const [cloudConfigured, setCloudConfigured] = useState(false);

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (batch?.grafana) {
      setGrafanaUrl(batch.grafana.url || null);
      setGrafanaSource(batch.grafana.source || "none");
      setCloudConfigured(batch.grafana.cloudConfigured || false);
      return;
    }
    fetch("/api/admin/grafana-url", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setGrafanaUrl(d.url || null);
        setGrafanaSource(d.source || "none");
        setCloudConfigured(d.cloudConfigured || false);
      })
      .catch(() => {});
  }, [batch]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/metrics", { cache: "no-store" });
      const text = await res.text();
      const lines = text.split("\n").filter((l: string) => !l.startsWith("#") && l.trim()).slice(0, 30);
      setPreview(lines.join("\n"));
    } catch {
      setPreview("Failed to load metrics.");
    } finally {
      setLoading(false);
    }
  };

  const grafanaDashboardUrl = grafanaUrl
    ? grafanaSource === "cloud"
      ? grafanaUrl
      : `${grafanaUrl.replace(/\/$/, "")}/d/trefolio-main/trefolio?orgId=1&refresh=15s`
    : null;

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Monitoring & Metrics</h3>
        <div className="flex items-center gap-2">
          {cloudConfigured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
              Cloud
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        All API routes, provider calls, auth events, business operations, and Node.js runtime metrics are tracked.
        {cloudConfigured
          ? " Metrics are pushed to Grafana Cloud on every request and via a scheduled cron job."
          : " Open the Grafana dashboard for real-time charts and alerts."}
      </p>

      {grafanaDashboardUrl ? (
        <a
          href={grafanaDashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.687 14.569a.672.672 0 00-.672-.672h-.354a9.544 9.544 0 00-.474-2.29l.307-.177a.672.672 0 00.246-.918l-.336-.582a.672.672 0 00-.918-.246l-.307.177a9.6 9.6 0 00-1.633-1.633l.177-.307a.672.672 0 00-.246-.918l-.582-.336a.672.672 0 00-.918.246l-.177.307a9.544 9.544 0 00-2.29-.474V6.39a.672.672 0 00-.672-.672h-.672a.672.672 0 00-.672.672v.354a9.544 9.544 0 00-2.29.474l-.177-.307a.672.672 0 00-.918-.246l-.582.336a.672.672 0 00-.246.918l.177.307A9.6 9.6 0 007.01 9.86l-.307-.177a.672.672 0 00-.918.246l-.336.582a.672.672 0 00.246.918l.307.177a9.544 9.544 0 00-.474 2.29H5.17a.672.672 0 00-.672.672v.672a.672.672 0 00.672.672h.354a9.544 9.544 0 00.474 2.29l-.307.177a.672.672 0 00-.246.918l.336.582a.672.672 0 00.918.246l.307-.177a9.6 9.6 0 001.633 1.633l-.177.307a.672.672 0 00.246.918l.582.336a.672.672 0 00.918-.246l.177-.307a9.544 9.544 0 002.29.474v.354a.672.672 0 00.672.672h.672a.672.672 0 00.672-.672v-.354a9.544 9.544 0 002.29-.474l.177.307a.672.672 0 00.918.246l.582-.336a.672.672 0 00.246-.918l-.177-.307a9.6 9.6 0 001.633-1.633l.307.177a.672.672 0 00.918-.246l.336-.582a.672.672 0 00-.246-.918l-.307-.177a9.544 9.544 0 00.474-2.29h.354a.672.672 0 00.672-.672v-.672zM14.256 19.2a4.8 4.8 0 110-9.6 4.8 4.8 0 010 9.6z" />
          </svg>
          Open Grafana {grafanaSource === "cloud" ? "Cloud " : ""}Dashboard
        </a>
      ) : (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Grafana not configured.</span>{" "}
            For <strong>Vercel / production</strong>, set{" "}
            <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 font-mono">GRAFANA_CLOUD_OTLP_URL</code>,{" "}
            <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 font-mono">GRAFANA_CLOUD_INSTANCE_ID</code>,{" "}
            <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 font-mono">GRAFANA_CLOUD_API_TOKEN</code>, and{" "}
            <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 font-mono">GRAFANA_CLOUD_DASHBOARD_URL</code>.
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-2">
            For <strong>local dev</strong>, set{" "}
            <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 font-mono">GRAFANA_URL</code> and start the monitoring stack:
          </p>
          <pre className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-mono">docker compose -f docker-compose.monitoring.yml up -d</pre>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <a
          href="/api/metrics"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Raw Prometheus Metrics
        </a>
        <button
          onClick={loadPreview}
          disabled={loading}
          className="btn-secondary text-xs px-4 py-2"
        >
          {loading ? "Loading..." : "Preview"}
        </button>
        {grafanaUrl && grafanaSource === "local" && (
          <a
            href={`${grafanaUrl.replace(/\/$/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5"
          >
            Grafana Home
          </a>
        )}
      </div>

      {preview && (
        <pre className="text-xs bg-gray-900 dark:bg-slate-950 text-green-400 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto font-mono leading-relaxed">
          {preview}
        </pre>
      )}

      <details className="mt-4">
        <summary className="text-xs font-medium text-gray-700 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
          Setup instructions
        </summary>
        <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">1. Start monitoring stack:</p>
            <pre className="text-xs text-gray-600 dark:text-slate-400 font-mono">docker compose -f docker-compose.monitoring.yml up -d</pre>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">2. Add to .env.local:</p>
            <pre className="text-xs text-gray-600 dark:text-slate-400 font-mono">GRAFANA_URL=http://localhost:3001</pre>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">3. Grafana credentials:</p>
            <pre className="text-xs text-gray-600 dark:text-slate-400 font-mono">admin / admin</pre>
          </div>
        </div>
      </details>
    </div>
  );
}

/* ── Capacity Card ────────────────────────────────────────── */

interface CapacityData {
  available: boolean;
  currentCount: number;
  maxCount: number;
  remaining: number;
}

interface RateLimitEntry {
  userId: string;
  username: string;
  plan: string;
  provider: string;
  callCount: number;
  windowStart: string;
}

function CapacityCard() {
  const batch = useBatchSettings();
  const loadedRef = useRef(false);
  const [capacity, setCapacity] = useState<CapacityData | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (batch?.capacity) {
      setCapacity(batch.capacity);
      setRateLimits(batch.rateLimits?.perUser || []);
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const [capRes, rlRes] = await Promise.all([
          fetch("/api/billing/capacity", { cache: "no-store" }),
          fetch("/api/admin/rate-limits", { cache: "no-store" }),
        ]);
        if (capRes.ok) setCapacity(await capRes.json());
        if (rlRes.ok) {
          const data = await rlRes.json();
          setRateLimits(data.perUser || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [batch]);

  if (loading) return <div className="card p-6 text-sm text-gray-500 dark:text-slate-400">Loading capacity data...</div>;

  const capPercent = capacity ? Math.round((capacity.currentCount / capacity.maxCount) * 100) : 0;
  const avEntries = rateLimits.filter((r) => r.provider === "alphavantage");
  const aiEntries = rateLimits.filter((r) => r.provider === "openai" || r.provider === "openai_import");

  const totalAvCalls = avEntries.reduce((sum, e) => sum + e.callCount, 0);
  const totalAiCalls = aiEntries.reduce((sum, e) => sum + e.callCount, 0);

  return (
    <div className="card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Platform Capacity</h3>

      {capacity && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 dark:text-slate-300">
              Pro subscribers: {capacity.currentCount} / {capacity.maxCount}
            </span>
            <span className={`text-xs font-medium ${
              !capacity.available
                ? "text-red-600 dark:text-red-400"
                : capacity.remaining <= 2
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {!capacity.available ? "AT CAPACITY" : `${capacity.remaining} remaining`}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                !capacity.available
                  ? "bg-red-500"
                  : capacity.remaining <= 2
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(capPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Provider Usage Summary */}
      {(avEntries.length > 0 || aiEntries.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3">
            <p className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-medium">Alpha Vantage</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{totalAvCalls}</p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">{avEntries.length} user{avEntries.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-3">
            <p className="text-[10px] uppercase tracking-wide text-violet-600 dark:text-violet-400 font-medium">AI / Import</p>
            <p className="text-lg font-bold text-violet-700 dark:text-violet-300 mt-0.5">{totalAiCalls}</p>
            <p className="text-[10px] text-violet-600/70 dark:text-violet-400/70">{aiEntries.length} user{aiEntries.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}

      {avEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">Alpha Vantage Usage (current window)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400">
                  <th className="pb-1 pr-4">User</th>
                  <th className="pb-1 pr-4">Plan</th>
                  <th className="pb-1 pr-4">Resolved Provider</th>
                  <th className="pb-1 pr-4">Calls</th>
                  <th className="pb-1">Window</th>
                </tr>
              </thead>
              <tbody>
                {avEntries.map((e) => (
                  <tr key={e.userId + e.provider} className="text-gray-700 dark:text-slate-300">
                    <td className="py-0.5 pr-4 font-mono">{e.username}</td>
                    <td className="py-0.5 pr-4">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        e.plan === "pro"
                          ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                      }`}>
                        {e.plan}
                      </span>
                    </td>
                    <td className="py-0.5 pr-4">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        e.plan === "pro"
                          ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400"
                      }`}>
                        {e.plan === "pro" ? "Alpha Vantage" : "Yahoo"}
                      </span>
                    </td>
                    <td className="py-0.5 pr-4">{e.callCount}</td>
                    <td className="py-0.5 text-gray-500 dark:text-slate-400">{e.windowStart}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aiEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">AI / Import Usage (current window)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400">
                  <th className="pb-1 pr-4">User</th>
                  <th className="pb-1 pr-4">Provider</th>
                  <th className="pb-1 pr-4">Calls</th>
                  <th className="pb-1">Window</th>
                </tr>
              </thead>
              <tbody>
                {aiEntries.map((e) => (
                  <tr key={e.userId + e.provider} className="text-gray-700 dark:text-slate-300">
                    <td className="py-0.5 pr-4 font-mono">{e.username}</td>
                    <td className="py-0.5 pr-4">{e.provider}</td>
                    <td className="py-0.5 pr-4">{e.callCount}</td>
                    <td className="py-0.5 text-gray-500 dark:text-slate-400">{e.windowStart}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {avEntries.length === 0 && aiEntries.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-slate-400">No rate limit usage data yet.</p>
      )}
    </div>
  );
}

const EXTERNAL_SERVICES = [
  {
    name: "Stripe",
    url: "https://dashboard.stripe.com",
    color: "bg-[#635bff]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
      </svg>
    ),
  },
  {
    name: "Grafana Cloud",
    url: "https://grafana.com",
    color: "bg-[#f46800]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.687 14.569a.672.672 0 00-.672-.672h-.354a9.544 9.544 0 00-.474-2.29l.307-.177a.672.672 0 00.246-.918l-.336-.582a.672.672 0 00-.918-.246l-.307.177a9.6 9.6 0 00-1.633-1.633l.177-.307a.672.672 0 00-.246-.918l-.582-.336a.672.672 0 00-.918.246l-.177.307a9.544 9.544 0 00-2.29-.474V6.39a.672.672 0 00-.672-.672h-.672a.672.672 0 00-.672.672v.354a9.544 9.544 0 00-2.29.474l-.177-.307a.672.672 0 00-.918-.246l-.582.336a.672.672 0 00-.246.918l.177.307A9.6 9.6 0 007.01 9.86l-.307-.177a.672.672 0 00-.918.246l-.336.582a.672.672 0 00.246.918l.307.177a9.544 9.544 0 00-.474 2.29H5.17a.672.672 0 00-.672.672v.672a.672.672 0 00.672.672h.354a9.544 9.544 0 00.474 2.29l-.307.177a.672.672 0 00-.246.918l.336.582a.672.672 0 00.918.246l.307-.177a9.6 9.6 0 001.633 1.633l-.177.307a.672.672 0 00.246.918l.582.336a.672.672 0 00.918-.246l.177-.307a9.544 9.544 0 002.29.474v.354a.672.672 0 00.672.672h.672a.672.672 0 00.672-.672v-.354a9.544 9.544 0 002.29-.474l.177.307a.672.672 0 00.918.246l.582-.336a.672.672 0 00.246-.918l-.177-.307a9.6 9.6 0 001.633-1.633l.307.177a.672.672 0 00.918-.246l.336-.582a.672.672 0 00-.246-.918l-.307-.177a9.544 9.544 0 00.474-2.29h.354a.672.672 0 00.672-.672v-.672zM14.256 19.2a4.8 4.8 0 110-9.6 4.8 4.8 0 010 9.6z" />
      </svg>
    ),
  },
  {
    name: "Upstash Redis",
    url: "https://console.upstash.com",
    color: "bg-[#00e9a3]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 .9 3 2s-1.34 2-3 2-3-.9-3-2 1.34-2 3-2zm0 14c-2.76 0-5-1.34-5-3v-1.5c0-1.38 2.24-2.5 5-2.5s5 1.12 5 2.5V16c0 1.66-2.24 3-5 3zm5-7.5c0 1.38-2.24 2.5-5 2.5s-5-1.12-5-2.5V10c0-1.38 2.24-2.5 5-2.5s5 1.12 5 2.5v1.5z" />
      </svg>
    ),
  },
  {
    name: "Vercel",
    url: "https://vercel.com/dashboard",
    color: "bg-black dark:bg-white dark:text-black",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L24 22H0L12 1z" />
      </svg>
    ),
  },
  {
    name: "Turso",
    url: "https://turso.tech/app",
    color: "bg-[#4ff8d2]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 5c0-1.1.9-2 2-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2 0v2h12V5H6zm-2 8c0-1.1.9-2 2-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm2 0v2h12v-2H6zm14 6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2h12a2 2 0 002-2v-2zm-14 0v2h12v-2H6z" />
      </svg>
    ),
  },
  {
    name: "Alpha Vantage",
    url: "https://www.alphavantage.co/support/#api-key",
    color: "bg-[#1a73e8]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
      </svg>
    ),
  },
  {
    name: "OpenAI",
    url: "https://platform.openai.com",
    color: "bg-[#10a37f]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 0011.708.0a6.044 6.044 0 00-5.764 4.218 5.99 5.99 0 00-3.997 2.9 6.056 6.056 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.26 24a6.056 6.056 0 005.772-4.206 5.99 5.99 0 003.997-2.9 6.066 6.066 0 00-.747-7.073zM13.26 22.43a4.476 4.476 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.6 18.304a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.771.771 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 19.95a4.5 4.5 0 01-6.14-1.646zM2.34 7.896a4.485 4.485 0 012.366-1.973V11.6a.766.766 0 00.388.676l5.815 3.355-2.02 1.168a.076.076 0 01-.071 0l-4.83-2.786A4.504 4.504 0 012.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 01.071 0l4.83 2.791a4.494 4.494 0 01-.676 8.105v-5.678a.79.79 0 00-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L9.409 9.23V6.897a.066.066 0 01.028-.061l4.83-2.787a4.5 4.5 0 016.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 01-.038-.057V6.075a4.5 4.5 0 017.375-3.453l-.142.08L8.704 5.46a.795.795 0 00-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
      </svg>
    ),
  },
  {
    name: "Cloudflare",
    url: "https://dash.cloudflare.com",
    color: "bg-[#f38020]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.51 17.93l.39-1.36c.1-.35.05-.66-.12-.88a.83.83 0 00-.67-.31H7.68c-.1 0-.17-.04-.2-.1a.2.2 0 01.01-.2l.42-1.08c.06-.14.2-.24.36-.24h8.81c1.07 0 2.2-.78 2.58-1.8l.58-1.58a.37.37 0 00.02-.12c0-.03 0-.06-.02-.09a5.89 5.89 0 00-11.33-.81 3.54 3.54 0 00-5.5 2.07A4.09 4.09 0 000 15.67c0 .12.08.22.2.24l15.73.01c.16 0 .33-.1.39-.26l.19-.67zm3.07-5.87c-.05 0-.1.03-.12.08l-.31 1.07c-.1.35-.05.66.12.88.17.21.43.32.67.31h1.63c.1 0 .17.04.2.1a.2.2 0 01-.01.2l-.42 1.08c-.06.14-.2.24-.36.24h-2.27c-.16 0-.33.1-.39.26l-.2.67-.38 1.36c-.1.35-.05.66.12.88.17.21.43.32.67.31h5.35c.12 0 .23-.08.27-.2A5.13 5.13 0 0019.58 12.06z" />
      </svg>
    ),
  },
  {
    name: "Resend",
    url: "https://resend.com/emails",
    color: "bg-[#0f172a]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 6a2 2 0 012-2h14a2 2 0 012 2v.4l-9 5.4-9-5.4V6zm0 3.72l8.49 5.1a1 1 0 001.02 0L21 9.72V18a2 2 0 01-2 2H5a2 2 0 01-2-2V9.72z" />
      </svg>
    ),
  },
  {
    name: "SnapTrade",
    url: "https://dashboard.snaptrade.com",
    color: "bg-[#2563eb]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 5h7a3 3 0 013 3v11H7a3 3 0 01-3-3V5zm10 0h3a3 3 0 013 3v11h-6V5zm-8 5h6v2H6v-2zm0 4h6v2H6v-2z" />
      </svg>
    ),
  },
  {
    name: "OpenFIGI",
    url: "https://www.openfigi.com/api",
    color: "bg-[#0ea5e9]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l8 4.5v11L12 22 4 17.5v-11L12 2zm0 2.3L6 7.3v9.4l6 3.4 6-3.4V7.3l-6-3zM8.8 9H15v2H8.8V9zm0 4H15v2H8.8v-2z" />
      </svg>
    ),
  },
  {
    name: "Finnhub",
    url: "https://finnhub.io/dashboard",
    color: "bg-[#0f766e]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 4h14v3H5V4zm0 5h9v3H5V9zm0 5h14v3H5v-3zm0 5h9v1H5v-1z" />
      </svg>
    ),
  },
  {
    name: "FMP",
    url: "https://site.financialmodelingprep.com/developer/docs",
    color: "bg-[#9333ea]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 5h16v2H4V5zm0 4h10v2H4V9zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" />
      </svg>
    ),
  },
  {
    name: "Twilio",
    url: "https://console.twilio.com",
    color: "bg-[#f22f46]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1010 10A10.01 10.01 0 0012 2zm-3.25 6.25a1.75 1.75 0 111.75 1.75 1.75 1.75 0 01-1.75-1.75zm0 7.5a1.75 1.75 0 111.75-1.75 1.75 1.75 0 01-1.75 1.75zm4.5-7.5A1.75 1.75 0 1115 10a1.75 1.75 0 01-1.75-1.75zm0 7.5A1.75 1.75 0 1115 14a1.75 1.75 0 01-1.75 1.75z" />
      </svg>
    ),
  },
] as const;

/* ── AI Model Config Card ─────────────────────────────────── */

const AI_FLOW_META_UI: Record<string, { label: string; description: string }> = {
  ai_analysis: { label: "AI Analysis", description: "Stock fundamentals, intelligence, crypto, tax" },
  portfolio_chat: { label: "Portfolio Chat", description: "Interactive portfolio assistant" },
  chart_chat: { label: "Chart Chat", description: "Chart context Q&A" },
  portfolio_review: { label: "Portfolio Review", description: "Long-form portfolio review" },
  portfolio_score: { label: "Portfolio Score", description: "Structured score (JSON)" },
  import_portfolio: { label: "Import Parsing", description: "CSV/screenshot import" },
  device_summary: { label: "Device Summary", description: "Desk display summary" },
  support_chat: { label: "Support Chat", description: "In-app support assistant" },
  weekly_digest: { label: "Weekly Digest", description: "Digest paragraph (cron)" },
  weekly_digest_admin: { label: "Weekly Digest (Admin)", description: "Admin-triggered digest" },
  digest_email: { label: "Market Digest Email", description: "Newsletter rewrite pipeline" },
  digest_x_post: { label: "Digest X Post", description: "Generate X.com post from digest" },
};

const AI_FLOW_KEYS_UI = Object.keys(AI_FLOW_META_UI);

const ALLOWED_MODELS_UI = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", tier: "low" },
  { value: "gpt-4o", label: "GPT-4o", tier: "high" },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano", tier: "low" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", tier: "medium" },
  { value: "gpt-4.1", label: "GPT-4.1", tier: "high" },
  { value: "o4-mini", label: "o4-mini", tier: "medium" },
];

const COST_TIER_COLORS: Record<string, string> = {
  low: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high: "text-red-600 dark:text-red-400",
};

function AiModelConfigCard() {
  const batch = useBatchSettings();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (batch?.aiModels) {
      setConfig(batch.aiModels);
    } else {
      fetch("/api/admin/ai-models")
        .then((r) => r.json())
        .then((d) => setConfig(d.config || {}))
        .catch(() => {});
    }
  }, [batch]);

  const handleChange = (flowKey: string, model: string) => {
    setConfig((prev) => ({ ...prev, [flowKey]: model }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai-models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaults: Record<string, string> = {};
    for (const key of AI_FLOW_KEYS_UI) defaults[key] = "gpt-4o-mini";
    setConfig(defaults);
    setSaved(false);
  };

  const getTier = (model: string) => ALLOWED_MODELS_UI.find((m) => m.value === model)?.tier || "low";

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Model Configuration</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Select which OpenAI model to use for each AI flow. Changes take effect within 5 minutes.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="btn-secondary text-xs px-3 py-1.5">
            Reset All
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-slate-400">Flow</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-slate-400">Description</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-slate-400">Model</th>
              <th className="text-left py-2 font-medium text-gray-500 dark:text-slate-400">Cost</th>
            </tr>
          </thead>
          <tbody>
            {AI_FLOW_KEYS_UI.map((key) => {
              const meta = AI_FLOW_META_UI[key];
              const current = config[key] || "gpt-4o-mini";
              const tier = getTier(current);
              return (
                <tr key={key} className="border-b border-gray-100 dark:border-slate-800">
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {meta.label}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-slate-400">
                    {meta.description}
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      value={current}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs px-2 py-1"
                    >
                      {ALLOWED_MODELS_UI.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`py-2 font-medium ${COST_TIER_COLORS[tier]}`}>
                    {tier === "low" ? "$ Low" : tier === "medium" ? "$$ Med" : "$$$ High"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExternalServicesCard() {
  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">External Services</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        Quick links to all third-party dashboards and consoles.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {EXTERNAL_SERVICES.map((svc) => (
          <a
            key={svc.name}
            href={svc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-sm transition-all"
          >
            <span className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-white ${svc.color}`}>
              {svc.icon}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
              {svc.name}
            </span>
            <svg className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-gray-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-500/10 p-3">
        <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-1">
          Meta tracking (optional, disabled by default)
        </p>
        <p className="text-[11px] text-indigo-700 dark:text-indigo-300/90 mb-2">
          To enable Meta Pixel + CAPI, configure these environment variables:
        </p>
        <ul className="space-y-1 text-[11px] text-indigo-700 dark:text-indigo-200 font-mono">
          <li>
            <code>NEXT_PUBLIC_META_PIXEL_ID</code> (browser pixel)
          </li>
          <li>
            <code>META_CAPI_ACCESS_TOKEN</code> (server CAPI token)
          </li>
          <li>
            <code>META_CAPI_PIXEL_ID</code> (optional, falls back to <code>NEXT_PUBLIC_META_PIXEL_ID</code>)
          </li>
        </ul>
      </div>
    </div>
  );
}

function SupportChatConfigCard() {
  const batch = useBatchSettings();
  const loadedRef = useRef(false);
  const [config, setConfig] = useState<{
    enabled: boolean;
    starterDailyLimit: number;
    proDailyLimit: number;
    welcomeMessage: string;
    customInstructions: string;
    messagesThisMonth: number;
  } | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [starterDaily, setStarterDaily] = useState(10);
  const [proDaily, setProDaily] = useState(50);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (batch?.supportChat && batch?.flags) {
      const sc = batch.supportChat;
      setConfig({
        enabled: sc.enabled,
        starterDailyLimit: sc.starterDailyLimit,
        proDailyLimit: sc.proDailyLimit,
        welcomeMessage: sc.welcomeMessage,
        customInstructions: sc.customInstructions,
        messagesThisMonth: sc.messagesThisMonth,
      });
      setStarterDaily(sc.starterDailyLimit);
      setProDaily(sc.proDailyLimit);
      setWelcomeMessage(sc.welcomeMessage);
      setCustomInstructions(sc.customInstructions);
      setFlags(batch.flags);
      setLoading(false);
      return;
    }
    Promise.all([
      fetch("/api/admin/support-chat-config", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/feature-flags", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([configData, flagsData]) => {
        setConfig({
          enabled: configData.enabled ?? false,
          starterDailyLimit: configData.starterDailyLimit ?? 10,
          proDailyLimit: configData.proDailyLimit ?? 50,
          welcomeMessage: configData.welcomeMessage ?? "",
          customInstructions: configData.customInstructions ?? "",
          messagesThisMonth: configData.messagesThisMonth ?? 0,
        });
        setStarterDaily(configData.starterDailyLimit ?? 10);
        setProDaily(configData.proDailyLimit ?? 50);
        setWelcomeMessage(configData.welcomeMessage ?? "");
        setCustomInstructions(configData.customInstructions ?? "");
        setFlags(flagsData.flags ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batch]);

  const handleToggle = async (enabled: boolean) => {
    setToggleSaving(true);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag: "support_chat_enabled", enabled }),
      });
      if (res.ok) {
        setFlags((prev) => ({ ...prev, support_chat_enabled: enabled }));
        setConfig((prev) => (prev ? { ...prev, enabled } : null));
      }
    } catch {
      // Keep previous state on failure.
    }
    setToggleSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/support-chat-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starterDailyLimit: starterDaily,
          proDailyLimit: proDaily,
          welcomeMessage: welcomeMessage || undefined,
          customInstructions: customInstructions || undefined,
        }),
      });
      if (res.ok) {
        setConfig((prev) =>
          prev ? { ...prev, starterDailyLimit: starterDaily, proDailyLimit: proDaily, welcomeMessage, customInstructions } : null
        );
      }
    } catch {
      // Keep previous state on failure.
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  const enabled = flags.support_chat_enabled ?? config?.enabled ?? false;

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">AI Support Chat</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        Configure the in-app AI support chat widget. Enable the feature and set daily message limits per plan.
      </p>
      <div className="divide-y divide-gray-200 dark:divide-slate-700">
        <div className="py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Support Chat</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Show the AI support chat widget to users.</p>
            </div>
            <button
              type="button"
              disabled={toggleSaving}
              onClick={() => handleToggle(!enabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
              } ${toggleSaving ? "opacity-50 cursor-wait" : ""}`}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Starter Daily Limit</label>
            <input
              type="number"
              min={1}
              max={100}
              value={starterDaily}
              onChange={(e) => setStarterDaily(parseInt(e.target.value, 10) || 10)}
              className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Pro Daily Limit</label>
            <input
              type="number"
              min={1}
              max={200}
              value={proDaily}
              onChange={(e) => setProDaily(parseInt(e.target.value, 10) || 50)}
              className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Welcome Message (optional)</label>
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="Custom greeting shown when the chat opens"
            rows={2}
            className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-y"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Custom Instructions (optional)</label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Additional context for the AI agent, e.g. current promotions"
            rows={3}
            className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-y"
          />
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Hint: Additional context for the AI agent, e.g. current promotions</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Messages this month: <span className="font-semibold text-gray-900 dark:text-white">{config?.messagesThisMonth ?? 0}</span>
          </p>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StripePricesCard() {
  const FIELDS: { key: string; label: string; placeholder: string; hint?: string }[] = [
    { key: "stripe_price_starter_monthly", label: "Starter Monthly", placeholder: "price_...", hint: "€2.99/mo (launch) · €3.99 regular" },
    { key: "stripe_price_starter_annual", label: "Starter Annual", placeholder: "price_...", hint: "€23.99/yr (launch) · €31.99 regular" },
    { key: "stripe_price_pro_monthly", label: "Pro Monthly", placeholder: "price_...", hint: "€7.99/mo (launch) · €9.99 regular" },
    { key: "stripe_price_pro_annual", label: "Pro Annual", placeholder: "price_...", hint: "€59.99/yr (launch) · €79.99 regular" },
    { key: "stripe_coupon_device_free_year", label: "Device Free Year Coupon", placeholder: "coupon ID" },
  ];

  const batch = useBatchSettings();
  const loadedRef = useRef(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (batch?.stripePrices) {
      setValues(batch.stripePrices);
      setDraft(batch.stripePrices);
      setLoaded(true);
      return;
    }
    fetch("/api/admin/stripe-prices", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setValues(d); setDraft(d); setLoaded(true); })
      .catch(() => {});
  }, [batch]);

  const hasChanges = loaded && FIELDS.some((f) => (draft[f.key] ?? "") !== (values[f.key] ?? ""));

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/stripe-prices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const data = await res.json();
      setValues(data);
      setDraft(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Stripe Price IDs</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        Configure Stripe price IDs and coupon for checkout. Values stored here override environment variables.
      </p>
      <div className="space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-600 dark:text-slate-300 w-44 shrink-0">{f.label}</label>
              <input
                type="text"
                value={draft[f.key] ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="text-sm flex-1 font-mono"
              />
              {(draft[f.key] ?? "") !== (values[f.key] ?? "") && (
                <span className="text-[10px] text-amber-500 shrink-0">unsaved</span>
              )}
            </div>
            {f.hint && (
              <p className="text-[10px] text-gray-400 dark:text-slate-500 ml-[11.75rem] mt-0.5">{f.hint}</p>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={handleSave} disabled={saving || !hasChanges} className="btn-primary text-xs px-4 py-2 disabled:opacity-40">
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved successfully.</span>}
      </div>
    </div>
  );
}

function PromoBannerCard() {
  const batch = useBatchSettings();
  const loadedRef = useRef(false);
  const [config, setConfig] = useState({
    enabled: false,
    title: "",
    badge: "",
    description: "",
    ctaText: "",
    ctaLink: "",
  });
  const [draft, setDraft] = useState(config);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (batch?.promoBanner?.config) {
      setConfig(batch.promoBanner.config);
      setDraft(batch.promoBanner.config);
      setLoading(false);
      return;
    }
    fetch("/api/admin/promo-banner", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setConfig(data.config);
          setDraft(data.config);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batch]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(config);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/promo-banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setDraft(data.config);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-4 w-40 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Promo Banner</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Configure the promotional banner shown on the dashboard. Changes take effect immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            draft.enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
          }`}
          role="switch"
          aria-checked={draft.enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              draft.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="trefolio Leaf — Limited Edition"
            maxLength={120}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Badge</label>
            <input
              type="text"
              value={draft.badge}
              onChange={(e) => setDraft((prev) => ({ ...prev, badge: e.target.value }))}
              placeholder="Only 10 units"
              maxLength={40}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">CTA Button Text</label>
            <input
              type="text"
              value={draft.ctaText}
              onChange={(e) => setDraft((prev) => ({ ...prev, ctaText: e.target.value }))}
              placeholder="Learn more"
              maxLength={40}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Description</label>
          <input
            type="text"
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Your portfolio on a vivid AMOLED desk display."
            maxLength={200}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">CTA Link</label>
          <input
            type="text"
            value={draft.ctaLink}
            onChange={(e) => setDraft((prev) => ({ ...prev, ctaLink: e.target.value }))}
            placeholder="/leaf"
            maxLength={200}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button onClick={handleSave} disabled={saving || !hasChanges} className="btn-primary text-xs px-4 py-2 disabled:opacity-40">
          {saving ? "Saving..." : "Save Banner"}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved successfully.</span>}
        {hasChanges && !saved && <span className="text-[10px] text-amber-500">Unsaved changes</span>}
      </div>
    </div>
  );
}

function GaConfigCard() {
  const batch = useBatchSettings();
  const loadedRef = useRef(false);
  const [gaId, setGaId] = useState("");
  const [draft, setDraft] = useState("");
  const [source, setSource] = useState<"env" | "database">("env");
  const [adsId, setAdsId] = useState("");
  const [adsDraft, setAdsDraft] = useState("");
  const [adsSource, setAdsSource] = useState<"env" | "database">("env");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (batch?.gaConfig) {
      setGaId(batch.gaConfig.gaId || "");
      setDraft(batch.gaConfig.gaId || "");
      setSource(batch.gaConfig.source || "env");
      setAdsId(batch.gaConfig.googleAdsId || "");
      setAdsDraft(batch.gaConfig.googleAdsId || "");
      setAdsSource(batch.gaConfig.googleAdsSource || "env");
      setLoading(false);
      return;
    }
    fetch("/api/admin/ga-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setGaId(d.gaId || "");
        setDraft(d.gaId || "");
        setSource(d.source || "env");
        setAdsId(d.googleAdsId || "");
        setAdsDraft(d.googleAdsId || "");
        setAdsSource(d.googleAdsSource || "env");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batch]);

  const hasGaChanges = draft !== gaId;
  const hasAdsChanges = adsDraft !== adsId;
  const hasChanges = hasGaChanges || hasAdsChanges;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload: Record<string, string> = {};
      if (hasGaChanges) payload.gaId = draft.trim();
      if (hasAdsChanges) payload.googleAdsId = adsDraft.trim();
      const res = await fetch("/api/admin/ga-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        setSaving(false);
        return;
      }
      setGaId(data.gaId);
      setDraft(data.gaId);
      setSource(data.gaId ? "database" : "env");
      setAdsId(data.googleAdsId);
      setAdsDraft(data.googleAdsId);
      setAdsSource(data.googleAdsId ? "database" : "env");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save.");
    }
    setSaving(false);
  };

  const handleRemoveGa = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/ga-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gaId: "" }),
    });
    if (res.ok) {
      const data = await res.json();
      setGaId("");
      setDraft("");
      setSource("env");
      setAdsId(data.googleAdsId ?? adsId);
      setAdsDraft(data.googleAdsId ?? adsDraft);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const handleRemoveAds = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/ga-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleAdsId: "" }),
    });
    if (res.ok) {
      const data = await res.json();
      setAdsId("");
      setAdsDraft("");
      setAdsSource("env");
      setGaId(data.gaId ?? gaId);
      setDraft(data.gaId ?? draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-4 w-40 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Google Analytics &amp; Ads</h3>
        <div className="flex items-center gap-1.5">
          {gaId && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              source === "database"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
            }`}>
              GA: {source === "database" ? "DB" : "env"}
            </span>
          )}
          {adsId && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              adsSource === "database"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
            }`}>
              Ads: {adsSource === "database" ? "DB" : "env"}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        Configure the Google Analytics Measurement ID and Google Ads Conversion ID.
        Values saved here override the <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">NEXT_PUBLIC_GA_MEASUREMENT_ID</code> and <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-xs">NEXT_PUBLIC_GOOGLE_ADS_ID</code> environment variables.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold mb-1 block">Analytics Measurement ID</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError(""); }}
              placeholder="G-XXXXXXXXXX"
              className="text-sm flex-1 font-mono"
            />
            {gaId && source === "database" && (
              <button onClick={handleRemoveGa} disabled={saving} className="btn-danger text-xs px-3 py-2">
                Remove
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold mb-1 block">Google Ads Conversion ID</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={adsDraft}
              onChange={(e) => { setAdsDraft(e.target.value); setError(""); }}
              placeholder="AW-XXXXXXXXXX"
              className="text-sm flex-1 font-mono"
            />
            {adsId && adsSource === "database" && (
              <button onClick={handleRemoveAds} disabled={saving} className="btn-danger text-xs px-3 py-2">
                Remove
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="btn-primary text-xs px-4 py-2 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-2">{error}</p>}
      {saved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">Saved successfully. Reload the page to apply.</p>}

      {gaId && (
        <details className="mt-4">
          <summary className="text-xs font-medium text-gray-700 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
            Preview injected HTML &amp; placement
          </summary>
          <div className="mt-3 space-y-4">
            <div className="rounded-lg bg-gray-50 dark:bg-slate-800/50 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold mb-3">Placement in DOM</p>
              <div className="font-mono text-xs leading-relaxed">
                <span className="text-gray-400 dark:text-slate-500">&lt;html&gt;</span>
                <div className="ml-4">
                  <span className="text-gray-400 dark:text-slate-500">&lt;head&gt;</span>
                  <div className="ml-4 my-1 px-2 py-1 rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <span className="text-amber-700 dark:text-amber-400">&lt;script id=&quot;ga-consent-default&quot;&gt;</span>
                    <span className="text-gray-500 dark:text-slate-400 text-[10px] ml-1">← beforeInteractive</span>
                  </div>
                  <span className="text-gray-400 dark:text-slate-500">&lt;/head&gt;</span>
                </div>
                <div className="ml-4">
                  <span className="text-gray-400 dark:text-slate-500">&lt;body&gt;</span>
                  <div className="ml-4 text-gray-400 dark:text-slate-600">...app content...</div>
                  <div className="ml-4 text-gray-400 dark:text-slate-600">&lt;CookieConsent /&gt;</div>
                  <div className="ml-4 my-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                    <span className="text-emerald-700 dark:text-emerald-400">&lt;GoogleAnalytics gaId=&quot;{gaId}&quot; /&gt;</span>
                    <span className="text-gray-500 dark:text-slate-400 text-[10px] ml-1">← src/components/GoogleAnalytics.tsx</span>
                  </div>
                  <div className="ml-4 text-gray-400 dark:text-slate-600">&lt;AdSenseScript /&gt;</div>
                  <div className="ml-4 text-gray-400 dark:text-slate-600">&lt;Analytics /&gt; &lt;SpeedInsights /&gt;</div>
                  <div className="ml-4 mt-2 space-y-1">
                    <div className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                      <span className="text-blue-700 dark:text-blue-400">&lt;script src=&quot;googletagmanager.com/gtag/js?id={gaId}&quot;&gt;</span>
                      <span className="text-gray-500 dark:text-slate-400 text-[10px] ml-1">← afterInteractive</span>
                    </div>
                    <div className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                      <span className="text-blue-700 dark:text-blue-400">&lt;script id=&quot;ga-init&quot;&gt;</span>
                      <span className="text-gray-500 dark:text-slate-400 text-[10px] ml-1">← afterInteractive</span>
                    </div>
                  </div>
                  <span className="text-gray-400 dark:text-slate-500">&lt;/body&gt;</span>
                </div>
                <span className="text-gray-400 dark:text-slate-500">&lt;/html&gt;</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Script 1</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Consent defaults (head, beforeInteractive)</span>
              </div>
              <pre className="text-xs bg-gray-900 dark:bg-slate-950 text-green-400 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">{`<script id="ga-consent-default">
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
</script>`}</pre>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">Script 2</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Google Tag Manager loader (body, afterInteractive)</span>
              </div>
              <pre className="text-xs bg-gray-900 dark:bg-slate-950 text-green-400 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">{`<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>`}</pre>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">Script 3</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">GA4 config &amp; page view (body, afterInteractive)</span>
              </div>
              <pre className="text-xs bg-gray-900 dark:bg-slate-950 text-green-400 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">{`<script id="ga-init">
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${gaId}', {
    page_path: window.location.pathname,
    send_page_view: true,
  });
</script>`}</pre>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400 font-semibold">Runtime</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Consent update (fired when user accepts cookies)</span>
              </div>
              <pre className="text-xs bg-gray-900 dark:bg-slate-950 text-green-400 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">{`gtag('consent', 'update', {
  analytics_storage: 'granted',
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
});`}</pre>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-slate-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold mb-2">Source files</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <code className="text-gray-600 dark:text-slate-300 font-mono">src/components/GoogleAnalytics.tsx</code>
                  <span className="text-gray-400 dark:text-slate-500">— renders all 3 script tags</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <code className="text-gray-600 dark:text-slate-300 font-mono">src/lib/gtag.ts</code>
                  <span className="text-gray-400 dark:text-slate-500">— pageview(), event(), consent helpers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <code className="text-gray-600 dark:text-slate-300 font-mono">src/app/layout.tsx</code>
                  <span className="text-gray-400 dark:text-slate-500">— fetches GA ID from DB, passes to component</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                  <code className="text-gray-600 dark:text-slate-300 font-mono">src/components/CookieConsent.tsx</code>
                  <span className="text-gray-400 dark:text-slate-500">— triggers consent update on user action</span>
                </div>
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function UtmTaxonomyCard() {
  const batch = useBatchSettings();
  const loadedRef = useRef(false);
  const [config, setConfig] = useState<{ sources: string[]; mediums: string[]; campaigns: string[]; notes: string } | null>(null);
  const [draft, setDraft] = useState<{ sources: string[]; mediums: string[]; campaigns: string[]; notes: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (batch?.utmTaxonomy?.config) {
      setConfig(batch.utmTaxonomy.config);
      setDraft(JSON.parse(JSON.stringify(batch.utmTaxonomy.config)));
      setLoading(false);
      return;
    }
    fetch("/api/admin/utm-taxonomy", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setConfig(d.config);
        setDraft(JSON.parse(JSON.stringify(d.config)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batch]);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(draft);

  const parseList = (value: string): string[] =>
    value
      .split(/\r?\n|,/)
      .map((v) => v.trim())
      .filter(Boolean);

  const listToInput = (value: string[]): string => value.join("\n");

  const updateList = (key: "sources" | "mediums" | "campaigns", value: string) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: parseList(value) });
    setError("");
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/utm-taxonomy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        setSaving(false);
        return;
      }
      setConfig(data.config);
      setDraft(JSON.parse(JSON.stringify(data.config)));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save.");
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/utm-taxonomy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset.");
        setSaving(false);
        return;
      }
      setConfig(data.config);
      setDraft(JSON.parse(JSON.stringify(data.config)));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to reset.");
    }
    setSaving(false);
  };

  if (loading || !draft) {
    return (
      <div className="card p-6">
        <div className="h-4 w-40 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">UTM Taxonomy</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        Standardize campaign naming for clean attribution reports. Save your approved UTM values so marketing and admin use one source of truth.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">utm_source</label>
          <textarea
            rows={5}
            value={listToInput(draft.sources)}
            onChange={(e) => updateList("sources", e.target.value)}
            placeholder={"google\nmeta\nlinkedin"}
            className="w-full text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">utm_medium</label>
          <textarea
            rows={5}
            value={listToInput(draft.mediums)}
            onChange={(e) => updateList("mediums", e.target.value)}
            placeholder={"cpc\npaid_social\nemail"}
            className="w-full text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">utm_campaign examples</label>
          <textarea
            rows={5}
            value={listToInput(draft.campaigns)}
            onChange={(e) => updateList("campaigns", e.target.value)}
            placeholder={"launch_q2_2026\nretargeting_q2_2026"}
            className="w-full text-sm font-mono"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Naming rule notes</label>
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(e) => { setDraft({ ...draft, notes: e.target.value }); setError(""); }}
          placeholder="Use lowercase and snake_case. Keep source/medium fixed."
          className="w-full text-sm"
        />
      </div>

      <div className="mt-3 text-[11px] text-gray-500 dark:text-slate-400">
        Example URL: <code className="font-mono">?utm_source={draft.sources[0] || "google"}&amp;utm_medium={draft.mediums[0] || "cpc"}&amp;utm_campaign={draft.campaigns[0] || "launch_q2_2026"}</code>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button onClick={handleSave} disabled={saving || !hasChanges} className="btn-primary text-xs px-4 py-2 disabled:opacity-40">
          {saving ? "Saving..." : "Save UTM Taxonomy"}
        </button>
        <button onClick={handleReset} disabled={saving} className="btn-secondary text-xs px-3 py-2">
          Reset to defaults
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved successfully.</span>}
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-2">{error}</p>}
    </div>
  );
}

const AD_SLOT_META: Record<string, { label: string; page: string; format: string; size: string; desc: string; color: string }> = {
  "dashboard-summary": {
    label: "Below Portfolio Summary",
    page: "Dashboard",
    format: "horizontal",
    size: "728×90 responsive",
    desc: "Highest-visibility slot. Between portfolio value and holdings table.",
    color: "emerald",
  },
  "dashboard-bottom": {
    label: "End of Tab Content",
    page: "Dashboard",
    format: "rectangle",
    size: "336×280 responsive",
    desc: "Below the last section in each dashboard tab. Engaged scrollers.",
    color: "blue",
  },
  "tools-bottom": {
    label: "Below Tool Content",
    page: "Tools",
    format: "horizontal",
    size: "728×90 responsive",
    desc: "Secondary high-traffic page with long dwell times.",
    color: "violet",
  },
  "stock-detail": {
    label: "Sidebar Rectangle",
    page: "Stock Detail",
    format: "rectangle",
    size: "300×250",
    desc: "Financial context ads alongside individual stock analysis.",
    color: "amber",
  },
  "import-done": {
    label: "Post-Import Success",
    page: "Import",
    format: "in-feed",
    size: "auto responsive",
    desc: "Shown after completing an import. Low friction moment.",
    color: "rose",
  },
};

function MockContentBlock({ label }: { label: string }) {
  return (
    <div className="rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-1.5">
      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function MockAdBlock({ slotKey, slots }: { slotKey: string; slots: Record<string, { enabled: boolean; slotId: string }> }) {
  const meta = AD_SLOT_META[slotKey];
  const slot = slots[slotKey];
  if (!meta) return null;
  const active = slot?.enabled && !!slot.slotId;

  return (
    <div
      className={`rounded border-2 border-dashed px-2 py-1.5 transition-colors ${
        active
          ? "border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/5"
          : "border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 opacity-40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-slate-500"}`}>
          Ad: {meta.label}
        </span>
        <span className={`text-[8px] font-mono ${active ? "text-amber-500" : "text-gray-400 dark:text-slate-500"}`}>
          {active ? slot.slotId : "disabled"}
        </span>
      </div>
    </div>
  );
}

function AdConfigCard() {
  const batch = useBatchSettings();
  const loadedRef = useRef(false);
  const [config, setConfig] = useState<{
    clientId: string;
    globalEnabled: boolean;
    slots: Record<string, { enabled: boolean; slotId: string }>;
  } | null>(null);
  const [draft, setDraft] = useState<{
    clientId: string;
    globalEnabled: boolean;
    slots: Record<string, { enabled: boolean; slotId: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showMockup, setShowMockup] = useState(false);
  const [mockupView, setMockupView] = useState<"dashboard" | "tools" | "stock" | "import">("dashboard");

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (batch?.adConfig) {
      setConfig(batch.adConfig);
      setDraft(JSON.parse(JSON.stringify(batch.adConfig)));
      setLoading(false);
      return;
    }
    fetch("/api/admin/ad-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setConfig(d);
        setDraft(JSON.parse(JSON.stringify(d)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batch]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(config);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/ad-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        setSaving(false);
        return;
      }
      setConfig(data.config);
      setDraft(JSON.parse(JSON.stringify(data.config)));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save.");
    }
    setSaving(false);
  };

  const updateSlot = (key: string, field: "enabled" | "slotId", value: boolean | string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      slots: {
        ...draft.slots,
        [key]: { ...draft.slots[key], [field]: value },
      },
    });
    setError("");
  };

  if (loading || !draft) {
    return (
      <div className="card p-6">
        <div className="h-4 w-40 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  const colorBorder: Record<string, string> = {
    emerald: "border-emerald-200 dark:border-emerald-500/30",
    blue: "border-blue-200 dark:border-blue-500/30",
    violet: "border-violet-200 dark:border-violet-500/30",
    amber: "border-amber-200 dark:border-amber-500/30",
    rose: "border-rose-200 dark:border-rose-500/30",
  };
  const colorBg: Record<string, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-500/5",
    blue: "bg-blue-50 dark:bg-blue-500/5",
    violet: "bg-violet-50 dark:bg-violet-500/5",
    amber: "bg-amber-50 dark:bg-amber-500/5",
    rose: "bg-rose-50 dark:bg-rose-500/5",
  };

  const enabledCount = Object.values(draft.slots).filter((s) => s.enabled && s.slotId).length;

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Google AdSense</h3>
          {draft.globalEnabled && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {enabledCount} slot{enabledCount !== 1 ? "s" : ""} active
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-gray-500 dark:text-slate-400">{draft.globalEnabled ? "Enabled" : "Disabled"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.globalEnabled}
            onClick={() => { setDraft({ ...draft, globalEnabled: !draft.globalEnabled }); setError(""); }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              draft.globalEnabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              draft.globalEnabled ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
        </label>
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        Configure AdSense ads for free-tier users. Set the publisher ID and enable/disable individual ad slots.
        Ads only appear for free users who have accepted cookies.
      </p>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Publisher ID</label>
        <input
          type="text"
          value={draft.clientId}
          onChange={(e) => { setDraft({ ...draft, clientId: e.target.value }); setError(""); }}
          placeholder="ca-pub-XXXXXXXXXX"
          className="text-sm w-full font-mono"
        />
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
          Falls back to <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono">NEXT_PUBLIC_ADSENSE_CLIENT_ID</code> if empty.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300">Ad Slots</label>
          <button
            type="button"
            onClick={() => setShowMockup(!showMockup)}
            className="text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            {showMockup ? "Hide placement preview" : "Show placement preview"}
          </button>
        </div>

        {showMockup && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              {(["dashboard", "tools", "stock", "import"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setMockupView(v)}
                  className={`text-[10px] font-semibold px-3 py-1 rounded-full transition-colors ${
                    mockupView === v
                      ? "bg-amber-500 text-white"
                      : "bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-gray-700"
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">trefolio</span>
                <div className="flex gap-2">
                  {["Portfolio", "Import", "Tools", "Stock"].map((n) => (
                    <span
                      key={n}
                      className={`text-[9px] ${
                        (mockupView === "dashboard" && n === "Portfolio") ||
                        (mockupView === "tools" && n === "Tools") ||
                        (mockupView === "stock" && n === "Stock") ||
                        (mockupView === "import" && n === "Import")
                          ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "text-gray-400 dark:text-slate-500"
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 space-y-2">
                {mockupView === "dashboard" && (
                  <>
                    <MockContentBlock label="Portfolio Summary" />
                    <MockAdBlock slotKey="dashboard-summary" slots={draft.slots} />
                    <MockContentBlock label="Holdings Table" />
                    <MockContentBlock label="Growth Chart + Markets" />
                    <MockContentBlock label="Portfolio Projection" />
                    <MockAdBlock slotKey="dashboard-bottom" slots={draft.slots} />
                  </>
                )}
                {mockupView === "tools" && (
                  <>
                    <MockContentBlock label="Portfolio Tools — Transactions / Dividends / Alerts" />
                    <MockContentBlock label="Tool Content" />
                    <MockAdBlock slotKey="tools-bottom" slots={draft.slots} />
                  </>
                )}
                {mockupView === "stock" && (
                  <>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <MockContentBlock label="Price Chart + Position" />
                        <MockContentBlock label="Fundamentals" />
                      </div>
                      <div className="w-32">
                        <MockAdBlock slotKey="stock-detail" slots={draft.slots} />
                      </div>
                    </div>
                  </>
                )}
                {mockupView === "import" && (
                  <>
                    <MockContentBlock label="Import Wizard — Step Complete" />
                    <MockAdBlock slotKey="import-done" slots={draft.slots} />
                    <MockContentBlock label="Continue / View Portfolio" />
                  </>
                )}
              </div>
            </div>

            <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-2 text-center">
              Orange dashed blocks = ad placements &middot; Shown to free-tier users only
            </p>
          </div>
        )}

        {Object.entries(AD_SLOT_META).map(([key, meta]) => {
          const slot = draft.slots[key];
          if (!slot) return null;
          return (
            <div
              key={key}
              className={`rounded-lg border p-3 transition-colors ${
                slot.enabled
                  ? `${colorBorder[meta.color]} ${colorBg[meta.color]}`
                  : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${colorMap[meta.color]}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{meta.label}</span>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                        {meta.page}
                      </span>
                      <span className="text-[9px] font-mono text-gray-400 dark:text-slate-500">{meta.size}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{meta.desc}</p>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={slot.slotId}
                        onChange={(e) => updateSlot(key, "slotId", e.target.value)}
                        placeholder="AdSense slot ID (e.g. 1234567890)"
                        className="text-xs font-mono w-full max-w-xs py-1 px-2"
                        disabled={!slot.enabled}
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={slot.enabled}
                  onClick={() => updateSlot(key, "enabled", !slot.enabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                    slot.enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    slot.enabled ? "translate-x-4" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="btn-primary text-xs px-4 py-2 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save Ad Config"}
        </button>
        {hasChanges && (
          <button
            onClick={() => { setDraft(JSON.parse(JSON.stringify(config))); setError(""); }}
            className="btn-secondary text-xs px-3 py-2"
          >
            Discard
          </button>
        )}
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        {saved && <p className="text-xs text-emerald-600 dark:text-emerald-400">Saved. Reload to apply.</p>}
      </div>

      {draft.clientId && (
        <details className="mt-4">
          <summary className="text-xs font-medium text-gray-700 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
            Preview injected HTML
          </summary>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg bg-gray-50 dark:bg-slate-800/50 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold mb-3">AdSense Script in DOM</p>
              <div className="font-mono text-xs leading-relaxed">
                <span className="text-gray-400 dark:text-slate-500">&lt;body&gt;</span>
                <div className="ml-4 text-gray-400 dark:text-slate-600">...app content...</div>
                <div className="ml-4 my-1 px-2 py-1 rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <span className="text-amber-700 dark:text-amber-400">&lt;script src=&quot;pagead2.googlesyndication.com/...?client={draft.clientId}&quot;&gt;</span>
                  <span className="text-gray-500 dark:text-slate-400 text-[10px] ml-1">&larr; lazyOnload</span>
                </div>
                <span className="text-gray-400 dark:text-slate-500">&lt;/body&gt;</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Each &lt;AdSlot&gt;</span>
              </div>
              <pre className="text-xs bg-gray-900 dark:bg-slate-950 text-green-400 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">{`<ins class="adsbygoogle"
  style="display:block"
  data-ad-client="${draft.clientId}"
  data-ad-slot="{slotId}"
  data-ad-format="{format}"
  data-full-width-responsive="true"
/>`}</pre>
            </div>

            <div className="rounded-lg bg-gray-50 dark:bg-slate-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold mb-2">Source files</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <code className="text-gray-600 dark:text-slate-300 font-mono">src/components/AdSenseScript.tsx</code>
                  <span className="text-gray-400 dark:text-slate-500">&mdash; loads the adsbygoogle SDK</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <code className="text-gray-600 dark:text-slate-300 font-mono">src/components/AdSlot.tsx</code>
                  <span className="text-gray-400 dark:text-slate-500">&mdash; renders each &lt;ins&gt; ad unit</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <code className="text-gray-600 dark:text-slate-300 font-mono">src/hooks/useAds.ts</code>
                  <span className="text-gray-400 dark:text-slate-500">&mdash; fetches config, gates display by plan/consent</span>
                </div>
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function CronJobsCard() {
  const batch = useBatchSettings();
  const loadedRef = useRef(false);
  const [stats, setStats] = useState<{
    jobName: string;
    totalRuns: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    avgDurationMs: number;
    lastRunAt: string;
    lastStatus: string;
  }[]>([]);
  const [recent, setRecent] = useState<{
    id: string;
    jobName: string;
    startedAt: string;
    finishedAt: string;
    status: string;
    result: string;
    errorMessage: string;
    durationMs: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecent, setShowRecent] = useState(false);
  const [showRegistry, setShowRegistry] = useState(false);

  useEffect(() => {
    if (loadedRef.current || batch === undefined) return;
    loadedRef.current = true;
    if (batch?.cronStats) {
      setStats(batch.cronStats.stats || []);
      setRecent(batch.cronStats.recent || []);
      setLoading(false);
      return;
    }
    fetch("/api/admin/cron-stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats || []);
        setRecent(data.recent || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batch]);

  const statsMap = new Map(stats.map((s) => [s.jobName, s]));

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cron Jobs</h3>
        <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">{CRON_REGISTRY.length} registered</span>
      </div>

      {/* Registry table — all configured crons with schedule + last status from stats */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr className="text-gray-500 dark:text-slate-400">
              <th className="text-left p-2 font-medium">Job</th>
              <th className="text-left p-2 font-medium">Schedule</th>
              <th className="text-left p-2 font-medium">Description</th>
              <th className="text-right p-2 font-medium">Runs</th>
              <th className="text-right p-2 font-medium">Rate</th>
              <th className="text-left p-2 font-medium">Last Run</th>
              <th className="text-left p-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {CRON_REGISTRY.map((cron) => {
              const s = statsMap.get(cron.name);
              return (
                <tr key={cron.name} className="border-t border-gray-100 dark:border-slate-700">
                  <td className="p-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{cron.name}</td>
                  <td className="p-2 text-gray-500 dark:text-slate-400 font-mono whitespace-nowrap">{cron.schedule}</td>
                  <td className="p-2 text-gray-500 dark:text-slate-400 max-w-52 truncate">{cron.description}</td>
                  <td className="p-2 text-right text-gray-600 dark:text-slate-300">{s ? s.totalRuns : "—"}</td>
                  <td className="p-2 text-right text-gray-600 dark:text-slate-300">{s ? `${s.successRate}%` : "—"}</td>
                  <td className="p-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    {s?.lastRunAt ? new Date(s.lastRunAt + "Z").toLocaleString() : "—"}
                  </td>
                  <td className="p-2">
                    {s?.lastStatus ? (
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        s.lastStatus === "success"
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : s.lastStatus === "error"
                            ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                            : "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                      }`}>
                        {s.lastStatus}
                      </span>
                    ) : (
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500">never</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detailed stats toggle */}
      {stats.length > 0 && (
        <button
          onClick={() => setShowRegistry(!showRegistry)}
          className="btn-secondary text-xs px-3 py-1"
        >
          {showRegistry ? "Hide" : "Show"} detailed stats
        </button>
      )}

      {showRegistry && stats.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr className="text-gray-500 dark:text-slate-400">
                <th className="text-left p-2 font-medium">Job</th>
                <th className="text-right p-2 font-medium">Runs</th>
                <th className="text-right p-2 font-medium">Success</th>
                <th className="text-right p-2 font-medium">Errors</th>
                <th className="text-right p-2 font-medium">Rate</th>
                <th className="text-right p-2 font-medium">Avg (ms)</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.jobName} className="border-t border-gray-100 dark:border-slate-700">
                  <td className="p-2 font-medium text-gray-900 dark:text-white">{s.jobName}</td>
                  <td className="p-2 text-right text-gray-600 dark:text-slate-300">{s.totalRuns}</td>
                  <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">{s.successCount}</td>
                  <td className="p-2 text-right text-red-600 dark:text-red-400">{s.errorCount}</td>
                  <td className="p-2 text-right text-gray-600 dark:text-slate-300">{s.successRate}%</td>
                  <td className="p-2 text-right text-gray-600 dark:text-slate-300">{s.avgDurationMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent executions toggle */}
      {!loading && (
        <button
          onClick={() => setShowRecent(!showRecent)}
          className="btn-secondary text-xs px-3 py-1"
        >
          {showRecent ? "Hide" : "Show"} recent executions ({recent.length})
        </button>
      )}

      {showRecent && recent.length > 0 && (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0">
              <tr className="text-gray-500 dark:text-slate-400">
                <th className="text-left p-2 font-medium">Job</th>
                <th className="text-left p-2 font-medium">Started</th>
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-right p-2 font-medium">Duration</th>
                <th className="text-left p-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-slate-700">
                  <td className="p-2 font-medium text-gray-900 dark:text-white">{r.jobName}</td>
                  <td className="p-2 text-gray-500 dark:text-slate-400">
                    {new Date(r.startedAt + "Z").toLocaleString()}
                  </td>
                  <td className="p-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      r.status === "success"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : r.status === "error"
                          ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                          : "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-2 text-right text-gray-600 dark:text-slate-300">{r.durationMs}ms</td>
                  <td className="p-2 text-gray-500 dark:text-slate-400 max-w-48 truncate">
                    {r.errorMessage || (r.result && r.result !== "{}" ? r.result : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const SENDER_COLOR_OPTIONS = [
  { value: "red", label: "Red", bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  { value: "orange", label: "Orange", bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "amber", label: "Amber", bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "emerald", label: "Green", bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { value: "blue", label: "Blue", bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "indigo", label: "Indigo", bg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  { value: "purple", label: "Purple", bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "pink", label: "Pink", bg: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
];

function getColorBg(color: string): string {
  return SENDER_COLOR_OPTIONS.find((c) => c.value === color)?.bg
    ?? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
}

function DigestSendersCard() {
  const [domains, setDomains] = useState<{ value: string; label: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("purple");

  const load = () => {
    fetch("/api/admin/digest-senders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDomains(d.domains || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async (next: typeof domains) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/digest-senders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains: next }),
      });
      const data = await res.json();
      if (data.domains) setDomains(data.domains);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleAdd = () => {
    const val = newValue.trim().toLowerCase();
    if (!val) return;
    if (domains.some((d) => d.value === val)) return;
    const next = [...domains, { value: val, label: newLabel.trim() || val, color: newColor }];
    setNewValue("");
    setNewLabel("");
    setNewColor("purple");
    save(next);
  };

  const handleRemove = (value: string) => {
    save(domains.filter((d) => d.value !== value));
  };

  return (
    <div className="card p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Digest Sender Domains</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Email addresses or domains the digest cron will accept. The Gmail query is built dynamically from this list.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 dark:text-slate-500">Loading…</p>
      ) : (
        <>
          {domains.length > 0 && (
            <div className="space-y-1.5">
              {domains.map((d) => (
                <div key={d.value} className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${getColorBg(d.color)}`}>
                    {d.label}
                  </span>
                  <span className="font-mono text-gray-700 dark:text-slate-300">{d.value}</span>
                  <button
                    onClick={() => handleRemove(d.value)}
                    className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`Remove ${d.value}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-slate-700 pt-3 space-y-2">
            <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Add sender</p>
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-slate-400 mb-0.5">Email or domain</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="user@example.com or example.com"
                  className="w-full input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-slate-400 mb-0.5">Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Display name"
                  className="w-full input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-slate-400 mb-0.5">Color</label>
                <select
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="input-field text-xs py-[7px]"
                >
                  {SENDER_COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAdd}
                disabled={saving || !newValue.trim()}
                className="btn-primary text-xs px-3 py-[7px]"
              >
                {saving ? "Saving…" : "Add"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MoatAutoGenCard() {
  const [data, setData] = useState<{
    tickers: { symbol: string; addedBy: string; addedAt: string }[];
    universeSize: number;
    screenerCount: number;
    customCount: number;
    cacheStats: { evaluated: number; stale: number; fresh: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const load = () => {
    fetch("/api/admin/moat-auto-tickers")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const symbols = input.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (symbols.length === 0) return;
    setSaving(true);
    await fetch("/api/admin/moat-auto-tickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
    }).catch(() => {});
    setInput("");
    setSaving(false);
    load();
  };

  const handleRemove = async (symbol: string) => {
    await fetch("/api/admin/moat-auto-tickers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    }).catch(() => {});
    load();
  };

  const handleTrigger = async () => {
    setTriggering(true);
    await fetch("/api/cron/moat-sync", {
      headers: process.env.NEXT_PUBLIC_CRON_SECRET
        ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` }
        : {},
    }).catch(() => {});
    setTriggering(false);
    setTimeout(load, 2000);
  };

  const stats = data?.cacheStats;
  const coveragePct = data ? Math.round((stats?.evaluated ?? 0) / Math.max(data.universeSize, 1) * 100) : 0;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Moat Auto-Generation</h3>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="btn-secondary text-xs px-3 py-1"
        >
          {triggering ? "Running…" : "Trigger Now"}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 dark:text-slate-500">Loading…</p>
      ) : data && stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{data.universeSize}</div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400">Universe</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.evaluated}</div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400">Evaluated</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.fresh}</div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400">Fresh (&lt;7d)</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.stale}</div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400">Stale</div>
            </div>
          </div>

          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 dark:text-slate-400">
            {coveragePct}% coverage — cron runs every 4h, 30 stocks/batch, 7-day TTL
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700 dark:text-slate-300">Add custom tickers</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="TSLA, NVDA, BRK-A…"
                className="flex-1 input-field text-xs"
              />
              <button
                onClick={handleAdd}
                disabled={saving || !input.trim()}
                className="btn-primary text-xs px-3 py-1"
              >
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>

          {data.tickers.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700 dark:text-slate-300">
                Custom tickers ({data.tickers.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.tickers.map((t) => (
                  <span
                    key={t.symbol}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                  >
                    {t.symbol}
                    <button
                      onClick={() => handleRemove(t.symbol)}
                      className="hover:text-red-500 transition-colors"
                      aria-label={`Remove ${t.symbol}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-red-500">Failed to load</p>
      )}
    </div>
  );
}

export default function SettingsTab() {
  const [batch, setBatch] = useState<BatchSettingsData | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then(setBatch)
      .catch(() => setBatch(null));
  }, []);

  return (
    <BatchSettingsContext.Provider value={batch}>
      <div className="space-y-6">
        <AiModelConfigCard />
        <ExternalServicesCard />
        <PromoBannerCard />
        <UtmTaxonomyCard />
        <SupportChatConfigCard />
        <GaConfigCard />
        <AdConfigCard />
        <StripePricesCard />
        <CapacityCard />
        <DigestSendersCard />
        <CronJobsCard />
        <MoatAutoGenCard />
        <MetricsCard />
        <ApiKeyCard
          title="Resend API Key"
          description="This key is stored encrypted and enables email delivery for price alerts and email verification. Get a key at resend.com."
          endpoint="/api/admin/resend-key"
          placeholder="Enter Resend API key (re_...)"
        />
        <XKeysCard />

        {/* Developer Tools */}
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Developer Tools</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Architecture reference for every feature domain — components, API routes, libraries, patterns, and tech stack.
              </p>
            </div>
            <a
              href="/developer"
              className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Open Developer Page
            </a>
          </div>
        </div>
      </div>
    </BatchSettingsContext.Provider>
  );
}
