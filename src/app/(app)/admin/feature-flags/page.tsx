"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";

interface Override {
  id: string;
  flag: string;
  userId: string;
  username: string;
  enabled: boolean;
  createdAt: string;
}

interface UserOption {
  id: string;
  username: string;
  email: string;
}

const FLAG_META: Record<string, { label: string; description: string; group: string }> = {
  alerts_enabled: { label: "Price Alerts", description: "Price alert creation and management", group: "Features" },
  csv_export_enabled: { label: "CSV Export", description: "Portfolio data CSV exports for Pro users", group: "Features" },
  apple_signin_enabled: { label: "Sign in with Apple", description: "Apple OAuth on login and signup pages", group: "Features" },
  device_enabled: { label: "trefolio Leaf Device", description: "Hardware device linking, themes, and OTA", group: "Features" },
  mobile_app_enabled: { label: "Mobile App Promotion", description: "Native app section on landing page", group: "Features" },
  whatsapp_enabled: { label: "WhatsApp Notifications", description: "WhatsApp alert delivery for Pro users", group: "Features" },
  support_chat_enabled: { label: "AI Support Chat", description: "AI-powered support chat for users", group: "Features" },
  tool_transactions_enabled: { label: "Transactions", description: "Transaction history tool", group: "Tools" },
  tool_dividends_enabled: { label: "Dividends", description: "Dividend summary and projections tool", group: "Tools" },
  tool_performance_enabled: { label: "Performance", description: "TTWROR, XIRR, and performance charts tool", group: "Tools" },
  tool_taxonomy_enabled: { label: "Taxonomy", description: "Sector/region/asset class breakdown tool", group: "Tools" },
  tool_rebalancing_enabled: { label: "Rebalancing", description: "Allocation targets and drift analysis tool", group: "Tools" },
  tool_accounts_enabled: { label: "Accounts", description: "Multi-account management tool", group: "Tools" },
  tool_watchlist_enabled: { label: "Watchlist", description: "Stock watchlist tracking tool", group: "Tools" },
  pro_trial_enabled: { label: "7-Day Pro Trial", description: "Card-free Pro trial invitations, activation, and dashboard countdown", group: "Features" },
  ai_report_enabled: { label: "AI Portfolio Report", description: "AI-generated portfolio score, detailed analysis page, and streaming review", group: "Features" },
  portfolio_v2_chart_enabled: { label: "Portfolio V2 Chart", description: "New portfolio value/performance chart with market sessions, buy/sell dots, benchmarks, and backfill CTA on the homepage", group: "Features" },
  social_network_enabled: { label: "Social Network", description: "Public profiles, posts, connections, feed, people search, and in-app conversations", group: "Features" },
};

export default function FeatureFlagsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { refreshFlags } = useFeatureFlagContext();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [overrideCounts, setOverrideCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [addUserId, setAddUserId] = useState("");
  const [addEnabled, setAddEnabled] = useState(true);
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  const loadFlags = useCallback(() => {
    fetch("/api/admin/feature-flags", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setFlags(data.flags ?? {});
        setOverrideCounts(data.overrideCounts ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFlags(); }, [loadFlags]);

  useEffect(() => {
    fetch("/api/admin/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setUsers((data.users ?? []).map((u: { id: string; username: string; email?: string }) => ({
        id: u.id, username: u.username, email: u.email || "",
      }))))
      .catch(() => {});
  }, []);

  const handleToggle = async (flag: string, enabled: boolean) => {
    setSaving(flag);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag, enabled }),
      });
      if (res.ok) {
        setFlags((prev) => ({ ...prev, [flag]: enabled }));
        refreshFlags();
      }
    } catch { /* keep previous state */ }
    setSaving(null);
  };

  const loadOverrides = useCallback(async (flag: string) => {
    setOverridesLoading(true);
    try {
      const res = await fetch(`/api/admin/feature-flags/overrides?flag=${flag}`, { cache: "no-store" });
      const data = await res.json();
      setOverrides(data.overrides ?? []);
    } catch { setOverrides([]); }
    setOverridesLoading(false);
  }, []);

  const handleExpand = (flag: string) => {
    if (expandedFlag === flag) {
      setExpandedFlag(null);
      setOverrides([]);
      return;
    }
    setExpandedFlag(flag);
    setAddUserId("");
    setAddEnabled(true);
    loadOverrides(flag);
  };

  const handleAddOverride = async () => {
    if (!expandedFlag || !addUserId) return;
    setAddSaving(true);
    try {
      const res = await fetch("/api/admin/feature-flags/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag: expandedFlag, userId: addUserId, enabled: addEnabled }),
      });
      if (res.ok) {
        await loadOverrides(expandedFlag);
        setOverrideCounts((prev) => ({
          ...prev,
          [expandedFlag]: (prev[expandedFlag] || 0) + (overrides.some((o) => o.userId === addUserId) ? 0 : 1),
        }));
        setAddUserId("");
        setAddEnabled(true);
        refreshFlags();
      }
    } catch { /* keep state */ }
    setAddSaving(false);
  };

  const handleRemoveOverride = async (flag: string, userId: string) => {
    try {
      const res = await fetch("/api/admin/feature-flags/overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag, userId }),
      });
      if (res.ok) {
        setOverrides((prev) => prev.filter((o) => !(o.flag === flag && o.userId === userId)));
        setOverrideCounts((prev) => ({
          ...prev,
          [flag]: Math.max(0, (prev[flag] || 0) - 1),
        }));
        refreshFlags();
      }
    } catch { /* keep state */ }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-4 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const filteredUsers = userSearch.length >= 1
    ? users.filter((u) =>
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const groups = ["Features", "Tools"] as const;

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const groupFlags = Object.entries(FLAG_META).filter(([, m]) => m.group === group);
        return (
          <div key={group} className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{group}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {group === "Features"
                ? "Enable or disable user-facing features globally, with optional per-user overrides."
                : "Show or hide individual tools on the Tools page."}
            </p>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {groupFlags.map(([flag, meta]) => {
                const enabled = flags[flag] ?? false;
                const count = overrideCounts[flag] || 0;
                const isExpanded = expandedFlag === flag;

                return (
                  <div key={flag} className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{meta.label}</p>
                          {count > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                              {count} override{count !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{meta.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExpand(flag)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-2 py-1"
                          title="Manage per-user overrides"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={saving === flag}
                          onClick={() => handleToggle(flag, !enabled)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
                          } ${saving === flag ? "opacity-50 cursor-wait" : ""}`}
                          role="switch"
                          aria-checked={enabled}
                          aria-label={`Toggle ${meta.label}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 ml-0 p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-3">
                          Per-User Overrides
                          <span className="ml-1 font-normal text-gray-500 dark:text-slate-400">
                            (override the global {enabled ? "enabled" : "disabled"} state for specific users)
                          </span>
                        </h4>

                        {overridesLoading ? (
                          <div className="h-8 w-full bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                        ) : overrides.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">No per-user overrides configured.</p>
                        ) : (
                          <div className="space-y-2 mb-3">
                            {overrides.map((o) => (
                              <div key={o.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{o.username}</span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    o.enabled
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                  }`}>
                                    {o.enabled ? "Enabled" : "Disabled"}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOverride(o.flag, o.userId)}
                                  className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors px-1"
                                  title="Remove override"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                          <div className="flex-1 relative">
                            <label className="block text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                              User
                            </label>
                            <input
                              type="text"
                              placeholder="Search by username or email..."
                              value={userSearch}
                              onChange={(e) => {
                                setUserSearch(e.target.value);
                                setAddUserId("");
                              }}
                              className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {filteredUsers.length > 0 && !addUserId && (
                              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {filteredUsers.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      setAddUserId(u.id);
                                      setUserSearch(u.username);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                  >
                                    <span className="font-medium text-gray-900 dark:text-white">{u.username}</span>
                                    {u.email && (
                                      <span className="ml-2 text-gray-400 dark:text-slate-500">{u.email}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="w-28">
                            <label className="block text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                              State
                            </label>
                            <select
                              value={addEnabled ? "enabled" : "disabled"}
                              onChange={(e) => setAddEnabled(e.target.value === "enabled")}
                              className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="enabled">Enabled</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            disabled={!addUserId || addSaving}
                            onClick={handleAddOverride}
                            className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addSaving ? "Saving..." : "Add"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
