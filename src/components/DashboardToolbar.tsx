"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import TierFeatureBadge from "./TierFeatureBadge";
import { useTheme } from "@/lib/theme-context";

function AddMenu({ onAddStock, onAddCrypto, onAddAsset }: { onAddStock: () => void; onAddCrypto?: () => void; onAddAsset?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
              <TierFeatureBadge requiredPlan="pro" size="xs" className="ml-auto" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatDateAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isStale(date: Date): boolean {
  return Date.now() - date.getTime() > 30 * 60 * 1000;
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
  const { isLoading, refreshQuotes, lastUpdated, holdingsLastFetchedAt } = usePortfolio();
  const { t } = useI18n();
  const { layoutTheme } = useTheme();

  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const quotesStale = useMemo(() => lastUpdated ? isStale(lastUpdated) : false, [lastUpdated]);
  const holdingsStale = useMemo(() => holdingsLastFetchedAt ? isStale(holdingsLastFetchedAt) : false, [holdingsLastFetchedAt]);

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
          {(lastUpdated || holdingsLastFetchedAt) && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] shrink-0">
              {lastUpdated && (
                <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-slate-500 font-mono">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${quotesStale ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <span className="text-gray-400 dark:text-slate-600">{t("quotesAsOf")}</span>
                  <span className={quotesStale ? "text-amber-400" : ""}>{`${String(lastUpdated.getHours()).padStart(2, "0")}:${String(lastUpdated.getMinutes()).padStart(2, "0")}`}</span>
                </span>
              )}
              {lastUpdated && holdingsLastFetchedAt && (
                <span className="w-px h-3 bg-gray-200 dark:bg-slate-700 shrink-0" aria-hidden="true" />
              )}
              {holdingsLastFetchedAt && (
                <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-slate-500 font-mono">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${holdingsStale ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <span className="text-gray-400 dark:text-slate-600">{t("holdingsSynced")}</span>
                  <span className={holdingsStale ? "text-amber-400" : ""}>{formatDateAgo(holdingsLastFetchedAt)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5" data-tour="actions">
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-black/5 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-slate-300"
            title={t("syncButton")}
            aria-label={t("syncButton")}
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
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
            <span className="hidden sm:inline">{isLoading ? t("syncButtonSyncing") : t("syncButton")}</span>
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
