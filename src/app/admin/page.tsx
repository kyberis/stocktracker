"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "@/lib/theme-context";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

interface AdminUser {
  id: string;
  username: string;
  role: "admin" | "user";
  plan: "free" | "pro";
  email: string;
  displayName: string;
  mustChangePassword: boolean;
  createdAt: string;
}

interface LandingAnalytics {
  totalPageViews: number;
  totalCtaClicks: number;
  eventsByType: { event: string; count: number }[];
  ctaBreakdown: { cta: string; count: number }[];
  dailyViews: { date: string; views: number }[];
}

interface AnalyticsSummary {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalEvents: number;
  eventsByType: { event: string; count: number }[];
  topStocks: { ticker: string; views: number }[];
  dailyActivity: { date: string; users: number; events: number }[];
  signupsByDay: { date: string; count: number }[];
  landing: LandingAnalytics;
}

type Tab = "users" | "settings" | "analytics" | "feedback";

/* ── Summary Card ─────────────────────────────────────────── */

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

/* ── Analytics Tab ────────────────────────────────────────── */

function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p className="text-gray-500 dark:text-slate-400">Loading analytics...</p>;
  if (!data) return <p className="text-red-500">Failed to load analytics.</p>;

  const activityData = data.dailyActivity.map((d) => ({
    date: d.date.slice(5),
    users: d.users,
    events: d.events,
  }));

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              days === d
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={data.totalUsers} />
        <StatCard label="Active (7d)" value={data.activeUsers7d} />
        <StatCard label="Active (30d)" value={data.activeUsers30d} />
        <StatCard label="Events" value={data.totalEvents} />
      </div>

      {/* Daily activity chart */}
      {activityData.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Daily Activity</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="users" name="Active Users" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="events" name="Events" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Events by type */}
        {data.eventsByType.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Events by Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.eventsByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
                <YAxis dataKey="event" type="category" tick={{ fontSize: 11 }} width={110} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top stocks */}
        {data.topStocks.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Top Viewed Stocks</h3>
            <div className="space-y-2">
              {data.topStocks.map((s, i) => (
                <div key={s.ticker} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-slate-200">
                    <span className="text-gray-400 dark:text-slate-500 mr-2">{i + 1}.</span>
                    {s.ticker}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{s.views}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signups over time */}
      {data.signupsByDay.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Signups</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.signupsByDay.map((d) => ({ date: d.date.slice(5), count: d.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" name="Signups" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Landing Page Analytics ── */}
      {data.landing && (data.landing.totalPageViews > 0 || data.landing.totalCtaClicks > 0) && (
        <>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-8 mb-4">Landing Page</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Page Views" value={data.landing.totalPageViews} />
            <StatCard label="CTA Clicks" value={data.landing.totalCtaClicks} />
            <StatCard
              label="Conversion Rate"
              value={
                data.landing.totalPageViews > 0
                  ? `${((data.landing.totalCtaClicks / data.landing.totalPageViews) * 100).toFixed(1)}%`
                  : "—"
              }
            />
            <StatCard label="Landing Events" value={data.landing.eventsByType.reduce((s, e) => s + e.count, 0)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.landing.dailyViews.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Landing Daily Views</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.landing.dailyViews.map((d) => ({ date: d.date.slice(5), views: d.views }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="views" name="Views" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.landing.ctaBreakdown.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">CTA Click Breakdown</h3>
                <div className="space-y-2">
                  {data.landing.ctaBreakdown.map((c, i) => (
                    <div key={c.cta} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-slate-200">
                        <span className="text-gray-400 dark:text-slate-500 mr-2">{i + 1}.</span>
                        {c.cta}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {data.eventsByType.length === 0 && data.topStocks.length === 0 && activityData.length === 0 &&
       (!data.landing || data.landing.totalPageViews === 0) && (
        <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-8">
          No analytics data yet. Events will appear as users interact with the app.
        </p>
      )}
    </div>
  );
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
  const [maskedKey, setMaskedKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(endpoint, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setHasKey(d.hasKey);
        setMaskedKey(d.maskedKey || "");
      })
      .catch(() => {});
  }, [endpoint]);

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
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [grafanaUrl, setGrafanaUrl] = useState<string | null>(null);
  const [grafanaSource, setGrafanaSource] = useState<"cloud" | "local" | "none">("none");
  const [cloudConfigured, setCloudConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/admin/grafana-url", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setGrafanaUrl(d.url || null);
        setGrafanaSource(d.source || "none");
        setCloudConfigured(d.cloudConfigured || false);
      })
      .catch(() => {});
  }, []);

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
      : `${grafanaUrl.replace(/\/$/, "")}/d/stocktracker-main/stocktracker?orgId=1&refresh=15s`
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
  provider: string;
  callCount: number;
  windowStart: string;
}

function CapacityCard() {
  const [capacity, setCapacity] = useState<CapacityData | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  if (loading) return <div className="card p-6 text-sm text-gray-500 dark:text-slate-400">Loading capacity data...</div>;

  const capPercent = capacity ? Math.round((capacity.currentCount / capacity.maxCount) * 100) : 0;
  const avEntries = rateLimits.filter((r) => r.provider === "alphavantage");
  const aiEntries = rateLimits.filter((r) => r.provider === "openai" || r.provider === "openai_import");

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

      {avEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">Alpha Vantage Usage (current window)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400">
                  <th className="pb-1 pr-4">User</th>
                  <th className="pb-1 pr-4">Calls</th>
                  <th className="pb-1">Window</th>
                </tr>
              </thead>
              <tbody>
                {avEntries.map((e) => (
                  <tr key={e.userId + e.provider} className="text-gray-700 dark:text-slate-300">
                    <td className="py-0.5 pr-4 font-mono">{e.username}</td>
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
] as const;

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
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-6">
      <ExternalServicesCard />
      <CapacityCard />
      <MetricsCard />
      <ApiKeyCard
        title="Alpha Vantage API Key"
        description="This key is stored encrypted and shared with all users. It enables the Alpha Vantage data provider for financial statements, company overviews, and economic indicators."
        endpoint="/api/admin/api-key"
        placeholder="Enter Alpha Vantage API key"
      />
      <ApiKeyCard
        title="OpenAI API Key"
        description="This key is stored encrypted and shared with all users. It enables AI-powered features such as financial analysis, stock intelligence, and portfolio import from screenshots."
        endpoint="/api/admin/openai-key"
        placeholder="Enter OpenAI API key (sk-...)"
      />
    </div>
  );
}

/* ── Users Tab (existing logic) ───────────────────────────── */

function UsersTab() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<Record<string, string>>({});
  const [roleUpdated, setRoleUpdated] = useState<string | null>(null);
  const [planUpdated, setPlanUpdated] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = await meRes.json();
      if (!meRes.ok || meData.user?.role !== "admin") {
        router.replace("/");
        return;
      }

      const usersRes = await fetch("/api/admin/users", { cache: "no-store" });
      const usersData = await usersRes.json();
      if (!usersRes.ok) {
        setError(usersData.error || "Failed to load users.");
        return;
      }
      setUsers(usersData.users || []);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePasswordReset = async (e: FormEvent, userId: string) => {
    e.preventDefault();
    const newPassword = resetPassword[userId] || "";
    if (!newPassword) return;

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newPassword }),
    });
    if (res.ok) {
      setResetPassword((prev) => ({ ...prev, [userId]: "" }));
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "setRole", role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setRoleUpdated(userId);
      setTimeout(() => setRoleUpdated(null), 2000);
    }
  };

  const handlePlanChange = async (userId: string, newPlan: "free" | "pro") => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "setPlan", plan: newPlan }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
      );
      setPlanUpdated(userId);
      setTimeout(() => setPlanUpdated(null), 2000);
    }
  };

  const handleResetData = async (userId: string, mode: "seed" | "empty") => {
    await fetch("/api/admin/reset-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mode }),
    });
  };

  const handleDelete = async (userId: string) => {
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  if (loading) return <p className="text-gray-500 dark:text-slate-400">Loading users...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr className="text-gray-500 dark:text-slate-400">
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Plan</th>
              <th className="text-left p-3 font-medium">Created</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-200 align-top">
                <td className="p-3">
                  <div className="font-medium text-gray-900 dark:text-white">{user.username}</div>
                  {user.displayName && (
                    <div className="text-xs text-gray-500 dark:text-slate-400">{user.displayName}</div>
                  )}
                  {user.email && (
                    <div className="text-xs text-gray-400 dark:text-slate-500">{user.email}</div>
                  )}
                  {user.mustChangePassword && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">Must change password</div>
                  )}
                </td>
                <td className="p-3">
                  {user.username === "admin" ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                      admin
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "user")}
                        className="text-xs px-2 py-1 rounded-lg"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                      {roleUpdated === user.id && (
                        <span className="text-xs text-emerald-500">Updated</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={user.plan}
                      onChange={(e) => handlePlanChange(user.id, e.target.value as "free" | "pro")}
                      className="text-xs px-2 py-1 rounded-lg"
                    >
                      <option value="free">free</option>
                      <option value="pro">pro</option>
                    </select>
                    {planUpdated === user.id && (
                      <span className="text-xs text-emerald-500">Updated</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-gray-500 dark:text-slate-400 text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 space-y-2">
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => handlePasswordReset(e, user.id)}
                  >
                    <input
                      type="password"
                      placeholder="New password"
                      value={resetPassword[user.id] || ""}
                      onChange={(e) =>
                        setResetPassword((prev) => ({ ...prev, [user.id]: e.target.value }))
                      }
                      className="text-xs px-2 py-1.5"
                    />
                    <button type="submit" className="btn-secondary text-xs px-2 py-1">
                      Reset pwd
                    </button>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleResetData(user.id, "seed")}
                      className="btn-secondary text-xs px-2 py-1"
                    >
                      Seed data
                    </button>
                    <button
                      onClick={() => handleResetData(user.id, "empty")}
                      className="btn-secondary text-xs px-2 py-1"
                    >
                      Empty data
                    </button>
                    {user.username !== "admin" && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn-danger text-xs px-2 py-1"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Feedback Tab ─────────────────────────────────────────── */

interface FeedbackItem {
  id: string;
  userId: string;
  username: string;
  subject: string;
  message: string;
  status: "open" | "answered" | "closed";
  adminReply: string;
  createdAt: string;
  repliedAt: string;
}

function FeedbackTab() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/feedback", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setItems(data);
          const rMap: Record<string, string> = {};
          const sMap: Record<string, string> = {};
          for (const item of data) {
            rMap[item.id] = item.adminReply || "";
            sMap[item.id] = item.status;
          }
          setReplyMap(rMap);
          setStatusMap(sMap);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleReply = async (id: string) => {
    setSendingMap((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          reply: replyMap[id] || "",
          status: statusMap[id] || "answered",
        }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, adminReply: replyMap[id] || "", status: (statusMap[id] || "answered") as FeedbackItem["status"], repliedAt: new Date().toISOString() }
              : item
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setSendingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) return <p className="text-gray-500 dark:text-slate-400">Loading...</p>;
  if (items.length === 0) return <p className="text-gray-500 dark:text-slate-400">No feedback yet.</p>;

  const statusColor = (status: string) => {
    if (status === "answered") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    if (status === "closed") return "bg-gray-100 text-gray-600 dark:bg-slate-600/30 dark:text-slate-400";
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
  };

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {item.subject}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                From <span className="font-medium">{item.username}</span> &middot;{" "}
                {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(item.status)}`}
            >
              {item.status}
            </span>
          </div>

          <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
            {item.message}
          </p>

          {/* Reply form */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-3 space-y-2">
            <textarea
              value={replyMap[item.id] ?? ""}
              onChange={(e) =>
                setReplyMap((prev) => ({ ...prev, [item.id]: e.target.value }))
              }
              placeholder="Write a reply..."
              className="w-full text-sm min-h-[60px] resize-y"
            />
            <div className="flex items-center gap-3">
              <select
                value={statusMap[item.id] ?? item.status}
                onChange={(e) =>
                  setStatusMap((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
                className="text-sm"
              >
                <option value="open">Open</option>
                <option value="answered">Answered</option>
                <option value="closed">Closed</option>
              </select>
              <button
                onClick={() => handleReply(item.id)}
                disabled={sendingMap[item.id]}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {sendingMap[item.id] ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Admin Page ──────────────────────────────────────── */

function AdminContent() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin</h1>
          <button onClick={() => router.push("/")} className="btn-secondary">
            Back
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-slate-700">
          {(["users", "settings", "analytics", "feedback"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              {t === "users" ? "Users" : t === "settings" ? "Settings" : t === "analytics" ? "Analytics" : "Feedback"}
            </button>
          ))}
        </div>

        {tab === "users" ? <UsersTab /> : tab === "settings" ? <SettingsTab /> : tab === "analytics" ? <AnalyticsTab /> : <FeedbackTab />}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <ThemeProvider>
      <AdminContent />
    </ThemeProvider>
  );
}
