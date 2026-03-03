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
  email: string;
  displayName: string;
  mustChangePassword: boolean;
  createdAt: string;
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
}

type Tab = "users" | "settings" | "analytics";

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

      {data.eventsByType.length === 0 && data.topStocks.length === 0 && activityData.length === 0 && (
        <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-8">
          No analytics data yet. Events will appear as users interact with the app.
        </p>
      )}
    </div>
  );
}

/* ── Settings Tab ─────────────────────────────────────────── */

function SettingsTab() {
  const [maskedKey, setMaskedKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/api-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setHasKey(d.hasKey);
        setMaskedKey(d.maskedKey || "");
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/api-key", {
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
    const res = await fetch("/api/admin/api-key", {
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
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Alpha Vantage API Key</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
          This key is stored encrypted and shared with all users. It enables the Alpha Vantage data provider for financial statements, company overviews, and economic indicators.
        </p>

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
              placeholder="Enter Alpha Vantage API key"
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
          {(["users", "settings", "analytics"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              {t === "users" ? "Users" : t === "settings" ? "Settings" : "Analytics"}
            </button>
          ))}
        </div>

        {tab === "users" ? <UsersTab /> : tab === "settings" ? <SettingsTab /> : <AnalyticsTab />}
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
