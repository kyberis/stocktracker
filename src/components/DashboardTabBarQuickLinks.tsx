"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
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
import { buildNavMenuIndex, filterNavMenuItems, type NavMenuItem } from "@/lib/nav-menu-search";
import type { DashboardTab } from "@/lib/use-dashboard-tab-url";

export type DashboardTabBarQuickVariant = "default" | "terminal" | "canvas" | "studio";

type TailItem =
  | { kind: "fav"; entry: ToolCatalogEntry }
  | { kind: "news" }
  | { kind: "import" };

/** Views menu → real tool routes (TRF-001 A lite). */
const DASHBOARD_VIEW_LINKS: {
  key: DashboardTab;
  labelKey: TranslationKey;
  href: string;
  tierBadge?: "pro";
}[] = [
  { key: "diversification", labelKey: "diversificationTab", href: "/tools/taxonomy" },
  { key: "dividends", labelKey: "dividendsTab", href: "/tools/dividends" },
  { key: "metrics", labelKey: "performanceTab", href: "/tools/performance", tierBadge: "pro" },
  { key: "growth", labelKey: "growthTab", href: "/tools/projection", tierBadge: "pro" },
  { key: "events", labelKey: "eventsTab", href: "/tools/events" },
];

function isViewPathActive(pathname: string): boolean {
  return DASHBOARD_VIEW_LINKS.some(
    (v) => pathname === v.href || pathname.startsWith(`${v.href}/`),
  );
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
  const router = useRouter();
  const { favoriteIdsOrdered } = useFavoriteTools();
  const aiReportEnabled = useFeatureFlag("ai_report_enabled");
  const toolTaxReportsEnabled = useFeatureFlag("tool_tax_reports_enabled");
  const toolSimulatorEnabled = useFeatureFlag("tool_simulator_enabled");
  const toolPlanningEnabled = useFeatureFlag("tool_planning_enabled");
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
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHighlight, setSearchHighlight] = useState(0);
  const [mounted, setMounted] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const viewsWrapRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const viewsBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const viewsMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const searchMenuRef = useRef<HTMLDivElement>(null);
  const searchListboxId = useId();
  const searchOptionPrefix = `${searchListboxId}-opt`;

  const searchPanelOpen = searchExpanded && searchQuery.trim().length >= 1;
  const viewsMenuBox = useMenuFixedPosition(viewsOpen, viewsBtnRef);
  const moreMenuBox = useMenuFixedPosition(moreOpen, moreBtnRef);
  const searchMenuBox = useMenuFixedPosition(searchPanelOpen, searchWrapRef);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!viewsOpen) return;
    function handle(e: MouseEvent) {
      const node = e.target as Node;
      if (viewsWrapRef.current?.contains(node)) return;
      if (viewsMenuRef.current?.contains(node)) return;
      setViewsOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [viewsOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    function handle(e: MouseEvent) {
      const node = e.target as Node;
      if (moreWrapRef.current?.contains(node)) return;
      if (moreMenuRef.current?.contains(node)) return;
      setMoreOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [moreOpen]);

  useEffect(() => {
    if (!searchExpanded) return;
    function handle(e: MouseEvent) {
      const node = e.target as Node;
      if (searchWrapRef.current?.contains(node)) return;
      if (searchMenuRef.current?.contains(node)) return;
      setSearchExpanded(false);
      setSearchQuery("");
      setSearchHighlight(0);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [searchExpanded]);

  useEffect(() => {
    if (!viewsOpen && !moreOpen && !searchExpanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setViewsOpen(false);
        setMoreOpen(false);
        if (searchExpanded) {
          setSearchExpanded(false);
          setSearchQuery("");
          setSearchHighlight(0);
          searchInputRef.current?.blur();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewsOpen, moreOpen, searchExpanded]);

  useEffect(() => {
    if (!searchExpanded) return;
    searchInputRef.current?.focus();
  }, [searchExpanded]);

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
      resolveHubVisibility(e.id, visibilitySettings, aiReportEnabled, {
        toolTaxReportsEnabled,
        toolSimulatorEnabled,
        toolPlanningEnabled,
      }),
    );
    return sortTabsByHubCategory(filtered);
  }, [
    visibilitySettings,
    aiReportEnabled,
    toolTaxReportsEnabled,
    toolSimulatorEnabled,
    toolPlanningEnabled,
  ]);

  const visibleToolIdSet = useMemo(() => new Set(visibleTools.map((e) => e.id)), [visibleTools]);

  const favoriteQuickLinks = useMemo((): ToolCatalogEntry[] => {
    return favoriteIdsOrdered
      .filter((id) => visibleToolIdSet.has(id))
      .map((id) => getToolEntry(id))
      .filter((e): e is ToolCatalogEntry => e != null);
  }, [favoriteIdsOrdered, visibleToolIdSet]);

  const tailItems = useMemo((): TailItem[] => {
    const favs = favoriteQuickLinks.map((entry) => ({ kind: "fav" as const, entry }));
    return [...favs, { kind: "news" as const }, { kind: "import" as const }];
  }, [favoriteQuickLinks]);

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

  const navMenuIndex = useMemo(
    () =>
      buildNavMenuIndex({
        holdingsLabel: t("dashboardHoldingsTab"),
        toolsLabel: t("toolsNav"),
        newsLabel: t("newsTab"),
        importLabel: t("importNav"),
        viewLinks: DASHBOARD_VIEW_LINKS.map((row) => ({
          id: row.key,
          label: t(row.labelKey),
          href: row.href,
          tierBadge: row.tierBadge,
          disabled: row.key === "diversification" && holdingsCount === 0,
        })),
        tools: visibleTools.map((entry) => ({
          id: entry.id,
          label: t(entry.labelKey),
          href: getToolPath(entry.id),
          tierBadge: getTierBadgeForTool(entry.id),
        })),
      }),
    [t, holdingsCount, visibleTools],
  );

  const searchResults = useMemo(
    () => filterNavMenuItems(navMenuIndex, searchQuery),
    [navMenuIndex, searchQuery],
  );

  useEffect(() => {
    setSearchHighlight(0);
  }, [searchQuery]);

  const closeSearch = useCallback(() => {
    setSearchExpanded(false);
    setSearchQuery("");
    setSearchHighlight(0);
  }, []);

  const activateSearchItem = useCallback(
    (item: NavMenuItem) => {
      if (item.disabled) return;
      if (item.kind === "tab") {
        onSelectTab(item.tab);
      } else {
        router.push(item.href);
      }
      closeSearch();
      setViewsOpen(false);
      setMoreOpen(false);
    },
    [onSelectTab, router, closeSearch],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const coreWrapRef = useRef<HTMLDivElement>(null);
  const tailMeasureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleTailCount, setVisibleTailCount] = useState<number | null>(null);

  const recomputeTailVisibility = useCallback(() => {
    const container = containerRef.current;
    const core = coreWrapRef.current;
    const moreEl = moreBtnRef.current;
    if (!container || !core || !moreEl) return;

    const cw = container.clientWidth;
    const gapRaw = getComputedStyle(container).gap;
    const gap = gapRaw ? parseFloat(gapRaw) : 6;
    const coreW = core.offsetWidth;
    const moreW = moreEl.offsetWidth;

    const widths = tailItems.map((_, i) => tailMeasureRefs.current[i]?.offsetWidth ?? 0);

    /** Row: core | gap | (tail[i] gap)* | more — same as flex `gap` between siblings. */
    let k = widths.length;
    while (k >= 0) {
      let sum = coreW;
      for (let i = 0; i < k; i++) {
        sum += gap;
        sum += widths[i];
      }
      sum += gap;
      sum += moreW;
      if (sum <= cw + 0.5) break;
      k--;
    }
    setVisibleTailCount(k);
  }, [tailItems]);

  useLayoutEffect(() => {
    recomputeTailVisibility();
  }, [recomputeTailVisibility, pathname, activeTab, variant, searchExpanded]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recomputeTailVisibility());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recomputeTailVisibility]);

  const shownTail = useMemo(() => {
    const n = visibleTailCount ?? tailItems.length;
    return tailItems.slice(0, Math.min(n, tailItems.length));
  }, [tailItems, visibleTailCount]);

  const overflowTail = useMemo(() => {
    const n = visibleTailCount ?? tailItems.length;
    return tailItems.slice(Math.min(n, tailItems.length));
  }, [tailItems, visibleTailCount]);

  const showNewsInMore = overflowTail.some((x) => x.kind === "news");
  const showImportInMore = overflowTail.some((x) => x.kind === "import");

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
    return `shrink-0 rounded-xl border px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
      active
        ? "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--foreground)]"
        : "border-transparent text-[color:var(--muted)] hover:border-[color:var(--border)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground)]"
    }`;
  };

  const moreBtnClass =
    variant === "terminal"
      ? "shrink-0 px-2.5 py-1 text-xs font-mono transition-colors border border-zinc-700 text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
      : variant === "canvas"
        ? "shrink-0 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        : variant === "studio"
          ? "shrink-0 px-3 py-1.5 text-xs sm:text-sm font-medium border border-white/15 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          : "shrink-0 rounded-xl border border-[color:var(--border)] px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-[color:var(--muted)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";

  const panelSurfaceClass =
    variant === "terminal"
      ? "max-h-[min(70vh,420px)] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-xl"
      : variant === "canvas"
        ? "max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        : variant === "studio"
          ? "max-h-[min(70vh,420px)] overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 py-1 shadow-xl"
          : "max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-overlay)] py-1 shadow-xl";

  const itemClass =
    variant === "terminal"
      ? "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-mono text-zinc-300 hover:bg-zinc-900"
      : variant === "canvas"
        ? "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        : variant === "studio"
          ? "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
          : "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-[color:var(--foreground)] hover:bg-[color:var(--surface-soft)]";

  const searchOptionClass = (active: boolean, disabled?: boolean) => {
    const base = itemClass;
    if (disabled) return `${base} opacity-40 cursor-not-allowed`;
    if (active) {
      if (variant === "terminal") return `${base} bg-zinc-900`;
      if (variant === "canvas") return `${base} bg-slate-50`;
      if (variant === "studio") return `${base} bg-white/5`;
      return `${base} bg-[color:var(--surface-soft)]`;
    }
    return base;
  };

  const searchInputShell =
    variant === "terminal"
      ? "flex items-center gap-1 rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-green-500"
      : variant === "canvas"
        ? "flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 focus-within:ring-2 focus-within:ring-green-500"
        : variant === "studio"
          ? "flex items-center gap-1 border border-white/15 bg-zinc-900/80 px-1.5 py-0.5 focus-within:ring-2 focus-within:ring-emerald-500"
          : "flex items-center gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-2 py-1 focus-within:ring-2 focus-within:ring-emerald-500";

  const toolbarRowClass =
    "flex min-w-0 flex-nowrap items-center gap-1 sm:gap-1.5 overflow-x-hidden overflow-y-hidden";

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
        {DASHBOARD_VIEW_LINKS.map((row) => {
          const disabled = row.key === "diversification" && holdingsCount === 0;
          const active =
            pathname === row.href || (row.href.length > 1 && pathname.startsWith(`${row.href}/`));
          if (disabled) {
            return (
              <span
                key={row.key}
                role="menuitem"
                aria-disabled="true"
                aria-label={t(row.labelKey)}
                className={`${itemClass} opacity-40 cursor-not-allowed`}
              >
                <span>{t(row.labelKey)}</span>
                {row.tierBadge && <TierFeatureBadge requiredPlan={row.tierBadge} size="xs" />}
              </span>
            );
          }
          return (
            <Link
              key={row.key}
              href={row.href}
              role="menuitem"
              aria-label={t(row.labelKey)}
              aria-current={active ? "page" : undefined}
              className={itemClass}
              onClick={() => setViewsOpen(false)}
            >
              <span>{t(row.labelKey)}</span>
              {row.tierBadge && <TierFeatureBadge requiredPlan={row.tierBadge} size="xs" />}
            </Link>
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
        {showNewsInMore && (
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              onSelectTab("news");
              setMoreOpen(false);
            }}
          >
            {t("newsTab")}
          </button>
        )}
        {showImportInMore && (
          <Link href="/import" role="menuitem" className={itemClass} onClick={() => setMoreOpen(false)}>
            {t("importNav")}
          </Link>
        )}
        {(showNewsInMore || showImportInMore) && moreMenuTools.length > 0 ? (
          <div
            className="mx-2 my-1 border-t border-gray-200 dark:border-slate-600"
            role="separator"
            aria-hidden
          />
        ) : null}
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

  const searchMenuPortal =
    mounted &&
    searchPanelOpen &&
    searchMenuBox &&
    createPortal(
      <div
        ref={searchMenuRef}
        className={`${panelSurfaceClass} fixed z-[100] min-w-[240px]`}
        style={{
          top: searchMenuBox.top,
          left: Math.min(searchMenuBox.left, window.innerWidth - 260),
          width: Math.max(240, searchMenuBox.width),
        }}
        role="listbox"
        id={searchListboxId}
        aria-label={t("dashboardMenuSearchAria")}
        data-testid="dashboard-menu-search-results"
      >
        {searchResults.length === 0 ? (
          <p className="px-3 py-2 text-sm text-[color:var(--muted)]" role="status" aria-live="polite">
            {t("dashboardMenuSearchEmpty")}
          </p>
        ) : (
          searchResults.map((item, idx) => {
            const active = idx === searchHighlight;
            const optionId = `${searchOptionPrefix}-${idx}`;
            return (
              <button
                key={item.id}
                type="button"
                id={optionId}
                role="option"
                aria-selected={active}
                aria-disabled={item.disabled || undefined}
                disabled={item.disabled}
                className={searchOptionClass(active, item.disabled)}
                onMouseEnter={() => setSearchHighlight(idx)}
                onClick={() => activateSearchItem(item)}
              >
                <span>{item.label}</span>
                {item.tierBadge && <TierFeatureBadge requiredPlan={item.tierBadge} size="xs" />}
              </button>
            );
          })
        )}
      </div>,
      document.body,
    );

  return (
    <>
      {/* Off-screen width probes — must mirror visible tail chips for overflow math. */}
      <div
        className="pointer-events-none fixed left-[-9999px] top-0 z-[-1] flex flex-nowrap items-center gap-1 sm:gap-1.5"
        aria-hidden
      >
        {tailItems.map((item, i) => (
          <div
            key={`tail-measure-${item.kind === "fav" ? item.entry.id : item.kind}`}
            ref={(el) => {
              tailMeasureRefs.current[i] = el;
            }}
            className="shrink-0"
          >
            {item.kind === "fav" ? (
              (() => {
                const entry = item.entry;
                const href = getToolPath(entry.id);
                const toolActive =
                  pathname === href || (href.length > 1 && pathname.startsWith(`${href}/`));
                const badge = getTierBadgeForTool(entry.id);
                return (
                  <Link
                    href={href}
                    className={`${ctaClass(toolActive)} snap-start`}
                    aria-label={t(entry.labelKey)}
                    title={t(entry.labelKey)}
                    tabIndex={-1}
                  >
                    <span className="inline-flex max-w-[9rem] sm:max-w-none items-center gap-1 truncate">
                      {t(entry.labelKey)}
                      {badge && <TierFeatureBadge requiredPlan={badge} size="xs" />}
                    </span>
                  </Link>
                );
              })()
            ) : item.kind === "news" ? (
              <button type="button" tabIndex={-1} className={`${ctaClass(activeTab === "news")} snap-start`}>
                {t("newsTab")}
              </button>
            ) : (
              <Link href="/import" className={`${ctaClass(false)} snap-start`} tabIndex={-1}>
                {t("importNav")}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div
        ref={containerRef}
        className={toolbarRowClass}
        role="toolbar"
        aria-label={t("dashboardQuickNavAriaLabel")}
        data-testid={dataTestId}
        data-tour={dataTour}
      >
        {viewsMenuPortal}
        {moreMenuPortal}
        {searchMenuPortal}
        <div ref={coreWrapRef} className="flex shrink-0 items-center gap-1 sm:gap-1.5">
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

          <div className="relative shrink-0 snap-start" ref={viewsWrapRef}>
            <button
              ref={viewsBtnRef}
              type="button"
              className={ctaClass(isViewPathActive(pathname) || (activeTab != null && ["diversification", "dividends", "metrics", "growth", "events"].includes(activeTab)))}
              aria-haspopup="menu"
              aria-expanded={viewsOpen}
              onClick={() => {
                setViewsOpen((o) => !o);
                setMoreOpen(false);
                closeSearch();
              }}
            >
              {t("dashboardViewsHeading")}
              <span className="inline-block ml-0.5 opacity-70" aria-hidden>
                ▾
              </span>
            </button>
          </div>

          <div ref={searchWrapRef} className="relative shrink-0 snap-start">
            {searchExpanded ? (
              <div className={searchInputShell} role="search">
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-[color:var(--muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <label htmlFor="dashboard-menu-search-input" className="sr-only">
                  {t("dashboardMenuSearchAria")}
                </label>
                <input
                  ref={searchInputRef}
                  id="dashboard-menu-search-input"
                  type="search"
                  role="combobox"
                  autoComplete="off"
                  value={searchQuery}
                  placeholder={t("dashboardMenuSearchPlaceholder")}
                  aria-label={t("dashboardMenuSearchAria")}
                  aria-controls={searchPanelOpen ? searchListboxId : undefined}
                  aria-expanded={searchPanelOpen}
                  aria-autocomplete="list"
                  aria-haspopup="listbox"
                  aria-activedescendant={
                    searchPanelOpen && searchResults.length > 0
                      ? `${searchOptionPrefix}-${searchHighlight}`
                      : undefined
                  }
                  className="w-[7.5rem] sm:w-[9.5rem] bg-transparent text-xs sm:text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted)] outline-none focus-visible:ring-0"
                  data-testid="dashboard-menu-search-input"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      if (searchResults.length === 0) return;
                      setSearchHighlight((h) => (h + 1) % searchResults.length);
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      if (searchResults.length === 0) return;
                      setSearchHighlight((h) => (h - 1 + searchResults.length) % searchResults.length);
                      return;
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const item = searchResults[searchHighlight];
                      if (item) activateSearchItem(item);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      closeSearch();
                    }
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                className={`${moreBtnClass} inline-flex items-center justify-center !px-2`}
                aria-label={t("dashboardMenuSearchExpand")}
                data-testid="dashboard-menu-search-open"
                onClick={() => {
                  setSearchExpanded(true);
                  setViewsOpen(false);
                  setMoreOpen(false);
                }}
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {shownTail.map((item) => {
          if (item.kind === "fav") {
            const entry = item.entry;
            const href = getToolPath(entry.id);
            const toolActive =
              pathname === href || (href.length > 1 && pathname.startsWith(`${href}/`));
            const badge = getTierBadgeForTool(entry.id);
            return (
              <Link
                key={`tail-fav-${entry.id}`}
                href={href}
                className={`${ctaClass(toolActive)} shrink-0 snap-start`}
                aria-label={t(entry.labelKey)}
                title={t(entry.labelKey)}
              >
                <span className="inline-flex max-w-[9rem] sm:max-w-none items-center gap-1 truncate">
                  {t(entry.labelKey)}
                  {badge && <TierFeatureBadge requiredPlan={badge} size="xs" />}
                </span>
              </Link>
            );
          }
          if (item.kind === "news") {
            return (
              <button
                key="tail-news"
                type="button"
                onClick={() => onSelectTab("news")}
                className={`${ctaClass(activeTab === "news")} shrink-0 snap-start`}
              >
                {t("newsTab")}
              </button>
            );
          }
          return (
            <Link key="tail-import" href="/import" className={`${ctaClass(false)} shrink-0 snap-start`}>
              {t("importNav")}
            </Link>
          );
        })}

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
              closeSearch();
            }}
          >
            {t("dashboardMoreTools")}
            <span className="inline-block ml-0.5 opacity-70" aria-hidden>
              ▾
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
