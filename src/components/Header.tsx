"use client";

import { usePortfolio } from "@/lib/portfolio-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import LanguageSwitcher from "./LanguageSwitcher";

interface HeaderProps {
  onAddStock: () => void;
  onOpenSettings: () => void;
}

export default function Header({ onAddStock, onOpenSettings }: HeaderProps) {
  const { isLoading, refreshQuotes, lastUpdated } = usePortfolio();
  const { provider, isAlphaVantage, avCallsToday, avDailyLimit } = useSettings();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const providerLabel = provider === "alphavantage" ? "Alpha Vantage" : "Yahoo";
  const usageRatio = avCallsToday / avDailyLimit;
  const usageColor =
    usageRatio >= 0.9 ? "text-red-400" : usageRatio >= 0.6 ? "text-amber-400" : "text-emerald-400";

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white">{t("appTitle")}</h1>
          <span
            className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              isAlphaVantage
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
            }`}
          >
            {providerLabel}
          </span>
          {isAlphaVantage && (
            <span
              className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 ${usageColor}`}
              title={t("apiUsageTooltip")}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {avCallsToday}/{avDailyLimit}
            </span>
          )}
          {lastUpdated && (
            <span className="hidden sm:inline text-xs text-slate-500 ml-1">
              {t("lastUpdated")}: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={t("settings")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={refreshQuotes}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button onClick={onAddStock} className="btn-primary text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">{t("addStock")}</span>
          </button>
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-800 rounded-lg px-2 py-1.5">
              <span>{user.username}</span>
              {user.role === "admin" && (
                <a href="/admin" className="text-blue-400 hover:text-blue-300">
                  {t("admin")}
                </a>
              )}
              <button onClick={() => logout()} className="text-slate-400 hover:text-slate-200">
                {t("signOut")}
              </button>
            </div>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
