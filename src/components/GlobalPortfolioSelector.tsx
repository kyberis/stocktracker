"use client";

import { useState, useRef, useEffect } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { getPortfolioLimit } from "@/lib/subscription";
import { SUPPORTED_PORTFOLIO_CURRENCIES } from "@/lib/db/helpers";

const CURRENCY_SELECT_OPTIONS = SUPPORTED_PORTFOLIO_CURRENCIES;

export default function GlobalPortfolioSelector() {
  const { portfolios, activePortfolioId, setActivePortfolio, refreshPortfolios } = usePortfolio();
  const { user } = useAuth();
  const { t } = useI18n();
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

  if (portfolios.length === 0) return null;

  const activeName = activePortfolioId
    ? portfolios.find((p) => p.id === activePortfolioId)?.name ?? t("portfolio")
    : t("allPortfolios");

  const activeCurrency = activePortfolioId
    ? portfolios.find((p) => p.id === activePortfolioId)?.currency ?? "EUR"
    : null;

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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium transition-colors max-w-[200px] ${
          dropdownOpen
            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30"
            : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent"
        }`}
        aria-haspopup="listbox"
        aria-expanded={dropdownOpen}
      >
        <svg className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <span className="truncate">{activeName}</span>
        {activeCurrency && (
          <span className="shrink-0 text-[9px] font-bold tracking-wide px-1 py-px rounded bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            {activeCurrency}
          </span>
        )}
        <svg className={`w-3 h-3 shrink-0 text-gray-400 dark:text-slate-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1 overflow-hidden" role="listbox">
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
                <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-slate-500">{p.currency ?? "EUR"}</span>
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

          <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
          {canCreate ? (
            showCreate ? (
              <div className="px-3 py-2 space-y-2">
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
                  className="text-sm w-full px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  maxLength={50}
                />
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
  );
}
