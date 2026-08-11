"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useDashboardTabUrl, type DashboardTab } from "@/lib/use-dashboard-tab-url";
import dynamic from "next/dynamic";
import Link from "next/link";
import MarketAndCash from "@/components/MarketAndCash";
import PortfolioCards from "./PortfolioCards";
import MobilePaywall from "./MobilePaywall";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { getHoldingsLimit } from "@/lib/subscription";
import { useTrack } from "@/lib/use-track";
import { initNudgeTracking, shouldShowPaywallNudge, recordPaywallNudgeShown, recordPaywallNudgeDismiss } from "@/lib/paywall-nudge";
import { useCommerceEnabled } from "@/lib/commerce";
import { hapticImpact, hapticSelectionChanged } from "@/lib/native-haptics";
import { hideNativeSplash } from "@/lib/native-splash";
import { useIsNative } from "@/lib/use-native";
import { usePortfolioSnapshotSync } from "@/lib/use-portfolio-snapshot-sync";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import DashboardTabBarQuickLinks from "@/components/DashboardTabBarQuickLinks";
import SampleDataBanner from "@/components/SampleDataBanner";
import TrialCountdownBanner from "@/components/TrialCountdownBanner";
import AidBetaCta from "@/components/aid/AidBetaCta";
import ClassicHomeBanner from "@/components/homepage/ClassicHomeBanner";
import SecureAccountPrompt from "@/components/SecureAccountPrompt";
import CloverToLogo from "@/components/CloverToLogo";
import { ChartSkeleton } from "@/components/Skeleton";
import ErrorBoundary from "@/components/ErrorBoundary";
import BackfillCTA from "@/components/portfolio-v2/BackfillCTA";
import MarketAwareBreakdown from "@/components/portfolio-v2/MarketAwareBreakdown";
import { usePortfolioHomeData } from "@/components/dashboard-v2/use-portfolio-home-data";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import type { CashEntry } from "@/lib/types";
import { investmentCashEntries } from "@/lib/portfolio-summary-cash";

const PortfolioHeroCard = dynamic(() => import("@/components/portfolio-v2/PortfolioHeroCard"), {
  ssr: false,
  loading: () => <div className="card h-[320px] animate-pulse rounded-xl bg-gray-50 dark:bg-white/[0.02]" />,
});

function CardSkeleton({ h = "h-24" }: { h?: string }) {
  return <div className={`card rounded-xl ${h} animate-pulse bg-gray-50 dark:bg-white/[0.02]`} />;
}
function TableSkeleton() {
  return <div className="card rounded-xl h-48 animate-pulse bg-gray-50 dark:bg-white/[0.02]" />;
}

const PortfolioNewsFeed = dynamic(() => import("@/components/PortfolioNewsFeed"), { ssr: false });
const TaxonomyView = dynamic(() => import("@/components/TaxonomyView"), { ssr: false });
const RebalancingView = dynamic(() => import("@/components/RebalancingView"), { ssr: false });
const DividendSummary = dynamic(() => import("@/components/DividendSummary"), { ssr: false });
const PerformancePage = dynamic(() => import("@/components/PerformancePage"), { ssr: false });
const GrowthTab = dynamic(() => import("@/components/GrowthTab"), { ssr: false });
const AddStockModal = dynamic(() => import("@/components/AddStockModal"), { ssr: false });
const AddCryptoModal = dynamic(() => import("@/components/AddCryptoModal"), { ssr: false });
const AddManualAssetModal = dynamic(() => import("@/components/AddManualAssetModal"), { ssr: false });
const ProCompareCard = dynamic(() => import("@/components/ProCompareCard"), { ssr: false });
const EventCalendar = dynamic(() => import("@/components/EventCalendar"), { ssr: false });
const ReferralShareModal = dynamic(() => import("@/components/ReferralShareModal"), { ssr: false });
const FeedbackModal = dynamic(() => import("@/components/FeedbackModal"), { ssr: false });
const SnapTradeReconnectBanner = dynamic(() => import("@/components/SnapTradeReconnectBanner"), { ssr: false });
const LeafPromoBanner = dynamic(() => import("@/components/LeafPromoBanner"), { ssr: false });
const DashboardUpgradeNudge = dynamic(() => import("@/components/DashboardUpgradeNudge"), { ssr: false });

// Sidebar/sections shared with desktop portfolio home
const PortfolioScoreCard = dynamic(() => import("@/components/dashboard-v2/PortfolioScoreCard"), { ssr: false, loading: () => <CardSkeleton /> });
const GoalPromptCard = dynamic(() => import("@/components/dashboard-v2/GoalPromptCard"), { ssr: false });
const GoalProgressCard = dynamic(() => import("@/components/dashboard-v2/GoalProgressCard"), { ssr: false });
const WeeklyDigestCard = dynamic(() => import("@/components/dashboard-v2/WeeklyDigestCard"), { ssr: false });
const DailyDigestsTeaserCard = dynamic(() => import("@/components/dashboard-v2/DailyDigestsTeaserCard"), { ssr: false });
const OnboardingChecklist = dynamic(() => import("@/components/dashboard-v2/OnboardingChecklist"), { ssr: false });
const StatsGrid = dynamic(() => import("@/components/dashboard-v2/StatsGrid"), { ssr: false, loading: () => <CardSkeleton /> });
const AssetPerformanceTable = dynamic(() => import("@/components/dashboard-v2/AssetPerformanceTable"), { ssr: false, loading: () => <TableSkeleton /> });
const AllocationTabs = dynamic(() => import("@/components/dashboard-v2/AllocationTabs"), { ssr: false, loading: () => <CardSkeleton h="h-48" /> });
const CompactDividendCard = dynamic(() => import("@/components/dashboard-v2/CompactDividendCard"), { ssr: false, loading: () => <CardSkeleton /> });
const CompactEarningsCard = dynamic(() => import("@/components/dashboard-v2/CompactEarningsCard"), { ssr: false, loading: () => <CardSkeleton /> });
const CompactReferralCard = dynamic(() => import("@/components/dashboard-v2/CompactReferralCard"), { ssr: false });
const PortfolioGrowthPeriods = dynamic(() => import("@/components/PortfolioGrowthPeriods"), { ssr: false, loading: () => <CardSkeleton /> });
const PerformanceMetrics = dynamic(() => import("@/components/PerformanceMetrics"), { ssr: false, loading: () => <CardSkeleton /> });
const GoalCelebration = dynamic(() => import("@/components/GoalCelebration"), { ssr: false });
const WarrenTrigger = dynamic(() => import("@/components/warren/WarrenTrigger"), { ssr: false });
const WarrenDrawer = dynamic(() => import("@/components/warren/WarrenDrawer"), { ssr: false });

export default function MobileDashboard() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalAssetType, setAddModalAssetType] = useState<"fund" | undefined>(undefined);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddCrypto, setShowAddCrypto] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallSurface, setPaywallSurface] = useState<string>("tab_gate");
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const { t } = useI18n();
  const { holdings, cashEntries, quotes, isLoading, refreshQuotes, activePortfolioId, portfolios, setActivePortfolio, demoMode } =
    usePortfolio();
  usePortfolioSnapshotSync({ demoMode });
  const { user, isLoading: authLoading } = useAuth();
  const commerceEnabled = useCommerceEnabled();
  const track = useTrack();
  const isNative = useIsNative();

  const userPlan = user?.plan ?? "free";
  const holdingsCount = holdings.length;
  const hasPortfolioContent = holdingsCount > 0 || cashEntries.length > 0;
  const hasMultiplePortfolios = portfolios.length > 1;
  const activeName = activePortfolioId
    ? portfolios.find((p) => p.id === activePortfolioId)?.name ?? t("portfolio")
    : hasMultiplePortfolios ? t("allPortfolios") : (portfolios[0]?.name ?? t("portfolio"));
  const holdingsLimit = getHoldingsLimit(userPlan);
  const holdingsAtLimit = !authLoading && holdingsLimit !== Infinity && holdingsCount >= holdingsLimit;
  const showHoldingsUsageBanner =
    !authLoading && holdingsLimit !== Infinity && holdingsCount >= Math.ceil(holdingsLimit / 2) && holdingsCount > 0 && !holdingsAtLimit;

  const { activeTab, navigateToTab } = useDashboardTabUrl({
    holdingsCount,
    tierGate: true,
    userPlan,
  });

  // Periodic paywall nudge for free users. State updates here drive the nudge
  // modal visibility; they run once per matching auth/plan transition.
  useEffect(() => {
    if (authLoading) return;
    initNudgeTracking();
    if (userPlan === "free" && commerceEnabled && shouldShowPaywallNudge()) {
      recordPaywallNudgeShown();
       
      setPaywallSurface("periodic_nudge");
      setShowPaywall(true);
    }
  }, [authLoading, userPlan, commerceEnabled]);

  const investmentCashOnly = useMemo<CashEntry[]>(
    () => investmentCashEntries(cashEntries),
    [cashEntries],
  );

  // Shared data-prep with desktop DashboardPortfolioV2 — guarantees mobile and
  // desktop pass identical props to PortfolioHeroCard / StatsGrid / etc.
  const home = usePortfolioHomeData({ holdings, cashEntries: investmentCashOnly });
  const {
    assetFilter,
    setAssetFilter,
    filteredHoldings,
    totals,
    cashValueBase,
    investedValueBase,
    dayGainLoss,
    dayGainLossPercent,
    dayChangePctByType,
    refreshKey,
    recalculating,
    handleRecalculate,
    handleBackfillComplete,
  } = home;

  // Used to scope sidebar-style widgets (compact cards, projections, goals) to
  // the currently-filtered slice when the user toggles asset-type pills.
  const filteredCash: CashEntry[] = assetFilter === "all" ? investmentCashOnly : [];

  const TIER_GATE: Partial<Record<DashboardTab, "pro">> = {
    metrics: "pro",
    growth: "pro",
  };

  const dashboardTabs: { key: DashboardTab; label: string; tierBadge?: "pro"; disabled?: boolean }[] = [
    { key: "portfolio", label: t("dashboardHoldingsTab") },
    { key: "diversification", label: t("diversificationTab"), disabled: holdingsCount === 0 },
    { key: "dividends", label: t("dividendsTab") },
    { key: "metrics", label: t("performanceTab"), tierBadge: "pro" as const },
    { key: "growth", label: t("growthTab"), tierBadge: "pro" as const },
    { key: "events", label: t("eventsTab") },
    { key: "news", label: t("newsTab") },
  ];

  function handleTabChange(tab: DashboardTab) {
    const tabDef = dashboardTabs.find((dt) => dt.key === tab);
    if (tabDef?.disabled) return;
    const requiredTier = TIER_GATE[tab];
    if (requiredTier) {
      const rank = { free: 0, pro: 1 };
      if (rank[userPlan as "free" | "pro"] < rank[requiredTier]) {
        setPaywallSurface(`tab_${tab}`);
        setShowPaywall(true);
        return;
      }
    }
    navigateToTab(tab);
    window.scrollTo({ top: 0, behavior: "instant" });
    track(`${tab}_tab_viewed`);
    hapticSelectionChanged();
  }

  const quotesAvailable = holdingsCount === 0 || holdings.some((h) => quotes[h.ticker]);
  // Safety net: force-show the dashboard after 12s even if quotes never arrive,
  // so users aren't stuck on the loading splash. Driven by a timer in effect so
  // we don't call Date.now() during render.
  const [timedOut, setTimedOut] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 12_000);
    return () => clearTimeout(id);
  }, []);

  const isDashboardReady =
    !isLoading && (quotesAvailable || timedOut) && (holdingsCount > 0 || cashEntries.length > 0);
  const isEmptyLoaded = !isLoading && holdingsCount === 0 && cashEntries.length === 0;

  useEffect(() => {
    if (hasLoadedOnce) return;
    if (isDashboardReady || isEmptyLoaded) {
      // Synchronize with the native splash (external system) and latch the
      // one-shot flag so we don't flash back to the loading spinner.
      hideNativeSplash();
       
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, isDashboardReady, isEmptyLoaded]);

  if ((isLoading || (!quotesAvailable && !timedOut)) && !hasLoadedOnce) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5" role="status" aria-label={t("loading")}>
        <CloverToLogo className="w-16 h-16" once delay={200} transitionMs={1400} />
        <div className="flex gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-dot-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-dot-bounce" style={{ animationDelay: "0.16s" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-dot-bounce" style={{ animationDelay: "0.32s" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      {/* Mobile header with portfolio switcher + actions */}
      <div className="glass-toolbar z-30 border-b border-[color:var(--border)] px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { if (portfolios.length > 0) { hapticImpact("Light"); setShowPortfolioPicker(true); } }}
            className="flex items-center gap-1.5 min-w-0"
            disabled={portfolios.length === 0}
          >
            <h1 className="max-w-[200px] truncate text-lg font-bold text-[color:var(--foreground)]">{activeName}</h1>
            {portfolios.length > 0 && (
              <svg className="h-4 w-4 shrink-0 text-[color:var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (isRefreshing) return;
                setIsRefreshing(true);
                try {
                  await refreshQuotes();
                } finally {
                  setIsRefreshing(false);
                }
              }}
              className="min-h-11 min-w-11 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-[color:var(--muted)] backdrop-blur-md transition-colors hover:border-white/20 hover:text-[color:var(--foreground)] disabled:opacity-60"
              aria-label={isRefreshing ? t("refreshing") : t("refreshPrices")}
              aria-busy={isRefreshing}
              disabled={isRefreshing}
            >
              <svg className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setShowAddMenu(true)}
              className={`min-h-11 min-w-11 rounded-2xl border border-white/10 p-2.5 text-white shadow-lg ${holdingsAtLimit ? "bg-amber-500" : "bg-emerald-500"}`}
              aria-label={t("addAsset")}
            >
              {holdingsAtLimit ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Same shortcuts as desktop: Holdings, Tools, News, Import, Views, More */}
        <div className="-mx-4 min-w-0 border-b border-[color:var(--border)] bg-white/[0.04] px-3 py-2 backdrop-blur-md sm:px-4">
          <DashboardTabBarQuickLinks
            variant="default"
            activeTab={activeTab}
            onSelectTab={handleTabChange}
            holdingsCount={holdingsCount}
            dataTestId="tabbar-mobile"
            dataTour="tabs"
          />
        </div>

        <TrialCountdownBanner />
        <ClassicHomeBanner />
        <AidBetaCta />
        <SnapTradeReconnectBanner />
        <LeafPromoBanner />
        <SampleDataBanner />
        <DashboardUpgradeNudge />
        <SecureAccountPrompt />
        <OnboardingChecklist
          onOpenAddStock={() => setShowAddModal(true)}
        />

        {/* Portfolio tab */}
        {activeTab === "portfolio" && (
          <div
            role="tabpanel"
            id="mtabpanel-portfolio"
            aria-label={t("dashboardHoldingsTab")}
            tabIndex={0}
            className="focus-visible:outline-none space-y-4 animate-tab-fade"
          >
            {!hasPortfolioContent && !isLoading ? (
              <MobileEmptyState onAdd={() => setShowAddModal(true)} />
            ) : (
              <>
                {showHoldingsUsageBanner && (
                  <div className="flex items-center justify-between gap-3 rounded-[20px] border border-amber-400/20 bg-amber-500/[0.12] p-3 backdrop-blur-md">
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

                <WarrenTrigger onOpen={() => setAiDrawerOpen(true)} />
                <DailyDigestsTeaserCard />
                <WeeklyDigestCard position="promoted" />
                <CompactReferralCard onShare={() => setShowReferralModal(true)} />

                <BackfillCTA holdingsCount={holdingsCount} onComplete={handleBackfillComplete} />
                <ErrorBoundary>
                  <PortfolioHeroCard
                    holdings={holdings}
                    cashEntries={investmentCashOnly}
                    assetFilter={assetFilter}
                    refreshKey={refreshKey}
                    onRecalculate={handleRecalculate}
                    recalculating={recalculating}
                    onOpenAi={() => setAiDrawerOpen(true)}
                    totalValue={totals.totalCurrentEUR}
                    investedValue={investedValueBase}
                    cashValue={cashValueBase}
                    onUpdateCash={() => {
                      if (typeof document === "undefined") return;
                      const el = document.getElementById("dashboard-cash-assets");
                      if (!el) return;
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                      el.classList.add("ring-2", "ring-emerald-400/60", "transition");
                      window.setTimeout(() => {
                        el.classList.remove("ring-2", "ring-emerald-400/60", "transition");
                      }, 1600);
                    }}
                    dayGainLoss={dayGainLoss}
                    dayGainLossPercent={dayGainLossPercent}
                    dayChangePctByType={dayChangePctByType as Partial<Record<AssetFilter, number>>}
                    breakdownSlot={
                      <MarketAwareBreakdown
                        holdings={holdings}
                        cashEntries={investmentCashOnly}
                        onFilterChange={setAssetFilter}
                        activeFilter={assetFilter}
                      />
                    }
                  />
                </ErrorBoundary>

                <StatsGrid holdings={filteredHoldings} cashEntries={filteredCash} />
                <AssetPerformanceTable holdings={filteredHoldings} cashEntries={filteredCash} />
                <AllocationTabs holdings={filteredHoldings} cashEntries={cashEntries} onShowMore={() => handleTabChange("diversification")} />
                <CompactDividendCard holdings={filteredHoldings} cashEntries={filteredCash} onNavigateToDividends={() => handleTabChange("dividends")} />
                <CompactEarningsCard onNavigateToEvents={() => handleTabChange("events")} />
                <PortfolioGrowthPeriods holdings={filteredHoldings} />
                <PerformanceMetrics holdings={filteredHoldings} cashEntries={filteredCash} />

                <PortfolioCards holdings={filteredHoldings} />
                <MarketAndCash holdings={filteredHoldings} cashEntries={cashEntries} />
                <PortfolioNewsFeed variant="compact" maxItems={10} onViewAll={() => handleTabChange("news")} />
                <GoalCelebration holdings={filteredHoldings} cashEntries={filteredCash} />

                <PortfolioScoreCard holdings={filteredHoldings} cashEntries={filteredCash} />
                <GoalProgressCard holdings={filteredHoldings} cashEntries={filteredCash} />
                <GoalPromptCard holdings={filteredHoldings} />
                <WeeklyDigestCard position="default" />

                {holdingsAtLimit && (
                  <ProCompareCard surface="holdings_limit" reason="holdings_limit_reached" />
                )}
              </>
            )}
          </div>
        )}

        {/* Diversification tab */}
        {activeTab === "diversification" && (
          <div role="tabpanel" id="mtabpanel-diversification" aria-label={t("diversificationTab")} tabIndex={0} className="focus-visible:outline-none space-y-4 animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <TaxonomyView />
              <RebalancingView />
            </Suspense>
          </div>
        )}

        {/* Dividends tab */}
        {activeTab === "dividends" && (
          <div role="tabpanel" id="mtabpanel-dividends" aria-label={t("dividendsTab")} tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <DividendSummary />
            </Suspense>
          </div>
        )}

        {/* Metrics tab */}
        {activeTab === "metrics" && (
          <div role="tabpanel" id="mtabpanel-metrics" aria-label={t("performanceTab")} tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <PerformancePage holdings={filteredHoldings} cashEntries={investmentCashOnly} />
            </Suspense>
          </div>
        )}

        {/* Growth tab */}
        {activeTab === "growth" && (
          <div role="tabpanel" id="mtabpanel-growth" aria-label={t("growthTab")} tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <GrowthTab />
            </Suspense>
          </div>
        )}

        {/* Events tab */}
        {activeTab === "events" && (
          <div role="tabpanel" id="mtabpanel-events" aria-label={t("eventsTab")} tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <EventCalendar />
            </Suspense>
          </div>
        )}

        {/* News tab */}
        {activeTab === "news" && (
          <div role="tabpanel" id="mtabpanel-news" aria-label={t("newsTab")} tabIndex={0} className="focus-visible:outline-none animate-tab-fade">
            <Suspense fallback={<ChartSkeleton />}>
              <PortfolioNewsFeed />
            </Suspense>
          </div>
        )}
      </div>

      {/* Add asset action sheet */}
      {showAddMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAddMenu(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-add-asset-title"
            className="glass-overlay relative w-full max-w-lg rounded-t-3xl animate-slide-up shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
            onKeyDown={(e) => { if (e.key === "Escape") setShowAddMenu(false); }}
          >
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-white/18" />
            </div>
            <div className="px-5 pb-2 pt-1">
              <h2 id="mobile-add-asset-title" className="text-base font-bold text-[color:var(--foreground)]">{t("addAsset")}</h2>
            </div>
            <div className="px-2 pb-6 space-y-1">
              <button
                onClick={() => { setShowAddMenu(false); setAddModalAssetType(undefined); setShowAddModal(true); hapticImpact("Light"); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:bg-gray-100 dark:active:bg-slate-800 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t("addStock")}</p>
                </div>
              </button>
              <button
                onClick={() => { setShowAddMenu(false); setAddModalAssetType("fund"); setShowAddModal(true); hapticImpact("Light"); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:bg-gray-100 dark:active:bg-slate-800 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t("addFund")}</p>
                </div>
              </button>
              <button
                onClick={() => { setShowAddMenu(false); setShowAddCrypto(true); hapticImpact("Light"); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:bg-gray-100 dark:active:bg-slate-800 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-[#f7931a] flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">₿</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t("addCrypto")}</p>
                </div>
                <TierFeatureBadge requiredPlan="pro" size="xs" />
              </button>
              <button
                onClick={() => { setShowAddMenu(false); setShowAddAsset(true); hapticImpact("Light"); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:bg-gray-100 dark:active:bg-slate-800 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm">🏠</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t("addManualAsset")}</p>
                </div>
                <TierFeatureBadge requiredPlan="pro" size="xs" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddStockModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setAddModalAssetType(undefined);
          }}
          initialAssetType={addModalAssetType}
        />
      )}

      {showAddCrypto && (
        <AddCryptoModal isOpen={showAddCrypto} onClose={() => setShowAddCrypto(false)} />
      )}

      {showAddAsset && (
        <AddManualAssetModal isOpen={showAddAsset} onClose={() => setShowAddAsset(false)} />
      )}

      {showPaywall && commerceEnabled && (
        <MobilePaywall
          surface={paywallSurface}
          onDismiss={() => {
            recordPaywallNudgeDismiss();
            setShowPaywall(false);
          }}
        />
      )}

      {showReferralModal && (
        <ReferralShareModal
          isOpen={showReferralModal}
          onClose={() => setShowReferralModal(false)}
        />
      )}

      {/* Holdings limit paywall trigger */}
      {holdingsAtLimit && !showPaywall && userPlan === "free" && commerceEnabled && (
        <div className="fixed bottom-16 left-4 right-4 z-40">
          <button
            onClick={() => { setPaywallSurface("holdings_limit"); setShowPaywall(true); }}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {t("upgradeToAddMoreHoldings")}
          </button>
        </div>
      )}

      {/* Floating feedback button — web mobile only */}
      {!isNative && (
        <div className="fixed bottom-20 right-4 z-30">
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-lg transition-colors"
            title={t("feedback")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        </div>
      )}

      {showFeedback && (
        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
        />
      )}

      <WarrenDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />

      {/* Portfolio picker bottom sheet */}
      {showPortfolioPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowPortfolioPicker(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-portfolio-picker-title"
            className="glass-overlay relative w-full max-w-lg rounded-t-3xl animate-slide-up shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
            onKeyDown={(e) => { if (e.key === "Escape") setShowPortfolioPicker(false); }}
          >
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-white/18" />
            </div>
            <div className="px-5 pb-2 pt-1">
              <h2 id="mobile-portfolio-picker-title" className="text-base font-bold text-[color:var(--foreground)]">{t("portfolio")}</h2>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-2 pb-6">
              {hasMultiplePortfolios && (
                <button
                  onClick={() => { hapticImpact("Light"); setActivePortfolio(null); setShowPortfolioPicker(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
                    !activePortfolioId
                      ? "bg-emerald-50 dark:bg-emerald-500/10"
                      : "active:bg-gray-100 dark:active:bg-slate-800"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    !activePortfolioId
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                  }`}>
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${!activePortfolioId ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                      {t("allPortfolios")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {t("portfoliosCount").replace("{count}", String(portfolios.length))}
                    </p>
                  </div>
                  {!activePortfolioId && (
                    <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              )}
              {portfolios.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { hapticImpact("Light"); setActivePortfolio(p.id); setShowPortfolioPicker(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
                    activePortfolioId === p.id
                      ? "bg-emerald-50 dark:bg-emerald-500/10"
                      : "active:bg-gray-100 dark:active:bg-slate-800"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activePortfolioId === p.id
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                  }`}>
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${activePortfolioId === p.id ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {p.currency}{p.isDefault ? ` · ${t("defaultPortfolioLabel")}` : ""}
                    </p>
                  </div>
                  {activePortfolioId === p.id && (
                    <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileEmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();
  return (
    <div className="text-center py-12 space-y-6">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("emptyStateTitle")}</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mx-auto">{t("emptyStateSubtitle")}</p>
      <div className="space-y-3 max-w-xs mx-auto">
        <button
          onClick={onAdd}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-medium shadow-md"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t("addStock")}
        </button>
        <Link
          href="/import"
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {t("importNav")}
        </Link>
      </div>
    </div>
  );
}
