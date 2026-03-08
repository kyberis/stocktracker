"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import PortfolioSummary from "./PortfolioSummary";
import MarketAndCash from "./MarketAndCash";
import PortfolioTable from "./PortfolioTable";
import BrokerFilter from "./BrokerFilter";
import { useWhatsNewAutoShow } from "./WhatsNewModal";
import DashboardToolbar from "./DashboardToolbar";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import type { Account } from "@/lib/types";

const PortfolioGrowthPeriods = dynamic(() => import("./PortfolioGrowthPeriods"), { ssr: false });
const PerformanceMetrics = dynamic(() => import("./PerformanceMetrics"), { ssr: false });
const PortfolioProjection = dynamic(() => import("./PortfolioProjection"), { ssr: false });
const PortfolioNewsFeed = dynamic(() => import("./PortfolioNewsFeed"), { ssr: false });
const AddStockModal = dynamic(() => import("./AddStockModal"), { ssr: false });
const SettingsModal = dynamic(() => import("./SettingsModal"), { ssr: false });
const ImportPortfolioModal = dynamic(() => import("./ImportPortfolioModal"), { ssr: false });
const ResetPortfolioModal = dynamic(() => import("./ResetPortfolioModal"), { ssr: false });
const WhatsNewModal = dynamic(() => import("./WhatsNewModal"), { ssr: false });
const FeedbackModal = dynamic(() => import("./FeedbackModal"), { ssr: false });
const ProCompareCard = dynamic(() => import("./ProCompareCard"), { ssr: false });
const PortfolioReviewCard = dynamic(() => import("./PortfolioReviewCard"), { ssr: false });

type DashboardTab = "portfolio" | "news";

export default function Dashboard() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("portfolio");
  const [brokerFilter, setBrokerFilter] = useState<string>("all");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { showWhatsNew: autoShowWhatsNew, dismissWhatsNew } = useWhatsNewAutoShow();
  const { t } = useI18n();
  const { holdings, cashEntries, refreshHoldings } = usePortfolio();
  const { user } = useAuth();

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [holdings]);

  const filteredHoldings = useMemo(() => {
    if (brokerFilter === "all") return holdings;
    if (brokerFilter === "manual") return holdings.filter((h) => !h.accountId);
    return holdings.filter((h) => h.accountId === brokerFilter);
  }, [holdings, brokerFilter]);

  const filteredCashEntries = useMemo(() => {
    if (brokerFilter === "all") return cashEntries;
    if (brokerFilter === "manual") return cashEntries.filter((c) => {
      return !accounts.some((a) => c.name.toUpperCase().startsWith(a.name.toUpperCase()));
    });
    const account = accounts.find((a) => a.id === brokerFilter);
    if (!account) return [];
    return cashEntries.filter((c) => c.name.toUpperCase().startsWith(account.name.toUpperCase()));
  }, [cashEntries, brokerFilter, accounts]);

  const handleImportComplete = useCallback(() => {
    refreshHoldings();
  }, [refreshHoldings]);

  const whatsNewOpen = showWhatsNew || autoShowWhatsNew;

  const isPro = user?.plan === "pro";
  const holdingsCount = holdings.length;
  const holdingsLimit = PLATFORM_LIMITS.FREE_HOLDINGS_LIMIT;
  const showHoldingsBanner = !isPro && holdingsCount >= holdingsLimit - 2 && holdingsCount > 0;
  const holdingsAtLimit = !isPro && holdingsCount >= holdingsLimit;

  const dashboardTabs: { key: DashboardTab; label: string }[] = [
    { key: "portfolio", label: t("portfolioTab") },
    { key: "news", label: t("newsTab") },
  ];

  return (
    <>
      <DashboardToolbar
        onAddStock={() => setShowAddModal(true)}
        onOpenSettings={() => setShowSettings(true)}
        onResetPortfolio={() => setShowReset(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Dashboard Tab Bar */}
        <div className="flex gap-1.5">
          {dashboardTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeTab === tab.key
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "portfolio" && (
          <>
            {holdingsCount === 0 && (
              <a
                href="/import"
                className="block rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5 p-8 text-center hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                  <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t("importPageTitle")}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("importPageSubtitle")}</p>
                <span className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-medium">
                  {t("importNav")} →
                </span>
              </a>
            )}

            {showHoldingsBanner && !holdingsAtLimit && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm text-amber-800 dark:text-amber-200">
                    {t("holdingsUsage").replace("{used}", String(holdingsCount)).replace("{limit}", String(holdingsLimit))}
                  </span>
                </div>
              </div>
            )}

            {holdingsAtLimit && (
              <ProCompareCard surface="holdings_limit" reason="holdings_limit_reached" />
            )}

            <BrokerFilter
              accounts={accounts}
              holdings={holdings}
              selected={brokerFilter}
              onChange={setBrokerFilter}
            />

            <PortfolioSummary holdings={filteredHoldings} cashEntries={filteredCashEntries} />
            {holdingsCount > 0 && <PortfolioReviewCard />}
            <PortfolioTable holdings={filteredHoldings} />
            <PortfolioGrowthPeriods holdings={filteredHoldings} />
            <PerformanceMetrics holdings={filteredHoldings} cashEntries={filteredCashEntries} />
            <MarketAndCash holdings={filteredHoldings} cashEntries={filteredCashEntries} />
            <PortfolioProjection holdings={filteredHoldings} cashEntries={filteredCashEntries} />
          </>
        )}

        {activeTab === "news" && (
          <Suspense fallback={
            <div className="card px-6 py-10 flex items-center justify-center gap-3 text-gray-400 dark:text-slate-500 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
            </div>
          }>
            <PortfolioNewsFeed />
          </Suspense>
        )}
      </main>

      {showAddModal && (
        <AddStockModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showImport && (
        <ImportPortfolioModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {showReset && (
        <ResetPortfolioModal
          isOpen={showReset}
          onClose={() => setShowReset(false)}
        />
      )}

      {whatsNewOpen && (
        <WhatsNewModal
          isOpen={whatsNewOpen}
          onClose={() => {
            setShowWhatsNew(false);
            dismissWhatsNew();
          }}
        />
      )}

      {showFeedback && (
        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
        />
      )}

      {/* Floating feedback button */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-20 sm:bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-lg transition-colors"
        title={t("feedback")}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className="hidden sm:inline">{t("feedback")}</span>
      </button>
    </>
  );
}
