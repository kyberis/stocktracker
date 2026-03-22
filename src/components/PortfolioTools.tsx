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
const PortfolioScorePage = dynamic(() => import("./PortfolioScorePage"), { ssr: false });
type Tab = "transactions" | "dividends" | "performance" | "taxonomy" | "rebalancing" | "accounts" | "watchlist" | "alerts" | "screener" | "tax" | "simulator" | "planning" | "score";

const TIER_BADGE_MAP: Partial<Record<Tab, "starter" | "pro">> = {
  performance: "starter",
  screener: "pro",
  tax: "pro",
  simulator: "pro",
  planning: "pro",
  score: "pro",
};

type TabDescKey = `toolDesc${Capitalize<Tab>}`;

const ALL_TABS: { key: Tab; icon: string; descKey: TabDescKey; gradient: string }[] = [
  { key: "transactions", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", descKey: "toolDescTransactions", gradient: "from-blue-500 to-indigo-600" },
  { key: "dividends", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", descKey: "toolDescDividends", gradient: "from-emerald-500 to-green-600" },
  { key: "performance", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", descKey: "toolDescPerformance", gradient: "from-orange-500 to-red-500" },
  { key: "taxonomy", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z", descKey: "toolDescTaxonomy", gradient: "from-pink-500 to-rose-600" },
  { key: "rebalancing", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3", descKey: "toolDescRebalancing", gradient: "from-cyan-500 to-teal-600" },
  { key: "accounts", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", descKey: "toolDescAccounts", gradient: "from-slate-500 to-gray-600" },
  { key: "watchlist", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z", descKey: "toolDescWatchlist", gradient: "from-violet-500 to-purple-600" },
  { key: "alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", descKey: "toolDescAlerts", gradient: "from-amber-500 to-yellow-600" },
  { key: "screener", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z", descKey: "toolDescScreener", gradient: "from-sky-500 to-blue-600" },
  { key: "tax", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z", descKey: "toolDescTax", gradient: "from-indigo-500 to-violet-600" },
  { key: "simulator", icon: "M3 3v18h18M19 9l-5 5-4-4-3 3", descKey: "toolDescSimulator", gradient: "from-teal-500 to-emerald-600" },
  { key: "planning", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", descKey: "toolDescPlanning", gradient: "from-fuchsia-500 to-pink-600" },
  { key: "score", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z", descKey: "toolDescScore", gradient: "from-amber-500 to-orange-600" },
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
    score: true,
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
      score: t("portfolioScoreNav"),
    };
    return map[key];
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 overflow-x-hidden">
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

      {/* Tool navigation — card grid grouped by tier relative to user plan */}
      {(() => {
        const userPlan = user?.plan ?? "free";
        const isAdmin = user?.role === "admin";
        const tierRank = { free: 0, starter: 1, pro: 2 } as const;
        const userRank = isAdmin ? 2 : tierRank[userPlan as keyof typeof tierRank] ?? 0;

        const isIncluded = (key: Tab) => {
          const required = TIER_BADGE_MAP[key];
          if (!required) return true;
          return userRank >= tierRank[required];
        };

        const includedTabs = visibleTabs.filter(({ key }) => isIncluded(key));
        const starterTabs = visibleTabs.filter(({ key }) => !isIncluded(key) && TIER_BADGE_MAP[key] === "starter");
        const proTabs = visibleTabs.filter(({ key }) => !isIncluded(key) && TIER_BADGE_MAP[key] === "pro");

        const renderCard = ({ key, icon, descKey, gradient }: typeof ALL_TABS[number]) => {
          const isActive = activeTab === key;
          const upgradeTier = !isIncluded(key) ? TIER_BADGE_MAP[key] : undefined;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex flex-col items-center text-center p-3 sm:p-4 rounded-xl border transition-all ${
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 ring-1 ring-emerald-400/30 shadow-sm"
                  : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm"
              }`}
            >
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-2 shadow-sm`}>
                <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <span className={`text-xs sm:text-sm font-semibold leading-tight ${isActive ? "text-emerald-700 dark:text-emerald-300" : "text-gray-900 dark:text-white"}`}>
                {tabLabel(key)}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-tight line-clamp-2">
                {t(descKey)}
              </span>
              {upgradeTier && (
                <span className={`mt-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                  upgradeTier === "starter"
                    ? "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400"
                }`}>
                  {upgradeTier === "starter" ? "Bifolio" : "Trefolio"}
                </span>
              )}
            </button>
          );
        };

        return (
          <div className="mb-6 space-y-4">
            {/* Included in user's plan */}
            <div>
              <h2 className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 px-0.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                {t("toolsSectionFree")}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                {includedTabs.map(renderCard)}
              </div>
            </div>

            {/* Bifolio upgrade section — only visible to free users */}
            {starterTabs.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 px-0.5">
                  <span className="text-sm">☘️</span>
                  {t("toolsSectionBifolio")}
                  <a href="/billing" className="ml-1 text-[9px] sm:text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-md uppercase hover:bg-amber-600 transition-colors">{t("toolsSectionUpgrade")}</a>
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                  {starterTabs.map(renderCard)}
                </div>
              </div>
            )}

            {/* Trefolio upgrade section — only visible to free/starter users */}
            {proTabs.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2 px-0.5">
                  <span className="text-sm">🍀</span>
                  {t("toolsSectionTrefolio")}
                  <a href="/billing" className="ml-1 text-[9px] sm:text-[10px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded-md uppercase hover:bg-violet-600 transition-colors">{t("toolsSectionUpgrade")}</a>
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                  {proTabs.map(renderCard)}
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
            {activeTab === "score" && <PortfolioScorePage />}
          </div>
        </Suspense>

        <AdSlot slot="tools-bottom" format="horizontal" className="mt-6" />
    </main>
  );
}
