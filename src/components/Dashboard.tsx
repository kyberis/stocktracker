"use client";

import { useState } from "react";
import PortfolioSummary from "./PortfolioSummary";
import PortfolioBenchmarkChart from "./PortfolioBenchmarkChart";
import PortfolioTable from "./PortfolioTable";
import AddStockModal from "./AddStockModal";
import SettingsModal from "./SettingsModal";
import Header from "./Header";

export default function Dashboard() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900">
      <Header
        onAddStock={() => setShowAddModal(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PortfolioSummary />
        <PortfolioBenchmarkChart />
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
    </div>
  );
}
