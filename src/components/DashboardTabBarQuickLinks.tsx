"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { useFeatureFlag } from "@/lib/feature-flag-context";
import { useFavoriteTools } from "@/lib/favorite-tools";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import {
  TOOLS_CATALOG,
  getTierBadgeForTool,
  getToolEntry,
  getToolPath,
  type ToolCatalogEntry,
  resolveHubVisibility,
  sortTabsByHubCategory,
} from "@/lib/tools-registry";
import type { DashboardTab } from "@/lib/use-dashboard-tab-url";

export type DashboardTabBarQuickVariant = "default" | "terminal" | "canvas" | "studio";

const DASHBOARD_VIEW_TABS: {
  key: DashboardTab;
  labelKey: string;
  tierBadge?: "pro";
}[] = [
  { key: "diversification", labelKey: "diversificationTab" },
  { key: "dividends", labelKey: "dividendsTab" },
  { key: "metrics", labelKey: "performanceTab", tierBadge: "pro" },
  { key: "growth", labelKey: "growthTab", tierBadge: "pro" },
  { key: "events", labelKey: "eventsTab" },
];

function isDashboardViewTab(tab: DashboardTab): boolean {
  return DASHBOARD_VIEW_TABS.some((v) => v.key === tab);
}

function useMenuFixedPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
): { top: number; left: number; width: number } | null {
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setBox(null);
      return;
    }
    function update() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.max(220, r.width);
      const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
      setBox({ top: r.bottom + 4, left, width: w });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, triggerRef]);

  return box;
}

export default function DashboardTabBarQuickLinks({
  activeTab,
  onSelectTab,
  holdingsCount,
  variant,
  dataTestId,
  dataTour,
}: {
  activeTab: DashboardTab | null;
  onSelectTab: (tab: DashboardTab) => void;
  holdingsCount: number;
  variant: DashboardTabBarQuickVariant;
  dataTestId: string;
  dataTour?: string;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { favoriteIdsOrdered } = useFavoriteTools();
  const aiReportEnabled = useFeatureFlag("ai_report_enabled");
  const settings = useSettings();
  const {
    alertsEnabled,
    toolTransactionsEnabled,
    toolDividendsEnabled,
    toolPerformanceEnabled,
    toolTaxonomyEnabled,
    toolRebalancingEnabled,
    toolAccountsEnabled,
    toolWatchlistEnabled,
  } = settings;

  const [moreOpen, setMoreOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const viewsWrapRef = useRef<HTMLDivElement>(null);
  const viewsBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const viewsMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const viewsMenuBox = useMenuFixedPosition(viewsOpen, viewsBtnRef);
  const moreMenuBox = useMenuFixedPosition(moreOpen, moreBtnRef);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!viewsOpen) return;
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (viewsWrapRef.current?.contains(t)) return;
      if (viewsMenuRef.current?.contains(t)) return;
      setViewsOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [viewsOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (moreWrapRef.current?.contains(t)) return;
      if (moreMenuRef.current?.contains(t)) return;
      setMoreOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [moreOpen]);

  useEffect(() => {
    if (!viewsOpen && !moreOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setViewsOpen(false);
        setMoreOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewsOpen, moreOpen]);

  const visibilitySettings = useMemo(
    () => ({
      alertsEnabled,
      toolTransactionsEnabled,
      toolDividendsEnabled,
      toolPerformanceEnabled,
      toolTaxonomyEnabled,
      toolRebalancingEnabled,
      toolAccountsEnabled,
      toolWatchlistEnabled,
    }),
    [
      alertsEnabled,
      toolTransactionsEnabled,
      toolDividendsEnabled,
      toolPerformanceEnabled,
      toolTaxonomyEnabled,
      toolRebalancingEnabled,
      toolAccountsEnabled,
      toolWatchlistEnabled,
    ],
  );

  const visibleTools = useMemo(() => {
    const filtered = TOOLS_CATALOG.filter((e) =>
      resolveHubVisibility(e.id, visibilitySettings, aiReportEnabled),
    );
    return sortTabsByHubCategory(filtered);
  }, [visibilitySettings, aiReportEnabled]);

  const visibleToolIdSet = useMemo(() => new Set(visibleTools.map((e) => e.id)), [visibleTools]);

  const favoriteQuickLinks = useMemo((): ToolCatalogEntry[] => {
    return favoriteIdsOrdered
      .filter((id) => visibleToolIdSet.has(id))
      .map((id) => getToolEntry(id))
      .filter((e): e is ToolCatalogEntry => e != null);
  }, [favoriteIdsOrdered, visibleToolIdSet]);

  /** Favorites first (user order), then remaining tools in hub order — used only for the More menu. */
  const moreMenuTools = useMemo(() => {
    const favoriteIdsInMenu = favoriteIdsOrdered.filter((id) => visibleToolIdSet.has(id));
    const favSet = new Set(favoriteIdsInMenu);
    const favoriteEntries = favoriteIdsInMenu
      .map((id) => getToolEntry(id))
      .filter((e): e is ToolCatalogEntry => e != null);
    const rest = visibleTools.filter((e) => !favSet.has(e.id));
    return [...favoriteEntries, ...rest];
  }, [visibleTools, favoriteIdsOrdered, visibleToolIdSet]);

  const ctaClass = (active: boolean) => {
    if (variant === "terminal") {
      return `shrink-0 px-2.5 py-1 text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 border-b-2 ${
        active ? "border-green-500 text-green-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`;
    }
    if (variant === "canvas") {
      return `shrink-0 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-800"
      }`;
    }
    if (variant === "studio") {
      return `shrink-0 px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 border-b-2 ${
        active ? "border-emerald-400 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`;
    }
    return `shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
      active
        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/30"
        : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/80"
    }`;
  };

  const moreBtnClass =
    variant === "terminal"
      ? "shrink-0 px-2.5 py-1 text-xs font-mono transition-colors border border-zinc-700 text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
      : variant === "canvas"
        ? "shrink-0 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        : variant === "studio"
          ? "shrink-0 px-3 py-1.5 text-xs sm:text-sm font-medium border border-white/15 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          : "shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";

  const panelSurfaceClass =
    variant === "terminal"
      ? "max-h-[min(70vh,420px)] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-xl"
      : variant === "canvas"
        ? "max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        : variant === "studio"
          ? "max-h-[min(70vh,420px)] overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 py-1 shadow-xl"
          : "max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 py-1 shadow-xl";

  const itemClass =
    variant === "terminal"
      ? "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-mono text-zinc-300 hover:bg-zinc-900"
      : variant === "canvas"
        ? "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        : variant === "studio"
          ? "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
          : "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800";

  const toolbarScrollClass =
    "flex flex-nowrap items-center gap-1 sm:gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x snap-x snap-mandatory";

  const viewsMenuPortal =
    mounted &&
    viewsOpen &&
    viewsMenuBox &&
    createPortal(
      <div
        ref={viewsMenuRef}
        className={`${panelSurfaceClass} fixed z-[100] min-w-[220px]`}
        style={{ top: viewsMenuBox.top, left: viewsMenuBox.left, width: viewsMenuBox.width }}
        role="menu"
        aria-label={t("dashboardTablistLabel")}
        data-testid="dashboard-views-menu"
      >
        {DASHBOARD_VIEW_TABS.map((row) => {
          const disabled = row.key === "diversification" && holdingsCount === 0;
          return (
            <button
              key={row.key}
              type="button"
              role="menuitem"
              disabled={disabled}
              className={`${itemClass} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              onClick={() => {
                if (disabled) return;
                onSelectTab(row.key);
                setViewsOpen(false);
              }}
            >
              <span>{t(row.labelKey)}</span>
              {row.tierBadge && <TierFeatureBadge requiredPlan={row.tierBadge} size="xs" />}
            </button>
          );
        })}
      </div>,
      document.body,
    );

  const moreMenuPortal =
    mounted &&
    moreOpen &&
    moreMenuBox &&
    createPortal(
      <div
        ref={moreMenuRef}
        className={`${panelSurfaceClass} fixed z-[100] min-w-[220px]`}
        style={{ top: moreMenuBox.top, left: moreMenuBox.left, width: moreMenuBox.width }}
        role="menu"
        aria-label={t("dashboardToolsMoreMenu")}
        data-testid="dashboard-tools-more-menu"
      >
        {moreMenuTools.map((entry) => {
          const href = getToolPath(entry.id);
          const badge = getTierBadgeForTool(entry.id);
          return (
            <Link
              key={entry.id}
              href={href}
              role="menuitem"
              className={itemClass}
              onClick={() => setMoreOpen(false)}
            >
              <span>{t(entry.labelKey)}</span>
              {badge && <TierFeatureBadge requiredPlan={badge} size="xs" />}
            </Link>
          );
        })}
      </div>,
      document.body,
    );

  return (
    <div
      className={toolbarScrollClass}
      role="toolbar"
      aria-label={t("dashboardQuickNavAriaLabel")}
      data-testid={dataTestId}
      data-tour={dataTour}
    >
      {viewsMenuPortal}
      {moreMenuPortal}
      <button
        type="button"
        onClick={() => onSelectTab("portfolio")}
        className={`${ctaClass(activeTab === "portfolio")} snap-start`}
      >
        {t("dashboardHoldingsTab")}
      </button>
      <Link href="/tools" className={`${ctaClass(false)} snap-start`}>
        {t("toolsNav")}
      </Link>
      {favoriteQuickLinks.map((entry) => {
        const href = getToolPath(entry.id);
        const toolActive =
          pathname === href || (href.length > 1 && pathname.startsWith(`${href}/`));
        const badge = getTierBadgeForTool(entry.id);
        return (
          <Link
            key={entry.id}
            href={href}
            className={`${ctaClass(toolActive)} snap-start`}
            title={t(entry.descKey)}
          >
            <span className="inline-flex max-w-[9rem] sm:max-w-none items-center gap-1 truncate">
              {t(entry.labelKey)}
              {badge && <TierFeatureBadge requiredPlan={badge} size="xs" />}
            </span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => onSelectTab("news")}
        className={`${ctaClass(activeTab === "news")} snap-start`}
      >
        {t("newsTab")}
      </button>
      <Link href="/import" className={`${ctaClass(false)} snap-start`}>
        {t("importNav")}
      </Link>

      <div className="relative shrink-0 snap-start" ref={viewsWrapRef}>
        <button
          ref={viewsBtnRef}
          type="button"
          className={ctaClass(activeTab != null && isDashboardViewTab(activeTab))}
          aria-haspopup="menu"
          aria-expanded={viewsOpen}
          onClick={() => {
            setViewsOpen((o) => !o);
            setMoreOpen(false);
          }}
        >
          {t("dashboardViewsHeading")}
          <span className="inline-block ml-0.5 opacity-70" aria-hidden>
            ▾
          </span>
        </button>
      </div>

      <div className="relative shrink-0 snap-start" ref={moreWrapRef}>
        <button
          ref={moreBtnRef}
          type="button"
          className={`${moreBtnClass} snap-start`}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          onClick={() => {
            setMoreOpen((o) => !o);
            setViewsOpen(false);
          }}
        >
          {t("dashboardMoreTools")}
          <span className="inline-block ml-0.5 opacity-70" aria-hidden>
            ▾
          </span>
        </button>
      </div>
    </div>
  );
}
