"use client";

import { useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import PortfolioSummary from "./PortfolioSummary";
import MarketAndCash from "./MarketAndCash";
import PortfolioTable from "./PortfolioTable";
import { useWhatsNewAutoShow } from "./WhatsNewModal";
import DashboardToolbar from "./DashboardToolbar";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { PLATFORM_LIMITS } from "@/lib/platform-config";

const PortfolioGrowthPeriods = dynamic(() => import("./PortfolioGrowthPeriods"), { ssr: false });
const PerformanceMetrics = dynamic(() => import("./PerformanceMetrics"), { ssr: false });
const PortfolioProjection = dynamic(() => import("./PortfolioProjection"), { ssr: false });
const AddStockModal = dynamic(() => import("./AddStockModal"), { ssr: false });
const SettingsModal = dynamic(() => import("./SettingsModal"), { ssr: false });
const ImportPortfolioModal = dynamic(() => import("./ImportPortfolioModal"), { ssr: false });
const ResetPortfolioModal = dynamic(() => import("./ResetPortfolioModal"), { ssr: false });
const WhatsNewModal = dynamic(() => import("./WhatsNewModal"), { ssr: false });
const FeedbackModal = dynamic(() => import("./FeedbackModal"), { ssr: false });
const ProCompareCard = dynamic(() => import("./ProCompareCard"), { ssr: false });

export default function Dashboard() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const { showWhatsNew: autoShowWhatsNew, dismissWhatsNew } = useWhatsNewAutoShow();
  const { t } = useI18n();
  const { holdings, refreshHoldings } = usePortfolio();
  const { user } = useAuth();

  const handleImportComplete = useCallback(() => {
    refreshHoldings();
  }, [refreshHoldings]);

  const whatsNewOpen = showWhatsNew || autoShowWhatsNew;

  const isPro = user?.plan === "pro";
  const holdingsCount = holdings.length;
  const holdingsLimit = PLATFORM_LIMITS.FREE_HOLDINGS_LIMIT;
  const showHoldingsBanner = !isPro && holdingsCount >= holdingsLimit - 2 && holdingsCount > 0;
  const holdingsAtLimit = !isPro && holdingsCount >= holdingsLimit;

  return (
    <>
      <DashboardToolbar
        onAddStock={() => setShowAddModal(true)}
        onOpenSettings={() => setShowSettings(true)}
        onImportPortfolio={() => setShowImport(true)}
        onResetPortfolio={() => setShowReset(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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

        <PortfolioSummary />
        <PortfolioTable />
        <PortfolioGrowthPeriods />
        <PerformanceMetrics />
        <MarketAndCash />
        <PortfolioProjection />
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
