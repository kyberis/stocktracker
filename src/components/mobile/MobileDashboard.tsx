"use client";

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import PortfolioSummary from "@/components/PortfolioSummary";
import MarketAndCash from "@/components/MarketAndCash";
import PortfolioCards from "./PortfolioCards";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { getHoldingsLimit } from "@/lib/subscription";
import { useTrack } from "@/lib/use-track";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import SampleDataBanner from "@/components/SampleDataBanner";
import { HeroSkeleton, ChartSkeleton } from "@/components/Skeleton";
import type { Account } from "@/lib/types";

const GoalProgressBanner = dynamic(() => import("@/components/GoalProgressBanner"), { ssr: false });
const PortfolioNewsFeed = dynamic(() => import("@/components/PortfolioNewsFeed"), { ssr: false });
const TaxonomyView = dynamic(() => import("@/components/TaxonomyView"), { ssr: false });
const DividendSummary = dynamic(() => import("@/components/DividendSummary"), { ssr: false });
const MetricsTab = dynamic(() => import("@/components/MetricsTab"), { ssr: false });
const GrowthTab = dynamic(() => import("@/components/GrowthTab"), { ssr: false });
const AddStockModal = dynamic(() => import("@/components/AddStockModal"), { ssr: false });
const ProCompareCard = dynamic(() => import("@/components/ProCompareCard"), { ssr: false });
const CryptoPortfolioTab = dynamic(() => import("@/components/CryptoPortfolioTab"), { ssr: false });
const EventCalendar = dynamic(() => import("@/components/EventCalendar"), { ssr: false });
const UpcomingEarnings = dynamic(() => import("@/components/UpcomingEarnings"), { ssr: false });

type DashboardTab = "portfolio" | "crypto" | "diversification" | "dividends" | "metrics" | "growth" | "events" | "news";

export default function MobileDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("portfolio");
  const [showAddModal, setShowAddModal] = useState(false);
  const { t } = useI18n();
  const { holdings, cashEntries, isLoading, refreshHoldings, refreshQuotes, activePortfolioId } = usePortfolio();
  const { user, isLoading: authLoading } = useAuth();
  const track = useTrack();

  const isPro = user?.plan === "pro";
  const holdingsCount = holdings.length;
  const holdingsLimit = getHoldingsLimit(user?.plan ?? "free");
  const holdingsAtLimit = !authLoading && holdingsLimit !== Infinity && holdingsCount >= holdingsLimit;

  const filteredHoldings = holdings;
  const investmentCashEntries = useMemo(
    () => cashEntries.filter((c) => !c.type || c.type === "cash"),
    [cashEntries],
  );

  const hasCryptoHoldings = holdings.some((h) => h.assetType === "crypto");

  const dashboardTabs: { key: DashboardTab; label: string; tierBadge?: "starter" | "pro" }[] = [
    { key: "portfolio", label: t("portfolioTab") },
    ...(isPro || hasCryptoHoldings
      ? [{ key: "crypto" as const, label: t("cryptoTab"), tierBadge: "pro" as const }]
      : []),
    { key: "diversification", label: t("diversificationTab") },
    { key: "dividends", label: t("dividendsTab") },
    { key: "metrics", label: t("metricsTab"), tierBadge: "starter" as const },
    { key: "growth", label: t("growthTab"), tierBadge: "starter" as const },
    { key: "events", label: t("eventsTab") },
    { key: "news", label: t("newsTab") },
  ];

  function handleTabChange(tab: DashboardTab) {
    setActiveTab(tab);
    track(`${tab}_tab_viewed`);
  }

  const hasLoadedOnce = useRef(false);
  if (!isLoading && (holdingsCount > 0 || cashEntries.length > 0)) {
    hasLoadedOnce.current = true;
  }

  if (isLoading && !hasLoadedOnce.current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5" role="status" aria-label={t("loading")}>
        <svg className="animate-logo-breathe" width="56" height="56" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="#0f172a"/>
          <g transform="translate(16,16) rotate(45)">
            <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#mlb-a)"/>
            <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#mlb-b)" transform="rotate(90)"/>
            <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#mlb-c)" transform="rotate(180)"/>
            <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#mlb-d)" transform="rotate(270)"/>
            <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35"/>
          </g>
          <defs>
            <linearGradient id="mlb-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
            <linearGradient id="mlb-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
            <linearGradient id="mlb-c" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/></linearGradient>
            <linearGradient id="mlb-d" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#a7f3d0"/><stop offset="100%" stopColor="#34d399"/></linearGradient>
          </defs>
        </svg>
        <div className="flex gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-dot-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-dot-bounce" style={{ animationDelay: "0.16s" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-dot-bounce" style={{ animationDelay: "0.32s" }} />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile header with portfolio name + add button */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t("portfolioTab")}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => { await refreshQuotes(); }}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              aria-label={t("refreshing")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {!holdingsAtLimit && (
              <button
                onClick={() => setShowAddModal(true)}
                className="p-2 rounded-xl bg-emerald-500 text-white"
                aria-label={t("addStock")}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Tab bar — horizontal scroll pills */}
        <div
          role="tablist"
          aria-label={t("portfolioTab")}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1"
        >
          {dashboardTabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              id={`mtab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls={`mtabpanel-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => handleTabChange(tab.key)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                activeTab === tab.key
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
              }`}
            >
              {tab.label}
              {tab.tierBadge && <TierFeatureBadge requiredPlan={tab.tierBadge} size="xs" className="ml-1" />}
            </button>
          ))}
        </div>

        <SampleDataBanner />

        {/* Portfolio tab */}
        {activeTab === "portfolio" && (
          <div
            role="tabpanel"
            id="mtabpanel-portfolio"
            aria-labelledby="mtab-portfolio"
            tabIndex={0}
            className="focus-visible:outline-none space-y-4 animate-tab-fade"
          >
            {holdingsCount === 0 && !isLoading ? (
              <MobileEmptyState onAdd={() => setShowAddModal(true)} />
            ) : (
              <>
                <PortfolioSummary holdings={filteredHoldings} cashEntries={investmentCashEntries} allCashEntries={cashEntries} />
                <GoalProgressBanner holdings={filteredHoldings} cashEntries={investmentCashEntries} />
                <PortfolioCards holdings={filteredHoldings} />
                <UpcomingEarnings onNavigateToEvents={() => handleTabChange("events")} />
                <MarketAndCash holdings={filteredHoldings} cashEntries={cashEntries} />

                {holdingsAtLimit && (
                  <ProCompareCard surface="holdings_limit" reason="holdings_limit_reached" />
                )}
              </>
            )}
          </div>
        )}

        {/* Crypto tab */}
        {activeTab === "crypto" && (
          <div role="tabpanel" id="mtabpanel-crypto" aria-labelledby="mtab-crypto" tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <CryptoPortfolioTab holdings={filteredHoldings} />
            </Suspense>
          </div>
        )}

        {/* Diversification tab */}
        {activeTab === "diversification" && (
          <div role="tabpanel" id="mtabpanel-diversification" aria-labelledby="mtab-diversification" tabIndex={0} className="focus-visible:outline-none space-y-4 animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <TaxonomyView />
            </Suspense>
          </div>
        )}

        {/* Dividends tab */}
        {activeTab === "dividends" && (
          <div role="tabpanel" id="mtabpanel-dividends" aria-labelledby="mtab-dividends" tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <DividendSummary />
            </Suspense>
          </div>
        )}

        {/* Metrics tab */}
        {activeTab === "metrics" && (
          <div role="tabpanel" id="mtabpanel-metrics" aria-labelledby="mtab-metrics" tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <MetricsTab holdings={filteredHoldings} cashEntries={investmentCashEntries} />
            </Suspense>
          </div>
        )}

        {/* Growth tab */}
        {activeTab === "growth" && (
          <div role="tabpanel" id="mtabpanel-growth" aria-labelledby="mtab-growth" tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <GrowthTab />
            </Suspense>
          </div>
        )}

        {/* Events tab */}
        {activeTab === "events" && (
          <div role="tabpanel" id="mtabpanel-events" aria-labelledby="mtab-events" tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <EventCalendar />
            </Suspense>
          </div>
        )}

        {/* News tab */}
        {activeTab === "news" && (
          <div role="tabpanel" id="mtabpanel-news" aria-labelledby="mtab-news" tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <PortfolioNewsFeed />
            </Suspense>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddStockModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      )}
    </>
  );
}

function MobileEmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();
  return (
    <div className="text-center py-12 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("emptyStateTitle")}</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mx-auto">{t("emptyStateSubtitle")}</p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-medium shadow-md"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {t("addStock")}
      </button>
    </div>
  );
}
