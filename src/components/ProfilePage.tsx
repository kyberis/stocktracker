"use client";

import { useState, useEffect, useRef, useCallback, useMemo, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useIsNative } from "@/lib/use-native";
import ProCompareCard from "@/components/ProCompareCard";
import TierIcon from "@/components/TierIcon";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import { Smartphone, Monitor, Copy, Check, Trash2, User, CreditCard, Bell, FolderOpen } from "lucide-react";
import NotificationChannels from "@/components/NotificationChannels";
import { COUNTRIES } from "@/lib/countries";

const PROFILE_TABS = ["account", "subscription", "notifications", "portfolios", "devices"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

const TAB_ICONS: Record<ProfileTab, typeof User> = {
  account: User,
  subscription: CreditCard,
  notifications: Bell,
  portfolios: FolderOpen,
  devices: Monitor,
};

const TAB_LABEL_KEYS: Record<ProfileTab, string> = {
  account: "profileTabAccount",
  subscription: "profileTabSubscription",
  notifications: "profileTabNotifications",
  portfolios: "profileTabPortfolios",
  devices: "profileTabDevices",
};

interface PasskeyEntry {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
  deviceType: string;
  backedUp: boolean;
}

function TaxResidencyPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const selected = useMemo(() => COUNTRIES.find((c) => c.code === value), [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && value && listRef.current) {
      const el = listRef.current.querySelector(`[data-code="${value}"]`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [open, value]);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("profileTaxResidency")}</label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-slate-500 transition-colors"
      >
        {selected ? (
          <>
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-gray-400 dark:text-slate-500">{t("profileTaxResidencyNone")}</span>
        )}
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t("profileTaxResidencyHint")}</p>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-slate-700">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("profileSearchCountry")}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                autoFocus
              />
            </div>
          </div>
          <div ref={listRef} className="max-h-48 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              >
                &times; {t("profileTaxResidencyNone")}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-3">No results</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  data-code={c.code}
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors ${
                    value === c.code
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  {value === c.code && (
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PortfolioShareSection() {
  const { t } = useI18n();
  const [share, setShare] = useState<{ token: string; isActive: boolean; showValues: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/portfolio/share")
      .then((r) => r.ok ? r.json() : { share: null })
      .then((d) => { setShare(d.share); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const shareUrl = share?.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${share.token}`
    : "";

  async function handleGenerate() {
    setSaving(true);
    const res = await fetch("/api/portfolio/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ showValues: false }) });
    if (res.ok) {
      const d = await res.json();
      setShare({ token: d.token, isActive: true, showValues: false });
    }
    setSaving(false);
  }

  async function handleRevoke() {
    setSaving(true);
    await fetch("/api/portfolio/share", { method: "DELETE" });
    setShare(null);
    setSaving(false);
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="text-sm text-gray-400 dark:text-slate-500">{t("loading")}</div>;

  return (
    <div className="space-y-3">
      {share?.isActive ? (
        <>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 text-xs bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 font-mono text-gray-700 dark:text-slate-300 select-all"
              aria-label={t("shareUrl")}
            />
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
              aria-label={t("copyLink")}
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              )}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-40"
            >
              {t("regenerateLink")}
            </button>
            <button
              onClick={handleRevoke}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-40"
            >
              {t("revokeLink")}
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-40"
        >
          {t("generateShareLink")}
        </button>
      )}
    </div>
  );
}

function PortfolioAlertSection() {
  const { t } = useI18n();
  const { alertsEnabled } = useSettings();
  const [portfolioAlert, setPortfolioAlert] = useState<{ id: string; percentValue: number; active: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [threshold, setThreshold] = useState("5");

  useEffect(() => {
    if (!alertsEnabled) { setLoading(false); return; }
    fetch("/api/alerts")
      .then((r) => r.ok ? r.json() : { alerts: [] })
      .then((data) => {
        const existing = (data.alerts ?? []).find(
          (a: { isPortfolioWide: boolean; alertType: string; active: boolean }) =>
            a.isPortfolioWide && a.alertType === "percent_change" && a.active
        );
        if (existing) {
          setPortfolioAlert({ id: existing.id, percentValue: existing.percentValue, active: existing.active });
          setThreshold(String(existing.percentValue));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [alertsEnabled]);

  if (!alertsEnabled) return null;

  const handleEnable = async () => {
    const pct = parseFloat(threshold);
    if (isNaN(pct) || pct <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: "",
          name: "",
          condition: "above",
          alertType: "percent_change",
          percentBasis: "daily",
          percentValue: pct,
          isPortfolioWide: true,
          source: "profile",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPortfolioAlert({ id: data.alert.id, percentValue: pct, active: true });
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDisable = async () => {
    if (!portfolioAlert) return;
    setSaving(true);
    try {
      await fetch(`/api/alerts?id=${portfolioAlert.id}`, { method: "DELETE" });
      setPortfolioAlert(null);
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("portfolioAlert")}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("portfolioAlertDesc")}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 dark:text-slate-500">{t("loading")}</div>
      ) : portfolioAlert ? (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t("portfolioAlertEnabled")}</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
              {t("portfolioAlertThreshold")} ±{portfolioAlert.percentValue}%
            </p>
          </div>
          <button
            onClick={handleDisable}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-40"
          >
            {t("disablePortfolioAlert")}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-slate-400">±</span>
          <input
            type="number"
            step="0.5"
            min="0.1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-20 text-sm"
            aria-label={t("portfolioAlertThreshold")}
          />
          <span className="text-sm text-gray-500 dark:text-slate-400">%</span>
          <button
            onClick={handleEnable}
            disabled={saving || !threshold}
            className="btn-primary text-xs whitespace-nowrap disabled:opacity-40"
          >
            {saving ? t("loading") : t("enablePortfolioAlert")}
          </button>
        </div>
      )}
    </div>
  );
}

function PortfolioManagementSection() {
  const { t } = useI18n();
  const { user, refreshUser } = useAuth();
  const [portfolios, setPortfolios] = useState<{ id: string; name: string; isDefault: boolean; currency?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCurrency, setNewCurrency] = useState<"EUR" | "USD">("EUR");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [devicePortfolioId, setDevicePortfolioId] = useState(user?.devicePortfolioId || "");

  const isPro = user?.plan === "pro";
  const limit = isPro ? 3 : 1;
  const isOverLimit = portfolios.length > limit;

  const fetchPortfolios = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolios");
      if (res.ok) {
        const data = await res.json();
        setPortfolios(data.portfolios || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPortfolios(); }, [fetchPortfolios]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), currency: newCurrency }),
      });
      if (res.ok) {
        setNewName("");
        setNewCurrency("EUR");
        await fetchPortfolios();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to create portfolio");
      }
    } catch { setError("Failed to create portfolio"); }
    setCreating(false);
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/portfolios/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditName("");
        await fetchPortfolios();
      }
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this portfolio? All its holdings and transactions will be moved to your default portfolio.")) return;
    try {
      const res = await fetch(`/api/portfolios/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) await fetchPortfolios();
    } catch { /* ignore */ }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/portfolios/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) await fetchPortfolios();
    } catch { /* ignore */ }
  }

  async function handleDevicePortfolioChange(portfolioId: string) {
    setDevicePortfolioId(portfolioId);
    try {
      await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devicePortfolioId: portfolioId }),
      });
      await refreshUser();
    } catch { /* ignore */ }
  }

  if (loading) return <div className="text-sm text-gray-400 dark:text-slate-500">{t("loading")}</div>;

  return (
    <div className="space-y-4">
      {/* Portfolio list */}
      <div className="space-y-2">
        {portfolios.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
            {editingId === p.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(p.id); if (e.key === "Escape") setEditingId(null); }}
                  className="text-sm flex-1"
                  autoFocus
                />
                <button onClick={() => handleRename(p.id)} className="btn-primary text-xs px-2 py-1">{t("save")}</button>
                <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-2 py-1">{t("cancel")}</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-slate-400 font-medium">
                    {p.currency ?? "EUR"}
                  </span>
                  {p.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium">
                      Default
                    </span>
                  )}
                  {isOverLimit && !p.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
                      Read-only
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!(isOverLimit && !p.isDefault) && (
                    <button
                      onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                      className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    >
                      Rename
                    </button>
                  )}
                  {!p.isDefault && (
                    <>
                      {!(isOverLimit && !p.isDefault) && (
                        <button
                          onClick={() => handleSetDefault(p.id)}
                          className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Create new portfolio */}
      {isPro && portfolios.length < limit && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              placeholder="New portfolio name"
              className="text-sm flex-1"
              maxLength={50}
            />
            <div className="flex items-center gap-0 rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden shrink-0">
              {(["EUR", "USD"] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setNewCurrency(cur)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    newCurrency === cur
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {cur === "EUR" ? "\u20AC EUR" : "$ USD"}
                </button>
              ))}
            </div>
            <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn-primary text-sm disabled:opacity-40">
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {!isPro && portfolios.length >= limit && (
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Upgrade to Trefolio to create up to 5 portfolios.
        </p>
      )}

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

      {/* Device & Widget portfolio selector */}
      {portfolios.length > 1 && (
        <div className="pt-3 border-t border-gray-200 dark:border-slate-700 space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Device & Widget Portfolio
          </label>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Choose which portfolio your widget and trefolio Leaf show. Leave on &quot;All Portfolios&quot; for a combined view.
          </p>
          <select
            value={devicePortfolioId}
            onChange={(e) => handleDevicePortfolioChange(e.target.value)}
            className="text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 w-full focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">All Portfolios</option>
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const { deviceEnabled } = useSettings();
  const { t, language } = useI18n();

  const sectionParam = searchParams.get("section") as ProfileTab | null;
  const initialTab = sectionParam && PROFILE_TABS.includes(sectionParam) ? sectionParam : "account";
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const effectiveTab = activeTab === "devices" && !deviceEnabled ? "account" : activeTab;

  const handleTabChange = useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
    router.replace(`/profile?section=${tab}`, { scroll: false });
  }, [router]);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [taxResidency, setTaxResidency] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  
  

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [verifyingSending, setVerifyingSending] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyError, setVerifyError] = useState("");

  const [billingSync, setBillingSync] = useState<"idle" | "syncing" | "done" | "timeout">("idle");
  const billingSyncRan = useRef(false);
  const [deviceGrantLoading, setDeviceGrantLoading] = useState(false);

  const [unlinking, setUnlinking] = useState(false);
  const [googleMsg, setGoogleMsg] = useState("");
  const [googleError, setGoogleError] = useState("");

  const [widgetHasToken, setWidgetHasToken] = useState(false);
  const [widgetToken, setWidgetToken] = useState("");
  const [widgetCopied, setWidgetCopied] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(false);

  const [deviceHasPasskey, setDeviceHasPasskey] = useState(false);
  const [deviceLinked, setDeviceLinked] = useState(false);
  const [devicePasskey, setDevicePasskey] = useState("");
  const [deviceCopied, setDeviceCopied] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceTemplate, setDeviceTemplate] = useState("classic-dark");
  const [templateSaving, setTemplateSaving] = useState(false);

  const [passkeys, setPasskeys] = useState<PasskeyEntry[]>([]);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMsg, setPasskeyMsg] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const returnedFromCheckout = searchParams.get("billing") === "success";
  const emailJustVerified = searchParams.get("emailVerified") === "true";
  const googleJustLinked = searchParams.get("googleLinked") === "true";
  const linkError = searchParams.get("linkError");
  const needsSync = user && user.plan === "free";

  useEffect(() => {
    if (!needsSync) return;
    if (billingSyncRan.current) return;
    billingSyncRan.current = true;

    let cancelled = false;
    const sync = async () => {
      setBillingSync("syncing");
      try {
        const res = await fetch("/api/billing/sync", { method: "POST" });
        const data = await res.json().catch(() => null);
        if (!cancelled && data?.plan === "pro") {
          await refreshUser();
          setBillingSync("done");
          return;
        }
      } catch { /* fall through to polling when returning from checkout */ }

      if (!returnedFromCheckout) {
        if (!cancelled) setBillingSync("idle");
        return;
      }

      const MAX_POLLS = 5;
      const POLL_MS = 2000;
      for (let i = 0; i < MAX_POLLS && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        await refreshUser();
        const fresh = await fetch("/api/auth/me", { cache: "no-store" });
        const me = await fresh.json().catch(() => null);
        if (me?.user?.plan === "pro" || me?.user?.plan === "starter") {
          if (!cancelled) setBillingSync("done");
          return;
        }
      }
      if (!cancelled) setBillingSync("timeout");
    };
    sync();
    return () => { cancelled = true; };
  }, [needsSync, returnedFromCheckout, refreshUser]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      setAvatarUrl(user.avatarUrl || "");
      setTaxResidency(user.taxResidency || "");
    }
  }, [user]);

  useEffect(() => {
    fetch("/api/widget-token")
      .then((r) => r.json())
      .then((d) => setWidgetHasToken(!!d.hasToken))
      .catch(() => {});
    fetch("/api/device-passkey")
      .then((r) => r.json())
      .then((d) => {
        setDeviceHasPasskey(!!d.hasPasskey);
        setDeviceLinked(!!d.deviceLinked);
      })
      .catch(() => {});
    fetch("/api/device-passkey/template")
      .then((r) => r.json())
      .then((d) => { if (d.templateId) setDeviceTemplate(d.templateId); })
      .catch(() => {});
  }, []);

  const fetchPasskeys = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/passkey/list");
      if (res.ok) {
        const data = await res.json();
        setPasskeys(data.passkeys || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleAddPasskey = useCallback(async () => {
    setPasskeyLoading(true);
    setPasskeyMsg("");
    setPasskeyError("");
    try {
      const optRes = await fetch("/api/auth/passkey/register-options", { method: "POST" });
      if (!optRes.ok) throw new Error("Failed to get options");
      const options = await optRes.json();

      const credential = await startRegistration(options);

      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => null);
        setPasskeyError(data?.error || t("passkeyRegistrationFailed"));
      } else {
        setPasskeyMsg(t("passkeyAdded"));
        setTimeout(() => setPasskeyMsg(""), 4000);
        await fetchPasskeys();
        await refreshUser();
      }
    } catch {
      setPasskeyError(t("passkeyRegistrationFailed"));
    }
    setPasskeyLoading(false);
  }, [fetchPasskeys, refreshUser, t]);

  const handleRemovePasskey = useCallback(async (id: string) => {
    if (!confirm(t("confirmRemovePasskey"))) return;
    setPasskeyMsg("");
    setPasskeyError("");
    try {
      const res = await fetch(`/api/auth/passkey/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setPasskeyMsg(t("passkeyRemoved"));
        setTimeout(() => setPasskeyMsg(""), 4000);
        await fetchPasskeys();
        await refreshUser();
      }
    } catch {
      setPasskeyError("Failed to remove passkey.");
    }
  }, [fetchPasskeys, refreshUser, t]);

  const handleRenamePasskey = useCallback(async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/auth/passkey/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setRenamingId(null);
        setRenameValue("");
        setPasskeyMsg(t("passkeyRenamed"));
        setTimeout(() => setPasskeyMsg(""), 4000);
        await fetchPasskeys();
      }
    } catch { /* ignore */ }
  }, [renameValue, fetchPasskeys, t]);

  const handleGenerateToken = useCallback(async () => {
    setWidgetLoading(true);
    try {
      const res = await fetch("/api/widget-token", { method: "POST" });
      const data = await res.json();
      if (data.token) {
        setWidgetToken(data.token);
        setWidgetHasToken(true);
      }
    } catch { /* ignore */ }
    setWidgetLoading(false);
  }, []);

  const handleRevokeToken = useCallback(async () => {
    setWidgetLoading(true);
    try {
      await fetch("/api/widget-token", { method: "DELETE" });
      setWidgetHasToken(false);
      setWidgetToken("");
    } catch { /* ignore */ }
    setWidgetLoading(false);
  }, []);

  const handleCopyToken = useCallback(() => {
    navigator.clipboard.writeText(widgetToken);
    setWidgetCopied(true);
    setTimeout(() => setWidgetCopied(false), 2000);
  }, [widgetToken]);

  const handleGenerateDevicePasskey = useCallback(async () => {
    setDeviceLoading(true);
    try {
      const res = await fetch("/api/device-passkey", { method: "POST" });
      const data = await res.json();
      if (data.passkey) {
        setDevicePasskey(data.passkey);
        setDeviceHasPasskey(true);
      }
    } catch { /* ignore */ }
    setDeviceLoading(false);
  }, []);

  const handleRevokeDevicePasskey = useCallback(async () => {
    setDeviceLoading(true);
    try {
      await fetch("/api/device-passkey", { method: "DELETE" });
      setDeviceHasPasskey(false);
      setDevicePasskey("");
    } catch { /* ignore */ }
    setDeviceLoading(false);
  }, []);

  const handleCopyDevicePasskey = useCallback(() => {
    navigator.clipboard.writeText(devicePasskey);
    setDeviceCopied(true);
    setTimeout(() => setDeviceCopied(false), 2000);
  }, [devicePasskey]);

  const handleChangeTemplate = useCallback(async (newTemplate: string) => {
    setTemplateSaving(true);
    try {
      const res = await fetch("/api/device-passkey/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: newTemplate }),
      });
      if (res.ok) setDeviceTemplate(newTemplate);
    } catch { /* ignore */ }
    setTemplateSaving(false);
  }, []);

  useEffect(() => {
    if (emailJustVerified) {
      refreshUser();
      setVerifyMsg(t("emailVerified"));
    }
  }, [emailJustVerified, refreshUser, t]);

  useEffect(() => {
    if (googleJustLinked) {
      refreshUser();
      setGoogleMsg(t("googleLinkedSuccess"));
      setTimeout(() => setGoogleMsg(""), 5000);
    }
    if (linkError) {
      setGoogleError(linkError);
    }
  }, [googleJustLinked, linkError, refreshUser, t]);

  const handleSaveProfile = async () => {
    setProfileError("");
    setProfileSaved(false);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, avatarUrl, taxResidency: taxResidency || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setProfileError(data?.error || "Failed to save profile.");
        return;
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      refreshUser();
    } catch {
      setProfileError("Network error.");
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordError("");

    if (newPassword.length < 4) {
      setPasswordError("Password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPasswordError(data?.error || "Failed to change password.");
        return;
      }
      setPasswordMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setPasswordMsg(""), 3000);
    } catch {
      setPasswordError("Network error.");
    }
  };

  const handleUnlinkGoogle = async () => {
    setGoogleMsg("");
    setGoogleError("");
    setUnlinking(true);
    try {
      const res = await fetch("/api/auth/google/unlink", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setGoogleError(data?.error || t("googleLinkError"));
        setUnlinking(false);
        return;
      }
      await refreshUser();
      setUnlinking(false);
    } catch {
      setGoogleError("Network error.");
      setUnlinking(false);
    }
  };

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    setDeleteError("");
    if (!deletePassword) {
      setDeleteError(t("deleteAccountPasswordRequired"));
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error || t("deleteAccountError"));
        setDeleting(false);
        return;
      }
      window.location.href = "/login";
    } catch {
      setDeleteError(t("deleteAccountError"));
      setDeleting(false);
    }
  };

  const initials = (displayName || user?.username || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isPro = user?.plan === "pro";
  const isStarter = user?.plan === "starter";
  const isPaid = isPro || isStarter;
  const deviceProEligible = user?.deviceProEligible ?? false;

  const handleActivateDeviceGrant = useCallback(async () => {
    setDeviceGrantLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "annual", deviceGrant: true }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch { /* ignore */ }
    setDeviceGrantLoading(false);
  }, []);
  const aiLimit = 5;

  const visibleTabs = deviceEnabled
    ? PROFILE_TABS
    : PROFILE_TABS.filter((tab) => tab !== "devices");

  return (
    <main className="px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profile")}</h1>

        {/* Tab navigation */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <div role="tablist" aria-label={t("profile")} className="flex flex-wrap gap-1 bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-gray-200 dark:border-slate-700 shadow-sm">
            {visibleTabs.map((tab) => {
              const Icon = TAB_ICONS[tab];
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={effectiveTab === tab}
                  aria-controls={`profile-tabpanel-${tab}`}
                  onClick={() => handleTabChange(tab)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all ${
                    effectiveTab === tab
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t(TAB_LABEL_KEYS[tab] as TranslationKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* === Account Tab === */}
        {effectiveTab === "account" && <>
        {/* Profile Card */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("profileSettings")}</h2>

          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-slate-600"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold">
                {initials}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {user?.role === "admin" ? t("roleAdmin") : t("roleUser")}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("displayName")}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("displayNamePlaceholder")}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("avatarUrl")}</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder={t("avatarUrlPlaceholder")}
                className="w-full text-sm"
              />
            </div>
            <TaxResidencyPicker
              value={taxResidency}
              onChange={setTaxResidency}
            />
          </div>

          {profileError && (
            <p className="text-xs text-red-500 dark:text-red-400" role="alert">{profileError}</p>
          )}

          <div className="flex justify-end">
            <button onClick={handleSaveProfile} className="btn-primary text-sm">
              {profileSaved ? t("profileSaved") : t("saveProfile")}
            </button>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("connectedAccounts")}</h2>

          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Google</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {user?.googleLinked ? t("googleConnected") : t("googleNotConnected")}
              </p>
            </div>
            {user?.googleLinked ? (
              <button
                onClick={handleUnlinkGoogle}
                disabled={unlinking || user?.authProvider === "google"}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                {unlinking ? t("loading") : t("disconnectGoogle")}
              </button>
            ) : user?.email ? (
              <a
                href="/api/auth/google?intent=link"
                className="btn-primary text-xs whitespace-nowrap"
              >
                {t("connectGoogle")}
              </a>
            ) : (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t("setEmailFirst")}</p>
            )}
          </div>

          {googleMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400" aria-live="polite">{googleMsg}</p>}
          {googleError && <p className="text-xs text-red-500 dark:text-red-400" role="alert">{googleError}</p>}
        </div>

        {/* Passkeys */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("passkeys")}</h2>
            {passkeySupported && (
              <button
                onClick={handleAddPasskey}
                disabled={passkeyLoading}
                className="btn-primary text-xs"
              >
                {passkeyLoading ? t("loading") : t("addPasskey")}
              </button>
            )}
          </div>

          {!passkeySupported && (
            <p className="text-xs text-gray-400 dark:text-slate-500">{t("passkeyNotSupported")}</p>
          )}

          {passkeySupported && passkeys.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-slate-400">{t("noPasskeys")}</p>
          )}

          {passkeys.map((pk) => (
            <div key={pk.id} className="flex items-center gap-3 py-2 border-t border-gray-100 dark:border-slate-700/50">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 11a4 4 0 1 0-2.68 3.77" />
                  <path d="M12.68 14.77L11 23l2.5-1.5L16 23l-1.32-5.23" />
                  <circle cx="15" cy="7" r="1" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {renamingId === pk.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenamePasskey(pk.id); if (e.key === "Escape") setRenamingId(null); }}
                      className="text-sm w-full"
                      autoFocus
                      placeholder={t("passkeyNamePlaceholder")}
                    />
                    <button onClick={() => handleRenamePasskey(pk.id)} className="btn-primary text-xs px-2 py-1">{t("save")}</button>
                    <button onClick={() => setRenamingId(null)} className="btn-secondary text-xs px-2 py-1">{t("cancel")}</button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{pk.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {t("passkeyLastUsed")}: {pk.lastUsedAt ? new Date(pk.lastUsedAt).toLocaleDateString() : t("passkeyNeverUsed")}
                    </p>
                  </>
                )}
              </div>
              {renamingId !== pk.id && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setRenamingId(pk.id); setRenameValue(pk.name); }}
                    className="btn-secondary text-xs px-2 py-1"
                  >
                    {t("renamePasskey")}
                  </button>
                  <button
                    onClick={() => handleRemovePasskey(pk.id)}
                    className="btn-secondary text-xs px-2 py-1 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                  >
                    {t("removePasskey")}
                  </button>
                </div>
              )}
            </div>
          ))}

          {passkeyMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400" aria-live="polite">{passkeyMsg}</p>}
          {passkeyError && <p className="text-xs text-red-500 dark:text-red-400" role="alert">{passkeyError}</p>}
        </div>

        {/* Change Password -- hidden for Google-only accounts */}
        {user?.authProvider !== "google" && (
          <div className="card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("changePasswordSection")}</h2>

            <form onSubmit={handleChangePassword} className="grid gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("currentPassword")}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("newPassword")}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("confirmPassword")}</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full text-sm"
                  required
                />
              </div>

              {passwordError && (
                <p className="text-xs text-red-500 dark:text-red-400" role="alert">{passwordError}</p>
              )}
              {passwordMsg && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400" aria-live="polite">{passwordMsg}</p>
              )}

              <div className="flex justify-end">
                <button type="submit" className="btn-primary text-sm">
                  {t("updatePassword")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Account */}
        {/* Security — last activity */}
        <div className="card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("profileSecurityTitle") || "Security"}</h2>
          <div className="flex items-center gap-3 text-sm">
            <svg className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <div>
              <span className="text-gray-500 dark:text-slate-400">{t("profileLastActive") || "Last active"}:</span>{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {user?.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : "—"}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500">{t("profileLastActiveHint") || "If you don't recognize this activity, change your password immediately."}</p>
        </div>

        {user?.role !== "admin" && (
          <div className="card p-6 space-y-4 border-red-200 dark:border-red-500/20">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">{t("deleteAccount")}</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">{t("deleteAccountWarning")}</p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-danger text-sm"
              >
                {t("deleteAccountButton")}
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount} className="space-y-3">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{t("deleteAccountConfirm")}</p>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("deleteAccountEnterPassword")}</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full text-sm"
                    autoFocus
                    required
                  />
                </div>
                {deleteError && (
                  <p className="text-xs text-red-500 dark:text-red-400" role="alert">{deleteError}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={deleting || !deletePassword}
                    className="btn-danger text-sm disabled:opacity-40"
                  >
                    {deleting ? t("deleteAccountDeleting") : t("deleteAccountConfirmButton")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteError(""); }}
                    className="btn-secondary text-sm"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        </>}

        {/* === Subscription Tab === */}
        {effectiveTab === "subscription" && <>
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("subscription")}</h2>

          {billingSync === "syncing" && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("billingVerifying")}</p>
            </div>
          )}
          {billingSync === "done" && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("billingVerified")}</p>
            </div>
          )}
          {billingSync === "timeout" && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-700 dark:text-amber-300">{t("billingVerifyTimeout")}</p>
            </div>
          )}

          {deviceProEligible && (
            <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Your device includes 1 year of Pro
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                    Activate your free year now. A payment method is required but you won&apos;t be charged for 12 months.
                  </p>
                </div>
              </div>
              <button
                onClick={handleActivateDeviceGrant}
                disabled={deviceGrantLoading}
                className="btn-primary text-sm w-full disabled:opacity-40"
              >
                {deviceGrantLoading ? "Redirecting to checkout..." : "Activate Free Year"}
              </button>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 dark:border-slate-600 p-4 bg-gray-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                <TierIcon plan={isPro ? "pro" : isStarter ? "starter" : "free"} size={16} />
                {isPro ? t("planPro") : isStarter ? t("planStarter") : t("planFree")}
              </p>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                isPro
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : isStarter
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                    : "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200"
              }`}>
                {isPro ? t("proBadge") : isStarter ? t("starterBadge") : t("freeBadge")}
              </span>
            </div>
          </div>
          {(() => {
            const expiresAt = user?.planExpiresAt;
            if (!expiresAt || !isPaid) return null;
            const expiryDate = new Date(expiresAt);
            if (expiryDate <= new Date()) return null;
            const formatted = expiryDate.toLocaleDateString(language, { year: "numeric", month: "long", day: "numeric" });
            return (
              <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t("planActiveUntil")} <span className="font-semibold">{formatted}</span>
                </p>
              </div>
            );
          })()}
          {isPaid ? (
            <a
              href="/api/billing/portal"
              className="btn-secondary text-sm inline-flex items-center gap-2 w-full justify-center"
            >
              {t("manageSubscription")}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          ) : (
            <ProCompareCard
              surface="profile_always_on"
              reason="upgrade_required"
              aiUsage={{ used: user?.aiCallsThisMonth ?? 0, limit: aiLimit }}
            />
          )}
        </div>
        </>}

        {/* === Notifications Tab === */}
        {effectiveTab === "notifications" && <>
        {/* Email Verification */}
        <div className="card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("notificationSettings")}</h2>

          {user?.emailVerified ? (
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t("emailVerified")}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("emailVerifiedDesc")}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t("emailNotVerified")}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("emailNotVerifiedDesc")}</p>
              </div>
              <button
                disabled={verifyingSending || !user?.email}
                onClick={async () => {
                  setVerifyingSending(true);
                  setVerifyMsg("");
                  setVerifyError("");
                  try {
                    const res = await fetch("/api/auth/verify-email", { method: "POST" });
                    if (res.ok) {
                      setVerifyMsg(t("verificationEmailSent"));
                    } else {
                      const data = await res.json().catch(() => null);
                      setVerifyError(data?.error || "Failed to send.");
                    }
                  } catch {
                    setVerifyError("Network error.");
                  }
                  setVerifyingSending(false);
                }}
                className="btn-primary text-xs whitespace-nowrap disabled:opacity-40"
              >
                {verifyingSending ? t("loading") : t("sendVerificationEmail")}
              </button>
            </div>
          )}
          {verifyMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400" aria-live="polite">{verifyMsg}</p>}
          {verifyError && <p className="text-xs text-red-500 dark:text-red-400" role="alert">{verifyError}</p>}
        </div>

        {/* Notification Channels */}
        <NotificationChannels />

        {/* Portfolio-wide Alert */}
        <PortfolioAlertSection />
        </>}

        {/* === Portfolios Tab === */}
        {effectiveTab === "portfolios" && <>
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Portfolios</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Manage your portfolios. Pro users can create up to 5 portfolios.
          </p>
          <PortfolioManagementSection />
        </div>

        {/* Portfolio Sharing */}
        {isPaid ? (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">{t("portfolioSharing")} <TierFeatureBadge requiredPlan="starter" size="sm" /></h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t("portfolioSharingDesc")}</p>
            <PortfolioShareSection />
          </div>
        ) : (
          <div className="card p-6 space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("portfolioSharing")}</h2>
            <ProCompareCard surface="portfolio_history_locked" reason="upgrade_required" compact />
          </div>
        )}
        </>}

        {/* === Devices Tab === */}
        {effectiveTab === "devices" && <>
        {/* Widget Access */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Widget Access</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Use a token to connect home screen widgets
              </p>
            </div>
          </div>

          {widgetToken ? (
            <div className="space-y-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Copy this token now &mdash; it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-lg font-mono break-all">
                  {widgetToken}
                </code>
                <button
                  onClick={handleCopyToken}
                  className="btn-secondary p-2 shrink-0"
                  aria-label="Copy token"
                >
                  {widgetCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <a
                href={`/widget/setup?token=${encodeURIComponent(widgetToken)}`}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View setup instructions &rarr;
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {widgetHasToken && (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  A widget token is active. Generate a new one to replace it, or revoke it.
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateToken}
                  disabled={widgetLoading}
                  className="btn-primary text-sm disabled:opacity-40"
                >
                  {widgetLoading ? "Generating..." : widgetHasToken ? "Regenerate Token" : "Generate Token"}
                </button>
                {widgetHasToken && (
                  <button
                    onClick={handleRevokeToken}
                    disabled={widgetLoading}
                    className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Revoke
                  </button>
                )}
              </div>
              <a
                href="/widget/setup"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-block"
              >
                View setup instructions &rarr;
              </a>
            </div>
          )}
        </div>

        {/* Device Passkey (trefolio Leaf) */}
        {deviceEnabled && <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">Device Passkey <TierFeatureBadge requiredPlan="pro" size="sm" /></h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Connect your trefolio Leaf display
              </p>
            </div>
          </div>

          {devicePasskey ? (
            <div className="space-y-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Copy this passkey now &mdash; it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-2xl tracking-[0.25em] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-3 rounded-lg font-mono text-center">
                  {devicePasskey}
                </code>
                <button
                  onClick={handleCopyDevicePasskey}
                  className="btn-secondary p-2 shrink-0"
                  aria-label="Copy passkey"
                >
                  {deviceCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Enter this code on your device to link it to your account.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deviceHasPasskey && (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  A device passkey is active. Generate a new one to replace it, or revoke it.
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateDevicePasskey}
                  disabled={deviceLoading}
                  className="btn-primary text-sm disabled:opacity-40"
                >
                  {deviceLoading ? "Generating..." : deviceHasPasskey ? "Regenerate Passkey" : "Generate Passkey"}
                </button>
                {deviceHasPasskey && (
                  <button
                    onClick={handleRevokeDevicePasskey}
                    disabled={deviceLoading}
                    className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Revoke
                  </button>
                )}
              </div>
            </div>
          )}
        </div>}

        {/* Device Display Theme */}
        {deviceEnabled && deviceLinked && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Device Display Theme</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Choose how your trefolio Leaf display looks
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "classic-dark", name: "Classic Dark", colors: ["#0f172a", "#1e293b", "#10b981"], pro: false },
                { id: "wall-street", name: "Wall Street", colors: ["#000000", "#111111", "#f59e0b"], pro: true },
                { id: "minimal-light", name: "Minimal Light", colors: ["#f8fafc", "#ffffff", "#059669"], pro: true },
                { id: "midnight-green", name: "Midnight Green", colors: ["#042f2e", "#064e3b", "#6ee7b7"], pro: true },
              ].map((theme) => {
                const isSelected = deviceTemplate === theme.id;
                const isLocked = theme.pro && user?.plan !== "pro";
                return (
                  <button
                    key={theme.id}
                    onClick={() => !isLocked && handleChangeTemplate(theme.id)}
                    disabled={templateSaving || isLocked}
                    className={`relative p-3 rounded-xl border-2 transition-all text-left disabled:opacity-50 ${
                      isSelected
                        ? "border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      {theme.colors.map((c, i) => (
                        <div key={i} className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">{theme.name}</p>
                    {theme.pro && (
                      <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">
                        Pro
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute bottom-1.5 right-1.5 text-emerald-500">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Theme change takes effect on your device within 5 minutes.
            </p>
          </div>
        )}
        </>}

      </div>

      <SignOutSection />
    </main>
  );
}

function SignOutSection() {
  const { logout } = useAuth();
  const { t } = useI18n();
  const isNative = useIsNative();
  const router = useRouter();

  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

  if (!isNative) return null;

  return (
    <div className="mt-8 px-4 pb-6">
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        {t("signOut") || "Sign Out"}
      </button>
    </div>
  );
}
