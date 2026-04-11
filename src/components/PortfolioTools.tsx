"use client";

import { useMemo, useEffect, Suspense } from "react";
import type { TranslationKey } from "@/lib/i18n";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useFeatureFlag } from "@/lib/feature-flag-context";
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

const TransactionHistory = dynamic(() => import("./TransactionHistory"), { ssr: false });
const DividendSummary = dynamic(() => import("./DividendSummary"), { ssr: false });
const PerformanceMetrics = dynamic(() => import("./PerformanceMetrics"), { ssr: false });
const TaxonomyView = dynamic(() => import("./TaxonomyView"), { ssr: false });
const RebalancingView = dynamic(() => import("./RebalancingView"), { ssr: false });
const AccountsManager = dynamic(() => import("./AccountsManager"), { ssr: false });
const Watchlist = dynamic(() => import("./Watchlist"), { ssr: false });
const PriceAlerts = dynamic(() => import("./PriceAlerts"), { ssr: false });
const StockScreener = dynamic(() => import("./StockScreener"), { ssr: false });
const TaxReport = dynamic(() => import("./TaxReport"), { ssr: false });
const PortfolioSimulator = dynamic(() => import("./PortfolioSimulator"), { ssr: false });
const FinancialPlanner = dynamic(() => import("./planning/FinancialPlanner"), { ssr: false });
const PortfolioScorePage = dynamic(() => import("./PortfolioScorePage"), { ssr: false });
const MoatEvaluationPicker = dynamic(() => import("./MoatEvaluationPicker"), { ssr: false });
const StrategiesTool = dynamic(() => import("./StrategiesTool"), { ssr: false });

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
  } = settings;
  const aiReportEnabled = useFeatureFlag("ai_report_enabled");
  const router = useRouter();
  const activeTab: ToolTabId | null = initialTab ?? null;
  const isMenuMode = !activeTab;
  const isPaid = user?.plan === "pro";

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

  const visibleTabs = useMemo(() => {
    return TOOLS_CATALOG.filter((tab) =>
      resolveHubVisibility(tab.id, visibilitySettings, aiReportEnabled)
    );
  }, [visibilitySettings, aiReportEnabled]);

  useEffect(() => {
    if (activeTab && visibleTabs.length > 0 && !visibleTabs.some((x) => x.id === activeTab)) {
      router.replace("/tools");
    }
  }, [visibleTabs, activeTab, router]);

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

        const renderCard = (entry: ToolCatalogEntry) => {
          const upgradeTier = !isIncluded(entry.id) ? getTierBadgeForTool(entry.id) : undefined;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActiveTab(entry.id)}
              className="relative flex flex-col items-center text-center p-3 sm:p-4 rounded-xl border transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm"
            >
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${entry.gradient} flex items-center justify-center mb-2 shadow-sm`}>
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
            </button>
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
            {renderTierBlock(
              includedTabs,
              t("toolsSectionFree")
            )}

            {proTabs.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2 px-0.5">
                  <span className="text-sm">🍀</span>
                  {t("toolsSectionTrefolio")}
                  <a href="/billing" className="ml-1 text-[9px] sm:text-[10px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded-md uppercase hover:bg-violet-600 transition-colors">{t("toolsSectionUpgrade")}</a>
                </h2>
                <div className="space-y-4">
                  {groupCatalogByCategory(proTabs).map(({ category, items }) => (
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
              {activeTab === "screener" && <StockScreener />}
              {activeTab === "tax" && <TaxReport />}
              {activeTab === "simulator" && <PortfolioSimulator />}
              {activeTab === "planning" && <FinancialPlanner />}
              {activeTab === "score" && <PortfolioScorePage />}
              {activeTab === "evaluation" && <MoatEvaluationPicker />}
              {activeTab === "strategies" && <StrategiesTool />}
            </div>
          </Suspense>
        </ErrorBoundary>
      )}

      <AdSlot slot="tools-bottom" format="horizontal" className="mt-6" />
    </main>
  );
}
