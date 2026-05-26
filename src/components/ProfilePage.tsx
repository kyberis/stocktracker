"use client";

import { useState, useEffect, useRef, useCallback, useMemo, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useIsNative } from "@/lib/use-native";
import { trackCanonicalConversion } from "@/lib/ad-tracking";
import ProCompareCard from "@/components/ProCompareCard";
import TierIcon from "@/components/TierIcon";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import { Smartphone, Monitor, Copy, Check, Trash2, User, Users, CreditCard, Bell, FolderOpen, Gift, Share2, Eye, EyeOff, Globe } from "lucide-react";
import NotificationChannels from "@/components/NotificationChannels";
import TelegramConnectCard from "@/components/profile/TelegramConnectCard";
import { COUNTRIES } from "@/lib/countries";
import { resolveBillingPortalHref } from "@/lib/idp/config";

const PROFILE_TABS = ["account", "subscription", "notifications", "portfolios", "referrals", "social", "devices"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

const TAB_ICONS: Record<ProfileTab, typeof User> = {
  account: User,
  subscription: CreditCard,
  notifications: Bell,
  portfolios: FolderOpen,
  referrals: Gift,
  social: Users,
  devices: Monitor,
};

const TAB_LABEL_KEYS: Record<ProfileTab, string> = {
  account: "profileTabAccount",
  subscription: "profileTabSubscription",
  notifications: "profileTabNotifications",
  portfolios: "profileTabPortfolios",
  referrals: "profileTabReferrals",
  social: "profileTabSocial",
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
      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--muted)]">{t("profileTaxResidency")}</label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="flex w-full items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-left text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-highlight)]"
      >
        {selected ? (
          <>
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-[color:var(--muted)]">{t("profileTaxResidencyNone")}</span>
        )}
        <svg className={`h-4 w-4 text-[color:var(--muted)] transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <p className="mt-0.5 text-xs text-[color:var(--muted)]">{t("profileTaxResidencyHint")}</p>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-overlay)] shadow-lg">
          <div className="border-b border-[color:var(--border)] p-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("profileSearchCountry")}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] py-1.5 pl-8 pr-3 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-[color:var(--muted)]"
                autoFocus
              />
            </div>
          </div>
          <div ref={listRef} className="max-h-48 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[color:var(--muted)] hover:bg-[color:var(--surface-soft)]"
              >
                &times; {t("profileTaxResidencyNone")}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-sm text-[color:var(--muted)]">No results</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  data-code={c.code}
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors ${
                    value === c.code
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "text-[color:var(--foreground)] hover:bg-[color:var(--surface-soft)]"
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

  if (loading) return <div className="text-sm text-[color:var(--muted)]">{t("loading")}</div>;

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
    <div className="card space-y-4 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/16 bg-amber-500/12">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{t("portfolioAlert")}</h2>
          <p className="text-xs text-[color:var(--muted)]">{t("portfolioAlertDesc")}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-[color:var(--muted)]">{t("loading")}</div>
      ) : portfolioAlert ? (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/16 bg-amber-500/[0.06] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t("portfolioAlertEnabled")}</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
              {t("portfolioAlertThreshold")} ±{portfolioAlert.percentValue}%
            </p>
          </div>
          <button
            onClick={handleDisable}
            disabled={saving}
            className="rounded-xl border border-red-500/16 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-500/16 disabled:opacity-40"
          >
            {t("disablePortfolioAlert")}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm text-[color:var(--muted)]">±</span>
          <input
            type="number"
            step="0.5"
            min="0.1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-20 text-sm"
            aria-label={t("portfolioAlertThreshold")}
          />
          <span className="text-sm text-[color:var(--muted)]">%</span>
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
    if (
      !confirm(
        "Delete this portfolio permanently? All holdings, transactions, cash, chart history, alerts, and goals for this portfolio will be removed. This cannot be undone.",
      )
    )
      return;
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
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2">
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
                  <span className="truncate text-sm font-medium text-[color:var(--foreground)]">{p.name}</span>
                  <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-highlight)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--muted)]">
                    {p.currency ?? "EUR"}
                  </span>
                  {p.isDefault && (
                    <span className="rounded-full border border-emerald-500/16 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                      Default
                    </span>
                  )}
                  {isOverLimit && !p.isDefault && (
                    <span className="rounded-full border border-amber-500/16 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                      Read-only
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!(isOverLimit && !p.isDefault) && (
                    <button
                      onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                      className="text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                    >
                      Rename
                    </button>
                  )}
                  {!p.isDefault && (
                    <>
                      {!(isOverLimit && !p.isDefault) && (
                        <button
                          onClick={() => handleSetDefault(p.id)}
                          className="text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
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
            <div className="flex shrink-0 items-center gap-0 overflow-hidden rounded-xl border border-[color:var(--border)]">
              {(["EUR", "USD"] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setNewCurrency(cur)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    newCurrency === cur
                      ? "bg-blue-500 text-white"
                      : "bg-[color:var(--surface-soft)] text-[color:var(--muted)] hover:bg-[color:var(--surface-highlight)]"
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
        <p className="text-xs text-[color:var(--muted)]">
          Upgrade to Trefolio to create up to 5 portfolios.
        </p>
      )}

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

      {/* Device & Widget portfolio selector */}
      {portfolios.length > 1 && (
        <div className="space-y-2 border-t border-[color:var(--border)] pt-3">
          <label className="text-sm font-medium text-[color:var(--foreground)]">
            Device & Widget Portfolio
          </label>
          <p className="text-xs text-[color:var(--muted)]">
            Choose which portfolio the home screen widget and trefolio Leaf use. This is separate from the portfolio picker on the dashboard—each place shows totals for its own scope. Leave on &quot;All Portfolios&quot; for a combined view on device and widget.
          </p>
          <select
            value={devicePortfolioId}
            onChange={(e) => handleDevicePortfolioChange(e.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

interface SocialFormState {
  profileSlug: string;
  bio: string;
  headline: string;
  socialVisibility: "public" | "private";
  experienceLevel: string;
  sharePortfolioValue: boolean;
  shareHoldings: boolean;
  allowComments: boolean;
}

const EXPERIENCE_OPTIONS = [
  { value: "", label: "Not set", labelEs: "Sin definir" },
  { value: "beginner", label: "Beginner", labelEs: "Principiante" },
  { value: "intermediate", label: "Intermediate", labelEs: "Intermedio" },
  { value: "experienced", label: "Experienced", labelEs: "Experimentado" },
  { value: "professional", label: "Professional", labelEs: "Profesional" },
];

function SocialProfileSection() {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [slugError, setSlugError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [form, setForm] = useState<SocialFormState>({
    profileSlug: "",
    bio: "",
    headline: "",
    socialVisibility: "private",
    experienceLevel: "",
    sharePortfolioValue: false,
    shareHoldings: false,
    allowComments: true,
  });

  useEffect(() => {
    fetch("/api/social/profile")
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((p) => {
        setForm({
          profileSlug: p.profileSlug || "",
          bio: p.bio || "",
          headline: p.headline || "",
          socialVisibility: p.socialVisibility || "private",
          experienceLevel: p.experienceLevel || "",
          sharePortfolioValue: !!p.sharePortfolioValue,
          shareHoldings: !!p.shareHoldings,
          allowComments: p.allowComments !== false,
        });
        setDisplayName(p.displayName || "");
        setAvatarUrl(p.avatarUrl || "");
      })
      .catch((err) => console.error("[ProfilePage] request failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const slugValid = form.profileSlug === "" || /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(form.profileSlug);

  const handleSlugChange = (raw: string) => {
    const sanitized = raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setForm((f) => ({ ...f, profileSlug: sanitized }));
    setSlugError("");
  };

  const handleSave = async () => {
    setError("");
    setSlugError("");
    setSaved(false);

    if (form.profileSlug && !slugValid) {
      setSlugError("Slug must be 3-40 chars: lowercase letters, numbers, hyphens.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/social/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 409) setSlugError(data?.error || "Slug already taken.");
        else setError(data?.error || "Failed to save.");
        setSaving(false);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="card p-6 animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded w-full" />
      </div>
    );
  }

  const profileUrl = form.profileSlug
    ? `trefolio.app/u/${form.profileSlug}`
    : "trefolio.app/u/...";

  const initials = (displayName || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Social Profile Settings */}
      <div className="card space-y-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/16 bg-blue-500/10">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
              {language === "es" ? "Perfil Social" : "Social Profile"}
            </h2>
            <p className="text-xs text-[color:var(--muted)]">
              {language === "es" ? "Configura tu perfil público y visibilidad" : "Configure your public profile and visibility"}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {/* Profile Visibility */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--muted)]">
              {language === "es" ? "Visibilidad del perfil" : "Profile Visibility"}
            </label>
            <select
              value={form.socialVisibility}
              onChange={(e) => setForm((f) => ({ ...f, socialVisibility: e.target.value as "public" | "private" }))}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="public">{language === "es" ? "Público" : "Public"}</option>
              <option value="private">{language === "es" ? "Privado" : "Private"}</option>
            </select>
          </div>

          {/* Profile URL */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--muted)]">
              {language === "es" ? "URL del perfil" : "Profile URL"}
            </label>
            <div className="flex items-center gap-0">
              <span className="whitespace-nowrap rounded-l-xl border border-r-0 border-[color:var(--border)] bg-[color:var(--surface-highlight)] px-3 py-2 text-sm text-[color:var(--muted)]">
                trefolio.app/u/
              </span>
              <input
                type="text"
                value={form.profileSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="your-name"
                maxLength={40}
                className={`flex-1 rounded-r-xl border px-3 py-2 text-sm bg-[color:var(--surface-soft)] focus:ring-1 focus:ring-emerald-500 focus:outline-none ${
                  slugError
                    ? "border-red-300 dark:border-red-500"
                    : "border-[color:var(--border)]"
                }`}
              />
            </div>
            {slugError && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{slugError}</p>}
            {!slugError && form.profileSlug && !slugValid && (
              <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">
                {language === "es" ? "Mín. 3 caracteres: letras minúsculas, números, guiones" : "Min 3 chars: lowercase letters, numbers, hyphens"}
              </p>
            )}
          </div>

          {/* Headline */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--muted)]">
              {language === "es" ? "Titular" : "Headline"}
            </label>
            <input
              type="text"
              value={form.headline}
              onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
              placeholder={language === "es" ? "Ej: Inversor particular en ETFs" : "e.g. Long-term ETF investor"}
              maxLength={120}
              className="w-full text-sm"
            />
          </div>

          {/* Experience Level */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--muted)]">
              {language === "es" ? "Nivel de experiencia" : "Experience Level"}
            </label>
            <select
              value={form.experienceLevel}
              onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value }))}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {language === "es" ? opt.labelEs : opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--muted)]">
              {language === "es" ? "Biografía" : "Bio"}
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder={language === "es" ? "Cuéntanos sobre ti y tu enfoque de inversión..." : "Tell us about yourself and your investing approach..."}
              maxLength={500}
              rows={4}
              className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-[color:var(--muted)]"
            />
            <p className="mt-0.5 text-right text-xs text-[color:var(--muted)]">
              {form.bio.length}/500
            </p>
          </div>
        </div>

        {/* Sharing toggles */}
        <div className="space-y-3 border-t border-[color:var(--border)] pt-2">
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            {language === "es" ? "Compartir en perfil público" : "Public Profile Sharing"}
          </p>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm text-[color:var(--foreground)]">
                {language === "es" ? "Compartir valor del portafolio" : "Share Portfolio Value"}
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                {language === "es" ? "Muestra tu valor total, ganancia/pérdida y gráfico" : "Shows your total value, gain/loss, and chart"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.sharePortfolioValue}
              onClick={() => setForm((f) => ({ ...f, sharePortfolioValue: !f.sharePortfolioValue }))}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                form.sharePortfolioValue ? "bg-emerald-500" : "bg-[color:var(--surface-highlight)]"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                form.sharePortfolioValue ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm text-[color:var(--foreground)]">
                {language === "es" ? "Compartir posiciones" : "Share Holdings"}
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                {language === "es" ? "Muestra tus tickers, asignación y desglose por sector" : "Shows your tickers, allocation, and sector breakdown"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.shareHoldings}
              onClick={() => setForm((f) => ({ ...f, shareHoldings: !f.shareHoldings }))}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                form.shareHoldings ? "bg-emerald-500" : "bg-[color:var(--surface-highlight)]"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                form.shareHoldings ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm text-[color:var(--foreground)]">
                {language === "es" ? "Permitir comentarios" : "Allow Comments"}
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                {language === "es" ? "Otros usuarios pueden comentar en tus publicaciones" : "Other users can comment on your posts"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.allowComments}
              onClick={() => setForm((f) => ({ ...f, allowComments: !f.allowComments }))}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                form.allowComments ? "bg-emerald-500" : "bg-[color:var(--surface-highlight)]"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                form.allowComments ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </label>
        </div>

        {error && <p className="text-xs text-red-500 dark:text-red-400" role="alert">{error}</p>}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-40"
          >
            {saving ? t("loading") : saved ? t("profileSaved") : t("saveProfile")}
          </button>
        </div>
      </div>

      {/* Profile Preview */}
      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-highlight)]">
            {form.socialVisibility === "public" ? (
              <Eye className="w-5 h-5 text-gray-500 dark:text-slate-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-500 dark:text-slate-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
              {language === "es" ? "Vista previa del perfil" : "Profile Preview"}
            </h2>
            <p className="text-xs text-[color:var(--muted)]">
              {language === "es" ? "Así se verá tu perfil público" : "This is how your public profile will look"}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full border border-[color:var(--border)] object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                {displayName || (language === "es" ? "Tu nombre" : "Your name")}
              </p>
              {form.headline && (
                <p className="truncate text-xs text-[color:var(--muted)]">{form.headline}</p>
              )}
              {form.experienceLevel && (
                <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  form.experienceLevel === "professional"
                    ? "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300"
                    : form.experienceLevel === "experienced"
                      ? "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                      : form.experienceLevel === "intermediate"
                        ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "border border-[color:var(--border)] bg-[color:var(--surface-highlight)] text-[color:var(--muted)]"
                }`}>
                  {EXPERIENCE_OPTIONS.find((o) => o.value === form.experienceLevel)?.[language === "es" ? "labelEs" : "label"] || form.experienceLevel}
                </span>
              )}
            </div>
          </div>
          {form.bio && (
            <p className="line-clamp-3 text-xs text-[color:var(--foreground)]">{form.bio}</p>
          )}
          <p className="font-mono text-[10px] text-[color:var(--muted)]">{profileUrl}</p>
          <div className="flex items-center gap-3 text-[10px] text-[color:var(--muted)]">
            {form.sharePortfolioValue && <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {language === "es" ? "Valor visible" : "Value visible"}</span>}
            {form.shareHoldings && <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {language === "es" ? "Posiciones visibles" : "Holdings visible"}</span>}
            {!form.sharePortfolioValue && !form.shareHoldings && (
              <span>{language === "es" ? "Portafolio no compartido" : "Portfolio not shared"}</span>
            )}
          </div>
        </div>
      </div>
    </>
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
  const checkoutTrackedRef = useRef(false);
  const [deviceGrantLoading, setDeviceGrantLoading] = useState(false);

  const [refundFormOpen, setRefundFormOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundStatus, setRefundStatus] = useState<"idle" | "pending" | "submitted" | "error">("idle");
  const refundChecked = useRef(false);

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
    if (!returnedFromCheckout) return;
    if (checkoutTrackedRef.current) return;
    checkoutTrackedRef.current = true;
    trackCanonicalConversion("checkout_completed", { source: "stripe_success_url" });
  }, [returnedFromCheckout]);

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
        if (me?.user?.plan === "pro") {
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
      .catch((err) => console.error("[ProfilePage] request failed:", err));
    fetch("/api/device-passkey")
      .then((r) => r.json())
      .then((d) => {
        setDeviceHasPasskey(!!d.hasPasskey);
        setDeviceLinked(!!d.deviceLinked);
      })
      .catch((err) => console.error("[ProfilePage] request failed:", err));
    fetch("/api/device-passkey/template")
      .then((r) => r.json())
      .then((d) => { if (d.templateId) setDeviceTemplate(d.templateId); })
      .catch((err) => console.error("[ProfilePage] request failed:", err));
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
  const isPaid = isPro;
  const deviceProEligible = user?.deviceProEligible ?? false;

  const handleActivateDeviceGrant = useCallback(async () => {
    setDeviceGrantLoading(true);
    try {
      const res = await fetch("/api/billing/device-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch { /* ignore */ }
    setDeviceGrantLoading(false);
  }, []);
  const aiLimit = user?.aiTokenLimit ?? 25_000;

  useEffect(() => {
    if (refundChecked.current) return;
    if (!isPaid) return;
    refundChecked.current = true;
    fetch("/api/refund-requests")
      .then((r) => r.json())
      .then((d) => { if (d.pending) setRefundStatus("pending"); })
      .catch((err) => console.error("[ProfilePage] request failed:", err));
  }, [isPaid]);

  const handleRefundSubmit = useCallback(async () => {
    if (refundLoading || refundReason.trim().length < 10) return;
    setRefundLoading(true);
    try {
      const res = await fetch("/api/refund-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason.trim() }),
      });
      if (res.ok) {
        setRefundStatus("submitted");
        setRefundFormOpen(false);
      } else if (res.status === 409) {
        setRefundStatus("pending");
      } else {
        setRefundStatus("error");
      }
    } catch {
      setRefundStatus("error");
    } finally {
      setRefundLoading(false);
    }
  }, [refundLoading, refundReason]);

  const visibleTabs = deviceEnabled
    ? PROFILE_TABS
    : PROFILE_TABS.filter((tab) => tab !== "devices");
  const portfolioPlanLimit = isPro ? 3 : 1;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profile")}</h1>

        {/* Tab navigation */}
        <div
          className="sticky top-0 z-10 -mx-4 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6"
          style={{ background: "transparent" }}
        >
          <div className="overflow-x-auto no-scrollbar">
            <div
              role="tablist"
              aria-label={t("profile")}
              className="flex min-w-max flex-nowrap items-end gap-5 border-b border-[color:var(--border)]"
            >
              {visibleTabs.map((tab) => {
                return (
                  <button
                    key={tab}
                    id={`profile-tab-${tab}`}
                    role="tab"
                    aria-selected={effectiveTab === tab}
                    aria-controls={`profile-tabpanel-${tab}`}
                    onClick={() => handleTabChange(tab)}
                    className={`-mb-px flex min-h-11 items-center whitespace-nowrap border-b-2 px-0.5 pb-3 pt-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      effectiveTab === tab
                        ? "border-[color:var(--foreground)] text-[color:var(--foreground)]"
                        : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                    }`}
                  >
                    <span>{t(TAB_LABEL_KEYS[tab] as TranslationKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* === Account Tab === */}
        {effectiveTab === "account" && <section
          id="profile-tabpanel-account"
          role="tabpanel"
          aria-labelledby="profile-tab-account"
          className="space-y-6"
        >
        {user?.accountEditingOnIdp && user?.unifiedAccountUrl ? (
          <div className="card space-y-4 border border-emerald-500/18 bg-emerald-500/[0.06] p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("profileSettings")}</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {language === "es"
                ? "Tu nombre, foto de perfil, residencia fiscal, Google, passkeys y contraseña se gestionan en la cuenta unificada (user.trefolio.com)."
                : "Your display name, avatar URL, tax residency, Google sign-in, passkeys, and password are managed on the unified account site."}
            </p>
            <a
              href={user.unifiedAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/16 bg-emerald-500/14 px-4 py-2.5 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20"
            >
              <Globe className="w-4 h-4" aria-hidden />
              {language === "es" ? "Abrir cuenta unificada" : "Open unified account"}
            </a>
          </div>
        ) : (
          <>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{t("profileSectionIdentity")}</h2>
        </div>
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

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t("profileSectionAccess")}</h2>
        </div>
        {/* Connected Accounts */}
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{t("connectedAccounts")}</h2>

          <div className="flex items-center gap-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)]">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[color:var(--foreground)]">Google</p>
              <p className="text-xs text-[color:var(--muted)]">
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
              <p className="text-xs text-[color:var(--muted)]">{t("setEmailFirst")}</p>
            )}
          </div>

          {googleMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400" aria-live="polite">{googleMsg}</p>}
          {googleError && <p className="text-xs text-red-500 dark:text-red-400" role="alert">{googleError}</p>}
        </div>

        {/* Warren on Telegram */}
        <TelegramConnectCard />

        {/* Passkeys */}
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{t("passkeys")}</h2>
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
            <p className="text-xs text-[color:var(--muted)]">{t("passkeyNotSupported")}</p>
          )}

          {passkeySupported && passkeys.length === 0 && (
            <p className="text-sm text-[color:var(--muted)]">{t("noPasskeys")}</p>
          )}

          {passkeys.map((pk) => (
            <div key={pk.id} className="flex items-center gap-3 border-t border-[color:var(--border)] py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/16 bg-emerald-500/10">
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
                    <p className="truncate text-sm font-medium text-[color:var(--foreground)]">{pk.name}</p>
                    <p className="text-xs text-[color:var(--muted)]">
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
        </>
        )}

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{t("profileSectionActivitySecurity")}</h2>
        </div>
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
          <>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">{t("profileSectionDanger")}</h2>
          </div>
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
          </>
        )}
        </section>}

        {/* === Subscription Tab === */}
        {effectiveTab === "subscription" && <section
          id="profile-tabpanel-subscription"
          role="tabpanel"
          aria-labelledby="profile-tab-subscription"
          className="space-y-6"
        >
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
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("billingVerified")}</p>
              </div>
              <button
                onClick={() => handleTabChange("referrals")}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
              >
                <Gift className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t("referralPostCheckoutTitle")}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t("referralPostCheckoutDesc")}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
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
                <TierIcon plan={isPro ? "pro" : "free"} size={16} />
                {isPro ? t("planPro") : t("planFree")}
              </p>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                isPro
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200"
              }`}>
                {isPro ? t("proBadge") : t("freeBadge")}
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
              href={resolveBillingPortalHref()}
              target="_blank"
              rel="noopener noreferrer"
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
              aiUsage={{ used: user?.aiTokensThisMonth ?? 0, limit: aiLimit }}
            />
          )}
        </div>

        {isPaid && (
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("refundRequest")}</h3>

            {refundStatus === "submitted" && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("refundRequestSuccess")}</p>
              </div>
            )}

            {refundStatus === "pending" && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-amber-700 dark:text-amber-300">{t("refundRequestPending")}</p>
              </div>
            )}

            {refundStatus === "error" && (
              <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 p-4">
                <p className="text-sm text-red-700 dark:text-red-300">{t("refundRequestError")}</p>
              </div>
            )}

            {refundStatus === "idle" && !refundFormOpen && (
              <>
                <p className="text-sm text-gray-500 dark:text-slate-400">{t("refundRequestDescription")}</p>
                <button
                  onClick={() => setRefundFormOpen(true)}
                  className="btn-secondary text-sm w-full"
                >
                  {t("refundRequest")}
                </button>
              </>
            )}

            {refundStatus === "idle" && refundFormOpen && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-slate-400">{t("refundRequestDescription")}</p>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{t("refundRequestReason")}</span>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder={t("refundRequestReasonPlaceholder")}
                    rows={4}
                    maxLength={800}
                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefundSubmit}
                    disabled={refundLoading || refundReason.trim().length < 10}
                    className="btn-primary text-sm flex-1 disabled:opacity-40"
                  >
                    {refundLoading ? t("refundRequestSubmitting") : t("refundRequestSubmit")}
                  </button>
                  <button
                    onClick={() => { setRefundFormOpen(false); setRefundReason(""); }}
                    className="btn-secondary text-sm"
                    disabled={refundLoading}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </section>}

        {/* === Notifications Tab === */}
        {effectiveTab === "notifications" && <section
          id="profile-tabpanel-notifications"
          role="tabpanel"
          aria-labelledby="profile-tab-notifications"
          className="space-y-6"
        >
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
        </section>}

        {/* === Portfolios Tab === */}
        {effectiveTab === "portfolios" && <section
          id="profile-tabpanel-portfolios"
          role="tabpanel"
          aria-labelledby="profile-tab-portfolios"
          className="space-y-6"
        >
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Portfolios</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {t("profilePortfolioLimitBlurb").replace("{limit}", String(portfolioPlanLimit))}
          </p>
          <PortfolioManagementSection />
        </div>

        {/* Portfolio Sharing */}
        {isPaid ? (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">{t("portfolioSharing")} <TierFeatureBadge requiredPlan="pro" size="sm" /></h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t("portfolioSharingDesc")}</p>
            <PortfolioShareSection />
          </div>
        ) : (
          <div className="card p-6 space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("portfolioSharing")}</h2>
            <ProCompareCard surface="portfolio_history_locked" reason="upgrade_required" compact />
          </div>
        )}
        </section>}

        {/* === Referrals Tab === */}
        {effectiveTab === "referrals" && (
          <section
            id="profile-tabpanel-referrals"
            role="tabpanel"
            aria-labelledby="profile-tab-referrals"
            className="space-y-6"
          >
            <ReferralTab />
          </section>
        )}

        {/* === Social Tab === */}
        {effectiveTab === "social" && (
          <section
            id="profile-tabpanel-social"
            role="tabpanel"
            aria-labelledby="profile-tab-social"
            className="space-y-6"
          >
            <SocialProfileSection />
          </section>
        )}

        {/* === Devices Tab === */}
        {effectiveTab === "devices" && <section
          id="profile-tabpanel-devices"
          role="tabpanel"
          aria-labelledby="profile-tab-devices"
          className="space-y-6"
        >
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
        </section>}

      </div>

      <SignOutSection />
    </main>
  );
}

interface ReferralData {
  code: string;
  link: string;
  stats: {
    total: number;
    pending: number;
    accepted: number;
    rewarded: number;
    rejected: number;
    rewardDaysEarned: number;
    rewardDaysCap: number;
  };
}

function ReferralTab() {
  const { t } = useI18n();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    fetch("/api/referral/code")
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.error("[ProfilePage] request failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const trackReferralEvent = useCallback((event: string) => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    }).catch((err) => console.error("[ProfilePage] request failed:", err));
  }, []);

  const handleCopy = useCallback(async () => {
    if (!data?.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackReferralEvent("referral_link_copied");
    } catch {}
  }, [data?.link, trackReferralEvent]);

  const handleShare = useCallback(async () => {
    if (!data?.link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("referralShareTitle"),
          text: t("referralShareText"),
          url: data.link,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        trackReferralEvent("referral_link_shared");
      } catch {}
    } else {
      handleCopy();
    }
  }, [data?.link, t, handleCopy, trackReferralEvent]);

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full mb-3" />
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-full" />
      </div>
    );
  }

  if (!data) return null;

  const daysRemaining = data.stats.rewardDaysCap - data.stats.rewardDaysEarned;
  const progressPct = Math.min(100, (data.stats.rewardDaysEarned / data.stats.rewardDaysCap) * 100);

  return (
    <>
      {/* Referral Link Card */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
            <Gift className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("referralTitle")}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">{t("referralSubtitle")}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-slate-300">{t("referralDescription")}</p>

        {/* Link display */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 font-mono truncate select-all">
            {data.link}
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            aria-label={t("referralCopy")}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-500 dark:text-slate-400" />}
          </button>
          <button
            onClick={handleShare}
            className="shrink-0 p-2.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            aria-label={t("referralShare")}
          >
            {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats Card */}
      <div className="card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("referralStats")}</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t("referralStatTotal"), value: data.stats.total },
            { label: t("referralStatPending"), value: data.stats.pending },
            { label: t("referralStatRewarded"), value: data.stats.rewarded },
            { label: t("referralStatDaysEarned"), value: data.stats.rewardDaysEarned },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1.5">
            <span>{t("referralRewardProgress")}</span>
            <span>{data.stats.rewardDaysEarned} / {data.stats.rewardDaysCap} {t("referralDays")}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {daysRemaining > 0 && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
              {t("referralDaysRemaining").replace("{days}", String(daysRemaining))}
            </p>
          )}
        </div>
      </div>
    </>
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
