"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import TierFeatureBadge from "./TierFeatureBadge";
import { useTheme } from "@/lib/theme-context";
import type { DashboardTab } from "@/lib/use-dashboard-tab-url";
import DashboardTabBarQuickLinks, { type DashboardTabBarQuickVariant } from "./DashboardTabBarQuickLinks";
import GlobalPortfolioSelector from "./GlobalPortfolioSelector";

function AddMenu({ onAddStock, onAddCrypto, onAddAsset }: { onAddStock: () => void; onAddCrypto?: () => void; onAddAsset?: () => void }) {
  const { t } = useI18n();
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
        <div className="glass-overlay absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[18px] border border-[color:var(--border)] py-1 shadow-2xl">
          <button
            onClick={() => { onAddStock(); setOpen(false); }}
            className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-soft)]"
          >
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            {t("addStock")}
          </button>
          {onAddCrypto && (
            <button
              onClick={() => { onAddCrypto(); setOpen(false); }}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-soft)]"
            >
              <span className="w-4 h-4 rounded-full bg-[#f7931a] flex items-center justify-center text-white text-[10px] font-bold shrink-0">₿</span>
              {t("addCrypto")}
              <TierFeatureBadge requiredPlan="pro" size="xs" className="ml-auto" />
            </button>
          )}
          {onAddAsset && (
            <button
              onClick={() => { onAddAsset(); setOpen(false); }}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-soft)]"
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

export interface DashboardToolbarQuickNavProps {
  /** Null when not on the home or demo dashboard (no tab highlight). */
  activeTab: DashboardTab | null;
  onSelectTab: (tab: DashboardTab) => void;
  holdingsCount: number;
}

interface DashboardToolbarProps {
  onAddStock: () => void;
  onAddCrypto?: () => void;
  onAddAsset?: () => void;
  onOpenSettings: () => void;
  onImportPortfolio?: () => void;
  onResetPortfolio?: () => void;
  /** Desktop dashboard shortcuts (Holdings, Tools, Views, …); when set, renders in this bar next to Sync / Add. */
  quickNav?: DashboardToolbarQuickNavProps;
}

export default function DashboardToolbar({
  onAddStock,
  onAddCrypto,
  onAddAsset,
  onOpenSettings,
  onResetPortfolio,
  quickNav,
}: DashboardToolbarProps) {
  const router = useRouter();
  const { isLoading, refreshQuotes } = usePortfolio();
  const { t } = useI18n();
  const { layoutTheme } = useTheme();

  const quickNavVariant: DashboardTabBarQuickVariant =
    layoutTheme === "terminal"
      ? "terminal"
      : layoutTheme === "canvas"
        ? "canvas"
        : layoutTheme === "studio"
          ? "studio"
          : "default";

  const tabbarTestId =
    layoutTheme === "terminal"
      ? "tabbar-terminal"
      : layoutTheme === "canvas"
        ? "tabbar-canvas"
        : layoutTheme === "studio"
          ? "tabbar-studio"
          : "tabbar-default";

  return (
    <div
      className={
        layoutTheme === "terminal"
          ? "border-b border-zinc-800 bg-transparent"
          : "border-b border-[color:var(--border)]"
      }
      style={
        layoutTheme === "terminal"
          ? undefined
          : {
              background: "var(--nav-bg)",
              boxShadow: "none",
            }
      }
      data-testid="dashboard-toolbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 py-2 sm:gap-x-3 ${quickNav ? "justify-between" : "justify-end"}`}
        >
          {quickNav && (
            <div className="flex min-w-0 flex-1 basis-0 items-center gap-2 sm:gap-3">
              {layoutTheme !== "studio" && (
                <div className="shrink-0" data-tour="portfolio-switcher">
                  <GlobalPortfolioSelector />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <DashboardTabBarQuickLinks
                  variant={quickNavVariant}
                  activeTab={quickNav.activeTab}
                  onSelectTab={quickNav.onSelectTab}
                  holdingsCount={quickNav.holdingsCount}
                  dataTestId={tabbarTestId}
                  dataTour="tabs"
                />
              </div>
            </div>
          )}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5" data-tour="actions">
          <button
            onClick={onOpenSettings}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-2 text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-highlight)] sm:min-h-[44px] sm:min-w-[44px]"
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
            className="flex min-h-[40px] items-center gap-1 rounded-xl border border-[color:var(--border)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-highlight)] disabled:opacity-50 sm:min-h-[44px] sm:gap-1.5 sm:px-3 sm:text-sm"
            style={{ background: "var(--surface-soft)" }}
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
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-2 text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-highlight)] sm:min-h-[44px] sm:min-w-[44px]"
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
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-2 text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-highlight)] sm:min-h-[44px] sm:min-w-[44px]"
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
    </div>
  );
}
