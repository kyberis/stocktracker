"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import TransactionHistory from "./TransactionHistory";
import DividendSummary from "./DividendSummary";
import PerformanceMetrics from "./PerformanceMetrics";
import TaxonomyView from "./TaxonomyView";
import RebalancingView from "./RebalancingView";
import AccountsManager from "./AccountsManager";
import Watchlist from "./Watchlist";
import BrokerImport from "./BrokerImport";

type Tab = "transactions" | "dividends" | "performance" | "taxonomy" | "rebalancing" | "accounts" | "watchlist" | "brokerImport";

const TABS: { key: Tab; icon: string }[] = [
  { key: "transactions", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { key: "dividends", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "performance", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { key: "taxonomy", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
  { key: "rebalancing", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" },
  { key: "accounts", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { key: "watchlist", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
  { key: "brokerImport", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
];

export default function PortfolioTools() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>("transactions");

  const tabLabel = (key: Tab): string => {
    const map: Record<Tab, string> = {
      transactions: t("transactions"),
      dividends: t("dividends"),
      performance: t("performanceMetrics"),
      taxonomy: t("taxonomy"),
      rebalancing: t("rebalancing"),
      accounts: t("accounts"),
      watchlist: t("watchlist"),
      brokerImport: t("brokerImport"),
    };
    return map[key];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800 bg-nav-bg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">{t("portfolio")}</span>
            </a>
            <span className="text-slate-600">|</span>
            <h1 className="text-lg font-bold text-white">Portfolio Tools</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tab navigation */}
        <div className="flex flex-wrap gap-1 mb-6 bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-gray-200 dark:border-slate-700 shadow-sm">
          {TABS.map(({ key, icon }) => (
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
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-6">
          {activeTab === "transactions" && <TransactionHistory />}
          {activeTab === "dividends" && <DividendSummary />}
          {activeTab === "performance" && <PerformanceMetrics />}
          {activeTab === "taxonomy" && <TaxonomyView />}
          {activeTab === "rebalancing" && <RebalancingView />}
          {activeTab === "accounts" && <AccountsManager />}
          {activeTab === "watchlist" && <Watchlist />}
          {activeTab === "brokerImport" && <BrokerImport />}
        </div>
      </main>
    </div>
  );
}
