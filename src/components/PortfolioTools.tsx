"use client";

import { useMemo, useEffect, Suspense } from "react";
import type { TranslationKey } from "@/lib/i18n";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useFeatureFlag, useFeatureFlagContext } from "@/lib/feature-flag-context";
import { useCommerceEnabled } from "@/lib/commerce";
import AdSlot from "@/components/AdSlot";
import TierFeatureBadge from "./TierFeatureBadge";
import ErrorBoundary from "./ErrorBoundary";
import ToolsBreadcrumb from "./ToolsBreadcrumb";
import {
  TOOLS_CATALOG,
  type ToolCatalogEntry,
  type ToolHubCategory,
  type ToolTabId,
  getTierBadgeForTool,
  getToolPath,
  resolveHubVisibility,
  sortTabsByHubCategory,
} from "@/lib/tools-registry";
import { catalogOrderIndex, useFavoriteTools } from "@/lib/favorite-tools";
import { isPaidPlan, planOf } from "@/lib/plan-rank";

const TransactionHistory = dynamic(() => import("./TransactionHistory"), { ssr: false });
const DividendSummary = dynamic(() => import("./DividendSummary"), { ssr: false });
const PerformanceMetrics = dynamic(() => import("./PerformanceMetrics"), { ssr: false });
const TaxonomyView = dynamic(() => import("./TaxonomyView"), { ssr: false });
const RebalancingView = dynamic(() => import("./RebalancingView"), { ssr: false });
const AccountsManager = dynamic(() => import("./AccountsManager"), { ssr: false });
const Watchlist = dynamic(() => import("./Watchlist"), { ssr: false });
const PriceAlerts = dynamic(() => import("./PriceAlerts"), { ssr: false });
const StockScreener = dynamic(() => import("./StockScreener"), { ssr: false });
const HoldingsExplorer = dynamic(() => import("./HoldingsExplorer"), { ssr: false });
const TaxReport = dynamic(() => import("./TaxReport"), { ssr: false });
const PortfolioSimulator = dynamic(() => import("./PortfolioSimulator"), { ssr: false });
const FinancialPlanner = dynamic(() => import("./planning/FinancialPlanner"), { ssr: false });
const PortfolioProjection = dynamic(() => import("./PortfolioProjection"), { ssr: false });
const PortfolioScorePage = dynamic(() => import("./PortfolioScorePage"), { ssr: false });
const MoatEvaluationPicker = dynamic(() => import("./MoatEvaluationPicker"), { ssr: false });
const PortfolioEventsView = dynamic(() => import("./PortfolioEventsView"), { ssr: false });
const StrategiesTool = dynamic(() => import("./StrategiesTool"), { ssr: false });
const WarrenScreener = dynamic(() => import("./WarrenScreener"), { ssr: false });

const HUB_CATEGORY_LABEL: Record<ToolHubCategory, TranslationKey> = {
  portfolioActivity: "toolsHubCategoryPortfolioActivity",
  analysis: "toolsHubCategoryAnalysis",
  planningTax: "toolsHubCategoryPlanningTax",
  aiInsights: "toolsHubCategoryAiInsights",
  rebalancing: "toolsHubCategoryRebalancing",
};

function groupCatalogByCategory(entries: ToolCatalogEntry[]): { category: ToolHubCategory; items: ToolCatalogEntry[] }[] {
  const sorted = sortTabsByHubCategory(entries);
  const groups: { category: ToolHubCategory; items: ToolCatalogEntry[] }[] = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.category === e.hubCategory) {
      last.items.push(e);
    } else {
      groups.push({ category: e.hubCategory, items: [e] });
    }
  }
  return groups;
}

interface PortfolioToolsProps {
  initialTab?: ToolTabId;
}

export default function PortfolioTools({ initialTab }: PortfolioToolsProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const settings = useSettings();
  const {
    alertsEnabled, csvExportEnabled,
    toolTransactionsEnabled, toolDividendsEnabled, toolPerformanceEnabled,
    toolTaxonomyEnabled, toolRebalancingEnabled, toolAccountsEnabled, toolWatchlistEnabled,
    settingsReady,
  } = settings;
  const aiReportEnabled = useFeatureFlag("ai_report_enabled");
  const toolTaxReportsEnabled = useFeatureFlag("tool_tax_reports_enabled");
  const toolSimulatorEnabled = useFeatureFlag("tool_simulator_enabled");
  const toolPlanningEnabled = useFeatureFlag("tool_planning_enabled");
  const { isLoaded: flagsLoaded } = useFeatureFlagContext();
  const commerceEnabled = useCommerceEnabled();
  const { favoriteIds, toggleFavorite, isFavorite } = useFavoriteTools();
  const router = useRouter();
  const activeTab: ToolTabId | null = initialTab ?? null;
  const isMenuMode = !activeTab;
  const isPaid = isPaidPlan(planOf(user));

  const setActiveTab = (tab: ToolTabId) => {
    router.push(getToolPath(tab));
  };

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
    ]
  );

  const toolFlagExtras = useMemo(
    () => ({
      toolTaxReportsEnabled,
      toolSimulatorEnabled,
      toolPlanningEnabled,
    }),
    [toolTaxReportsEnabled, toolSimulatorEnabled, toolPlanningEnabled],
  );

  const visibleTabs = useMemo(() => {
    return TOOLS_CATALOG.filter((tab) =>
      resolveHubVisibility(tab.id, visibilitySettings, aiReportEnabled, toolFlagExtras)
    );
  }, [visibilitySettings, aiReportEnabled, toolFlagExtras]);

  useEffect(() => {
    if (!settingsReady || !flagsLoaded) return;
    if (activeTab && visibleTabs.length > 0 && !visibleTabs.some((x) => x.id === activeTab)) {
      router.replace("/tools");
    }
  }, [visibleTabs, activeTab, router, settingsReady, flagsLoaded]);

  const handleExport = (type: string) => {
    window.open(`/api/export/portfolio?type=${type}`, "_blank");
  };

  const tabLabel = (entry: ToolCatalogEntry): string => {
    return t(entry.labelKey);
  };

  const activeToolMeta = activeTab ? TOOLS_CATALOG.find((x) => x.id === activeTab) : null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 overflow-x-hidden">
      {!isMenuMode && activeToolMeta && activeTab && (
        <ToolsBreadcrumb
          toolLabel={tabLabel(activeToolMeta)}
          toolIcon={activeToolMeta.icon}
          toolGradient={activeToolMeta.gradient}
        />
      )}

      {isMenuMode && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t("toolsNav")}</h1>
            {isPaid && csvExportEnabled && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleExport("holdings")} className="text-xs text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  {t("exportCSV")}
                  <TierFeatureBadge requiredPlan="pro" size="xs" className="ml-0.5" />
                </button>
                <button onClick={() => handleExport("transactions")} className="text-xs text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  {t("transactions")}
                  <TierFeatureBadge requiredPlan="pro" size="xs" className="ml-0.5" />
                </button>
              </div>
            )}
          </div>

          <a href="/import" className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t("importToolsRedirect")}</p>
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{t("importGoToPage")} →</span>
          </a>

          <Link
            href="/explore"
            className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("exploreToolsBannerTitle")}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t("exploreToolsBannerDesc")}</p>
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{t("exploreGoToPage")} →</span>
          </Link>
        </>
      )}

      {isMenuMode && (() => {
        const userPlan = user?.plan ?? "free";
        const isAdmin = user?.role === "admin";
        const tierRank = { free: 0, pro: 1 } as const;
        const userRank = isAdmin ? 1 : tierRank[userPlan as keyof typeof tierRank] ?? 0;

        const isIncluded = (key: ToolTabId) => {
          const required = getTierBadgeForTool(key);
          if (!required) return true;
          return userRank >= tierRank[required];
        };

        const includedTabs = visibleTabs.filter((tab) => isIncluded(tab.id));
        const proTabs = visibleTabs.filter((tab) => !isIncluded(tab.id) && getTierBadgeForTool(tab.id) === "pro");

        const sortEntriesByCatalog = (entries: ToolCatalogEntry[]) =>
          [...entries].sort((a, b) => catalogOrderIndex(a.id) - catalogOrderIndex(b.id));

        const favoriteAmongVisible = sortEntriesByCatalog(
          visibleTabs.filter((tab) => favoriteIds.has(tab.id))
        );
        const includedTabsRest = includedTabs.filter((tab) => !favoriteIds.has(tab.id));
        const proTabsRest = proTabs.filter((tab) => !favoriteIds.has(tab.id));

        const renderCard = (entry: ToolCatalogEntry) => {
          const upgradeTier = !isIncluded(entry.id) ? getTierBadgeForTool(entry.id) : undefined;
          const fav = isFavorite(entry.id);
          return (
            <div
              key={entry.id}
              className="relative rounded-xl border transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm"
            >
              <button
                type="button"
                aria-pressed={fav}
                aria-label={fav ? t("toolFavoriteRemove") : t("toolFavoriteAdd")}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(entry.id);
                }}
                className="absolute top-1.5 right-1.5 z-10 rounded-lg p-1 text-amber-500 hover:bg-amber-500/10 dark:hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-800"
              >
                {fav ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                )}
              </button>
              <Link
                href={getToolPath(entry.id)}
                className="flex w-full flex-col items-center text-center p-3 sm:p-4 pt-5 sm:pt-6"
              >
                <div className={`mb-2 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br ${entry.gradient} shadow-sm`}>
                  <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={entry.icon} />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                  {tabLabel(entry)}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-tight line-clamp-2">
                  {t(entry.descKey)}
                </span>
                {upgradeTier && (
                  <span className="mt-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400">
                    Trefolio
                  </span>
                )}
              </Link>
            </div>
          );
        };

        const renderTierBlock = (tabs: ToolCatalogEntry[], sectionTitle: React.ReactNode, emoji?: string) => {
          if (tabs.length === 0) return null;
          const groups = groupCatalogByCategory(tabs);
          return (
            <div>
              <h2 className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 px-0.5">
                {emoji ? <span className="text-sm">{emoji}</span> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                {sectionTitle}
              </h2>
              <div className="space-y-4">
                {groups.map(({ category, items }) => (
                  <div key={category}>
                    <h3 className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 px-0.5">
                      {t(HUB_CATEGORY_LABEL[category])}
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                      {items.map(renderCard)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        };

        return (
          <div className="mb-6 space-y-6">
            {favoriteAmongVisible.length > 0 && (
              <div>
                <h2 className="mb-2 flex items-center gap-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 sm:text-xs">
                  <span className="text-sm" aria-hidden>
                    ★
                  </span>
                  {t("toolsSectionFavorites")}
                </h2>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6 xl:grid-cols-8">
                  {favoriteAmongVisible.map(renderCard)}
                </div>
              </div>
            )}

            {renderTierBlock(
              includedTabsRest,
              t("toolsSectionFree")
            )}

            {proTabsRest.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2 px-0.5">
                  <span className="text-sm">🍀</span>
                  {t("toolsSectionTrefolio")}
                  {commerceEnabled && (
                  <a href="/billing" className="ml-1 text-[9px] sm:text-[10px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded-md uppercase hover:bg-violet-600 transition-colors">{t("toolsSectionUpgrade")}</a>
                  )}
                </h2>
                <div className="space-y-4">
                  {groupCatalogByCategory(proTabsRest).map(({ category, items }) => (
                    <div key={`pro-${category}`}>
                      <h3 className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 px-0.5">
                        {t(HUB_CATEGORY_LABEL[category])}
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                        {items.map(renderCard)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {!isMenuMode && activeTab && (
        <ErrorBoundary>
          <Suspense fallback={<div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" /></div>}>
            <div className="space-y-6">
              {activeTab === "transactions" && <TransactionHistory />}
              {activeTab === "dividends" && <DividendSummary />}
              {activeTab === "performance" && <PerformanceMetrics />}
              {activeTab === "taxonomy" && <TaxonomyView />}
              {activeTab === "rebalancing" && <RebalancingView />}
              {activeTab === "accounts" && <AccountsManager />}
              {activeTab === "watchlist" && <Watchlist />}
              {activeTab === "alerts" && <PriceAlerts />}
              {activeTab === "holdingsExplorer" && <HoldingsExplorer />}
              {activeTab === "screener" && <StockScreener />}
              {activeTab === "warren" && <WarrenScreener />}
              {activeTab === "tax" && <TaxReport />}
              {activeTab === "simulator" && <PortfolioSimulator />}
              {activeTab === "projection" && <PortfolioProjection />}
              {activeTab === "planning" && <FinancialPlanner />}
              {activeTab === "score" && <PortfolioScorePage />}
              {activeTab === "evaluation" && <MoatEvaluationPicker />}
              {activeTab === "strategies" && <StrategiesTool />}
              {activeTab === "events" && <PortfolioEventsView />}
            </div>
          </Suspense>
        </ErrorBoundary>
      )}

      <AdSlot slot="tools-bottom" format="horizontal" className="mt-6" />
    </main>
  );
}
