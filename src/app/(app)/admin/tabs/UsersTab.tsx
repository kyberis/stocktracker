"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminUser, relativeTime, formatEur } from "../shared";

/* ── Users Tab ────────────────────────────────────────────── */

type SortKey = "username" | "authProvider" | "plan" | "holdingCount" | "totalHoldingsEur" | "lastActiveAt" | "createdAt";
type SortDir = "asc" | "desc";

function AuthBadge({ provider }: { provider: string }) {
  if (provider === "google") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400">G Google</span>;
  }
  if (provider === "apple") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 text-slate-300"> Apple</span>;
  }
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400">Credentials</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "pro") return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500">Trefolio</span>;
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400">Folio</span>;
}

function BrokerBadges({ accounts, imports }: { accounts: string; imports: string }) {
  const all = new Set<string>();
  if (accounts) accounts.split(", ").forEach((b) => all.add(b));
  if (imports) imports.split(", ").forEach((b) => all.add(b));
  if (all.size === 0) return <span className="text-gray-400 dark:text-slate-600">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from(all).map((b) => (
        <span key={b} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300">{b}</span>
      ))}
    </div>
  );
}

function SortHeader({ label, sortKey, currentKey, dir, onSort }: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className="text-left p-3 font-medium text-[11px] uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-900 dark:hover:text-white transition-colors"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className={`ml-1 text-[10px] ${active ? "text-indigo-500" : "opacity-40"}`}>
        {active ? (dir === "asc" ? "▲" : "▼") : "▼"}
      </span>
    </th>
  );
}

const PAGE_SIZE = 25;

export default function UsersTab() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterAuth, setFilterAuth] = useState<string>("all");
  const [filterImport, setFilterImport] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = await meRes.json();
      if (!meRes.ok || meData.user?.role !== "admin") {
        router.replace("/");
        return;
      }
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sortKey,
        sortDir,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterPlan !== "all") params.set("filterPlan", filterPlan);
      if (filterAuth !== "all") params.set("filterAuth", filterAuth);
      if (filterImport !== "all") params.set("filterImport", filterImport);

      const usersRes = await fetch(`/api/admin/users/detail?${params}`, { cache: "no-store" });
      const usersData = await usersRes.json();
      if (!usersRes.ok) { setError(usersData.error || "Failed to load users."); return; }
      setUsers(usersData.users || []);
      setTotal(usersData.total ?? 0);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [router, page, debouncedSearch, sortKey, sortDir, filterPlan, filterAuth, filterImport]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
    setPage(0);
  };

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && users.length === 0) return <p className="text-gray-500 dark:text-slate-400">Loading users...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input
            type="text"
            placeholder="Search by username, email, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg"
          />
        </div>
        <select value={filterPlan} onChange={handleFilterChange(setFilterPlan)} className="text-xs px-3 py-2 rounded-lg">
          <option value="all">All Plans</option>
          <option value="free">Folio (free)</option>
          <option value="pro">Trefolio (pro)</option>
        </select>
        <select value={filterAuth} onChange={handleFilterChange(setFilterAuth)} className="text-xs px-3 py-2 rounded-lg">
          <option value="all">All Auth</option>
          <option value="credentials">Credentials</option>
          <option value="google">Google</option>
          <option value="apple">Apple</option>
        </select>
        <select value={filterImport} onChange={handleFilterChange(setFilterImport)} className="text-xs px-3 py-2 rounded-lg">
          <option value="all">All Import Status</option>
          <option value="imported">Has Imported</option>
          <option value="not-imported">Not Imported</option>
        </select>
        <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">
          {total} user{total !== 1 ? "s" : ""} total
          {loading && <span className="ml-1 text-indigo-400">Loading...</span>}
        </span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr className="text-gray-500 dark:text-slate-400">
                <th className="w-8 p-3" />
                <SortHeader label="User" sortKey="username" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Auth" sortKey="authProvider" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Plan" sortKey="plan" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="text-left p-3 font-medium text-[11px] uppercase tracking-wide">Email</th>
                <SortHeader label="Holdings" sortKey="holdingCount" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Portfolio Value" sortKey="totalHoldingsEur" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="text-left p-3 font-medium text-[11px] uppercase tracking-wide">Brokers</th>
                <th className="text-left p-3 font-medium text-[11px] uppercase tracking-wide">Imported</th>
                <SortHeader label="Last Active" sortKey="lastActiveAt" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Created" sortKey="createdAt" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const hasImported = !!(user.brokerAccounts || user.brokerImports);
                const isInactive = user.lastActiveAt && (Date.now() - new Date(user.lastActiveAt).getTime() > 30 * 86400000);
                return (
                  <tr
                    key={user.id}
                    className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-200 align-middle cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/20"
                    onClick={() => router.push(`/admin/users/${encodeURIComponent(user.id)}`)}
                  >
                    <td className="p-3">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6" /></svg>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900 dark:text-white">{user.username}</div>
                      {user.displayName && <div className="text-[11px] text-gray-500 dark:text-slate-400">{user.displayName}</div>}
                      {user.email && <div className="text-[11px] text-gray-400 dark:text-slate-500">{user.email}</div>}
                    </td>
                    <td className="p-3"><AuthBadge provider={user.authProvider} /></td>
                    <td className="p-3"><PlanBadge plan={user.plan} /></td>
                    <td className="p-3">{user.emailVerified ? <span className="text-emerald-500">✓</span> : <span className="text-gray-300 dark:text-slate-600">✗</span>}</td>
                    <td className="p-3 tabular-nums font-semibold">{user.holdingCount}</td>
                    <td className="p-3 tabular-nums">
                      {user.totalHoldingsEur > 0
                        ? <span className="text-emerald-500 font-semibold">{formatEur(user.totalHoldingsEur)}</span>
                        : <span className="text-gray-400 dark:text-slate-600">€0</span>}
                    </td>
                    <td className="p-3"><BrokerBadges accounts={user.brokerAccounts} imports={user.brokerImports} /></td>
                    <td className="p-3">
                      {hasImported
                        ? <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500">Imported</span>
                        : <span className="text-[11px] text-gray-400 dark:text-slate-600">Not imported</span>}
                    </td>
                    <td className={`p-3 text-xs whitespace-nowrap ${isInactive ? "text-amber-500" : "text-gray-500 dark:text-slate-400"}`}>
                      {relativeTime(user.lastActiveAt)}
                    </td>
                    <td className="p-3 text-gray-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && !loading && (
                <tr><td colSpan={11} className="p-8 text-center text-gray-400 dark:text-slate-500">No users match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="text-xs px-3 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500 dark:text-slate-400 tabular-nums">
              Page {page + 1} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs px-3 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
