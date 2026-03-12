"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { getPortfolioLimit } from "@/lib/subscription";
import TierFeatureBadge from "./TierFeatureBadge";
import { useTheme } from "@/lib/theme-context";
import { useSettings } from "@/lib/settings-context";
import { SUPPORTED_PORTFOLIO_CURRENCIES } from "@/lib/db/helpers";

const CURRENCY_SELECT_OPTIONS = SUPPORTED_PORTFOLIO_CURRENCIES;

function AddMenu({ onAddStock, onAddCrypto, onAddAsset }: { onAddStock: () => void; onAddCrypto?: () => void; onAddAsset?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isPro = user?.plan === "pro";

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const showDropdown = !!onAddCrypto || !!onAddAsset;

  if (!showDropdown) {
    return (
      <button onClick={onAddStock} className="btn-primary text-sm flex items-center gap-1.5 py-1.5" aria-label={t("addStock")}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">{t("addStock")}</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-primary text-sm flex items-center gap-1.5 py-1.5"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">{t("addAsset")}</span>
        <svg className={`w-3 h-3 ml-0.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          <button
            onClick={() => { onAddStock(); setOpen(false); }}
            className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            {t("addStock")}
          </button>
          {onAddCrypto && (
            <button
              onClick={() => { onAddCrypto(); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="w-4 h-4 rounded-full bg-[#f7931a] flex items-center justify-center text-white text-[10px] font-bold shrink-0">₿</span>
              {t("addCrypto")}
              <TierFeatureBadge requiredPlan="pro" size="xs" className="ml-auto" />
            </button>
          )}
          {onAddAsset && (
            <button
              onClick={() => { onAddAsset(); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center text-sm shrink-0">🏠</span>
              {t("addManualAsset")}
              <TierFeatureBadge requiredPlan="starter" size="xs" className="ml-auto" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface DashboardToolbarProps {
  onAddStock: () => void;
  onAddCrypto?: () => void;
  onAddAsset?: () => void;
  onOpenSettings: () => void;
  onImportPortfolio?: () => void;
  onResetPortfolio?: () => void;
}

export default function DashboardToolbar({
  onAddStock,
  onAddCrypto,
  onAddAsset,
  onOpenSettings,
  onResetPortfolio,
}: DashboardToolbarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isLoading, refreshQuotes, lastUpdated, portfolios, activePortfolioId, setActivePortfolio, refreshPortfolios } = usePortfolio();
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const { defaultCurrency } = useSettings();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCurrency, setNewCurrency] = useState(defaultCurrency);
  const [creating, setCreating] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const plan = user?.plan ?? "free";
  const limit = getPortfolioLimit(plan);
  const canCreate = portfolios.length < limit;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setShowCreate(false);
        setNewName("");
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (showCreate && inputRef.current) inputRef.current.focus();
  }, [showCreate]);

  const activeName = activePortfolioId
    ? portfolios.find((p) => p.id === activePortfolioId)?.name ?? t("portfolio")
    : t("allPortfolios");

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), currency: newCurrency }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewName("");
        setNewCurrency(defaultCurrency);
        setShowCreate(false);
        await refreshPortfolios();
        if (data.portfolio?.id) setActivePortfolio(data.portfolio.id);
      }
    } catch { /* ignore */ }
    setCreating(false);
  }

  async function handleCurrencyChange(portfolioId: string, currency: string) {
    try {
      const res = await fetch(`/api/portfolios/${encodeURIComponent(portfolioId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      if (res.ok) await refreshPortfolios();
    } catch { /* ignore */ }
  }

  async function handleSetDefault(id: string) {
    setSettingDefault(id);
    try {
      const res = await fetch(`/api/portfolios/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        await refreshPortfolios();
        setActivePortfolio(id);
        setDropdownOpen(false);
      }
    } catch { /* ignore */ }
    setSettingDefault(null);
  }

  return (
    <div className={
      layoutTheme === "terminal"
        ? "border-b border-zinc-800 bg-transparent"
        : layoutTheme === "canvas"
        ? "bg-white border-b border-slate-200"
        : layoutTheme === "studio"
        ? "border-b border-white/5 bg-transparent"
        : "bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800"
    } data-testid="dashboard-toolbar">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 ${layoutTheme === "terminal" ? "py-1.5" : "py-2"}`}>
        <div className="flex items-center gap-2 min-w-0">
          {/* Portfolio switcher */}
          {portfolios.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors max-w-[200px]"
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
              >
                <svg className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <span className="truncate">{activeName}</span>
                <svg className={`w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-slate-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1 overflow-hidden" role="listbox">
                  {/* All Portfolios option */}
                  {portfolios.length > 1 && (
                    <button
                      role="option"
                      aria-selected={!activePortfolioId}
                      onClick={() => { setActivePortfolio(null); setDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        !activePortfolioId
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                          : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                      </svg>
                      {t("allPortfolios")}
                    </button>
                  )}

                  {portfolios.length > 1 && (
                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                  )}

                  {/* Individual portfolios */}
                  {portfolios.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center transition-colors ${
                        activePortfolioId === p.id
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <button
                        role="option"
                        aria-selected={activePortfolioId === p.id}
                        onClick={() => { setActivePortfolio(p.id); setDropdownOpen(false); }}
                        className={`flex-1 text-left px-3 py-2 text-sm flex items-center gap-2 min-w-0 ${
                          activePortfolioId === p.id
                            ? "text-blue-700 dark:text-blue-300 font-medium"
                            : "text-gray-700 dark:text-slate-300"
                        }`}
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                        <span className="truncate">{p.name}</span>
                        {activePortfolioId === p.id ? (
                          <select
                            value={p.currency ?? "EUR"}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); handleCurrencyChange(p.id, e.target.value); }}
                            className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-slate-500 bg-transparent border-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 rounded py-0 pr-3 appearance-none"
                            aria-label={t("currency")}
                          >
                            {CURRENCY_SELECT_OPTIONS.map((cur) => (
                              <option key={cur} value={cur}>{cur}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-slate-500">{p.currency ?? "EUR"}</span>
                        )}
                      </button>
                      {p.isDefault ? (
                        <span className="pr-3 shrink-0" title={t("setAsDefault")} aria-label={t("setAsDefault")}>
                          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSetDefault(p.id); }}
                          disabled={settingDefault === p.id}
                          className="pr-3 pl-1 shrink-0 text-gray-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-400 transition-colors disabled:opacity-40"
                          title={t("setAsDefault")}
                          aria-label={`${t("setAsDefault")}: ${p.name}`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Create new portfolio */}
                  <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                  {canCreate ? (
                    showCreate ? (
                      <div className="px-3 py-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            ref={inputRef}
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreate();
                              if (e.key === "Escape") { setShowCreate(false); setNewName(""); }
                            }}
                            placeholder={t("newPortfolio")}
                            className="text-sm flex-1 min-w-0 px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            maxLength={50}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <select
                            value={newCurrency}
                            onChange={(e) => setNewCurrency(e.target.value)}
                            className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {CURRENCY_SELECT_OPTIONS.map((cur) => (
                              <option key={cur} value={cur}>{cur}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleCreate}
                            disabled={creating || !newName.trim()}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-40 whitespace-nowrap"
                          >
                            {creating ? t("creatingPortfolio") : t("createPortfolio")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCreate(true)}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t("createPortfolio")}
                      </button>
                    )
                  ) : (
                    <p className="px-3 py-2 text-xs text-gray-400 dark:text-slate-500">
                      {t("portfolioLimitReached")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {lastUpdated && (
            <span className="hidden sm:inline text-[11px] text-gray-500 dark:text-slate-500 truncate">
              {t("lastUpdated")}: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            title={t("settings")}
            aria-label={t("settings")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button
            onClick={refreshQuotes}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors disabled:opacity-50 min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Refresh"
            aria-label="Refresh"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <button
            onClick={() => router.push("/import")}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            title={t("importPortfolio")}
            aria-label={t("importPortfolio")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </button>

          {onResetPortfolio && (
            <button
              onClick={onResetPortfolio}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={t("resetPortfolio")}
              aria-label={t("resetPortfolio")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}

          <AddMenu onAddStock={onAddStock} onAddCrypto={onAddCrypto} onAddAsset={onAddAsset} />
        </div>
      </div>
    </div>
  );
}
