"use client";

import { useState, useCallback } from "react";
import PortfolioSummary from "./PortfolioSummary";
import PortfolioGrowthPeriods from "./PortfolioGrowthPeriods";
import PerformanceMetrics from "./PerformanceMetrics";
import PortfolioProjection from "./PortfolioProjection";
import MarketAndCash from "./MarketAndCash";
import PortfolioTable from "./PortfolioTable";
import AddStockModal from "./AddStockModal";
import SettingsModal from "./SettingsModal";
import ImportPortfolioModal from "./ImportPortfolioModal";
import ResetPortfolioModal from "./ResetPortfolioModal";
import WhatsNewModal, { useWhatsNewAutoShow } from "./WhatsNewModal";
import Header from "./Header";

export default function Dashboard() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const { showWhatsNew: autoShowWhatsNew, dismissWhatsNew } = useWhatsNewAutoShow();

  const handleImportComplete = useCallback(() => {
    window.location.reload();
  }, []);

  const whatsNewOpen = showWhatsNew || autoShowWhatsNew;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header
        onAddStock={() => setShowAddModal(true)}
        onOpenSettings={() => setShowSettings(true)}
        onImportPortfolio={() => setShowImport(true)}
        onResetPortfolio={() => setShowReset(true)}
        onWhatsNew={() => setShowWhatsNew(true)}
        hasNewRelease={autoShowWhatsNew}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PortfolioSummary />
        <PortfolioGrowthPeriods />
        <PerformanceMetrics />
        <PortfolioProjection />
        <MarketAndCash />
        <PortfolioTable />
      </main>

      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <ImportPortfolioModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImportComplete={handleImportComplete}
      />

      <ResetPortfolioModal
        isOpen={showReset}
        onClose={() => setShowReset(false)}
      />

      <WhatsNewModal
        isOpen={whatsNewOpen}
        onClose={() => {
          setShowWhatsNew(false);
          dismissWhatsNew();
        }}
      />
    </div>
  );
}
