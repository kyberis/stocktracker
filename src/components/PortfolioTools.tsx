"use client";

import { useMemo, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import AdSlot from "@/components/AdSlot";
import TierFeatureBadge from "./TierFeatureBadge";

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
type Tab = "transactions" | "dividends" | "performance" | "taxonomy" | "rebalancing" | "accounts" | "watchlist" | "alerts" | "screener" | "tax" | "simulator" | "planning";

const TIER_BADGE_MAP: Partial<Record<Tab, "starter" | "pro">> = {
  performance: "starter",
  alerts: "starter",
  screener: "pro",
  tax: "pro",
  simulator: "pro",
  planning: "pro",
};

const ALL_TABS: { key: Tab; icon: string }[] = [
  { key: "transactions", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { key: "dividends", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "performance", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { key: "taxonomy", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
  { key: "rebalancing", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" },
  { key: "accounts", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { key: "watchlist", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
  { key: "alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { key: "screener", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" },
  { key: "tax", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
  { key: "simulator", icon: "M3 3v18h18M19 9l-5 5-4-4-3 3" },
  { key: "planning", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

interface PortfolioToolsProps {
  initialTab?: Tab;
}

export default function PortfolioTools({ initialTab = "transactions" }: PortfolioToolsProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const {
    alertsEnabled, csvExportEnabled,
    toolTransactionsEnabled, toolDividendsEnabled, toolPerformanceEnabled,
    toolTaxonomyEnabled, toolRebalancingEnabled, toolAccountsEnabled, toolWatchlistEnabled,
  } = useSettings();
  const router = useRouter();
  const activeTab: Tab = initialTab;
  const isPaid = user?.plan === "starter" || user?.plan === "pro";

  const setActiveTab = (tab: Tab) => {
    if (tab === "transactions") {
      router.push("/tools");
    } else {
      router.push(`/tools/${tab}`);
    }
  };

  const toolFlagMap: Record<Tab, boolean> = {
    transactions: toolTransactionsEnabled,
    dividends: toolDividendsEnabled,
    performance: toolPerformanceEnabled,
    taxonomy: toolTaxonomyEnabled,
    rebalancing: toolRebalancingEnabled,
    accounts: toolAccountsEnabled,
    watchlist: toolWatchlistEnabled,
    alerts: alertsEnabled,
    screener: true,
    tax: true,
    simulator: true,
    planning: true,
  };

  const visibleTabs = useMemo(() => {
    return ALL_TABS.filter((tab) => toolFlagMap[tab.key]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    alertsEnabled, toolTransactionsEnabled, toolDividendsEnabled, toolPerformanceEnabled,
    toolTaxonomyEnabled, toolRebalancingEnabled, toolAccountsEnabled, toolWatchlistEnabled,
  ]);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.key === activeTab)) {
      const fallback = visibleTabs[0].key;
      if (fallback === "transactions") {
        router.replace("/tools");
      } else {
        router.replace(`/tools/${fallback}`);
      }
    }
  }, [visibleTabs, activeTab, router]);

  const handleExport = (type: string) => {
    window.open(`/api/export/portfolio?type=${type}`, "_blank");
  };

  const tabLabel = (key: Tab): string => {
    const map: Record<Tab, string> = {
      transactions: t("transactions"),
      dividends: t("dividends"),
      performance: t("performanceMetrics"),
      taxonomy: t("taxonomy"),
      rebalancing: t("rebalancing"),
      accounts: t("accounts"),
      watchlist: t("watchlist"),
      alerts: t("priceAlerts"),
      screener: t("screenerNav"),
      tax: t("taxReportsNav"),
      simulator: t("simulatorNav"),
      planning: "Planning",
    };
    return map[key];
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header with export */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t("toolsNav")}</h1>
        {isPaid && csvExportEnabled && (
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleExport("holdings")} className="text-xs text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              {t("exportCSV")}
              <TierFeatureBadge requiredPlan="starter" size="xs" className="ml-0.5" />
            </button>
            <button onClick={() => handleExport("transactions")} className="text-xs text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              {t("transactions")}
              <TierFeatureBadge requiredPlan="starter" size="xs" className="ml-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* Import redirect card */}
      <a href="/import" className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t("importToolsRedirect")}</p>
        </div>
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{t("importGoToPage")} →</span>
      </a>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 mb-6 bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-gray-200 dark:border-slate-700 shadow-sm">
          {visibleTabs.map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all ${
                activeTab === key
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span className="hidden sm:inline">{tabLabel(key)}</span>
              {TIER_BADGE_MAP[key] && <TierFeatureBadge requiredPlan={TIER_BADGE_MAP[key]!} size="xs" className="ml-0.5" />}
            </button>
          ))}
        </div>

        {/* Tab content */}
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
          </div>
        </Suspense>

        <AdSlot slot="tools-bottom" format="horizontal" className="mt-6" />
    </main>
  );
}
