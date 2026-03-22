"use client";

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import DashboardToolbar from "./DashboardToolbar";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { getHoldingsLimit } from "@/lib/subscription";
import { useTrack } from "@/lib/use-track";
import { useTheme } from "@/lib/theme-context";
import { useIsNative } from "@/lib/use-native";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";
import CloverToLogo from "./CloverToLogo";
import PortfolioPickerModal from "./PortfolioPickerModal";

const MobileDashboard = dynamic(() => import("./mobile/MobileDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <CloverToLogo className="w-16 h-16" once delay={200} transitionMs={1400} />
      <div className="flex gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-dot-bounce" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-dot-bounce" style={{ animationDelay: "0.16s" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-dot-bounce" style={{ animationDelay: "0.32s" }} />
      </div>
    </div>
  ),
});

const PortfolioNewsFeed = dynamic(() => import("./PortfolioNewsFeed"), { ssr: false });
const TaxonomyView = dynamic(() => import("./TaxonomyView"), { ssr: false });
const RebalancingView = dynamic(() => import("./RebalancingView"), { ssr: false });
const DividendSummary = dynamic(() => import("./DividendSummary"), { ssr: false });
const PerformancePage = dynamic(() => import("./PerformancePage"), { ssr: false });
const GrowthTab = dynamic(() => import("./GrowthTab"), { ssr: false });
const AddStockModal = dynamic(() => import("./AddStockModal"), { ssr: false });
const SettingsModal = dynamic(() => import("./SettingsModal"), { ssr: false });
const ImportPortfolioModal = dynamic(() => import("./ImportPortfolioModal"), { ssr: false });
const ResetPortfolioModal = dynamic(() => import("./ResetPortfolioModal"), { ssr: false });
const FeedbackModal = dynamic(() => import("./FeedbackModal"), { ssr: false });
const ProCompareCard = dynamic(() => import("./ProCompareCard"), { ssr: false });
const LeafPromoBanner = dynamic(() => import("./LeafPromoBanner"), { ssr: false });
const SnapTradeReconnectBanner = dynamic(() => import("./SnapTradeReconnectBanner"), { ssr: false });
const AddCryptoModal = dynamic(() => import("./AddCryptoModal"), { ssr: false });
const EventCalendar = dynamic(() => import("./EventCalendar"), { ssr: false });
const AddManualAssetModal = dynamic(() => import("./AddManualAssetModal"), { ssr: false });
const SupportChatWidget = dynamic(() => import("./SupportChatWidget"), { ssr: false });
const ReferralShareModal = dynamic(() => import("./ReferralShareModal"), { ssr: false });
import { usePortfolioSnapshotSync } from "@/lib/use-portfolio-snapshot-sync";
import TierFeatureBadge from "./TierFeatureBadge";
import SampleDataBanner from "./SampleDataBanner";
import SecureAccountPrompt from "./SecureAccountPrompt";

const DashboardUpgradeNudge = dynamic(() => import("./DashboardUpgradeNudge"), { ssr: false });
const TrialCountdownBanner = dynamic(() => import("./TrialCountdownBanner"), { ssr: false });
const OnboardingChecklist = dynamic(() => import("./dashboard-v2/OnboardingChecklist"), { ssr: false });
import { HeroSkeleton, TableSkeleton, ChartSkeleton } from "./Skeleton";


type DashboardTab = "portfolio" | "diversification" | "dividends" | "metrics" | "growth" | "events" | "news";

function EmptyPortfolio({ onAddStock }: { onAddStock: () => void }) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("emptyStateTitle")}</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">{t("emptyStateSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Import from broker CSV */}
        <a
          href="/import"
          className="group card p-5 flex flex-col items-center text-center hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all hover:shadow-md"
        >
          <div className="w-12 h-12 mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t("emptyStateImport")}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("emptyStateImportDesc")}</p>
        </a>

        {/* Add manually */}
        <button
          onClick={onAddStock}
          className="group card p-5 flex flex-col items-center text-center hover:border-violet-400 dark:hover:border-violet-500/40 transition-all hover:shadow-md"
        >
          <div className="w-12 h-12 mb-3 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t("addStock")}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("emptyStateAddDesc")}</p>
        </button>

      </div>
    </div>
  );
}

export default function Dashboard() {
  const isNative = useIsNative();
  const isMobileViewport = useIsMobileViewport();
  if (isNative || isMobileViewport) return <MobileDashboard />;
  return <DesktopDashboard />;
}

const DashboardPortfolioV2 = dynamic(() => import("./dashboard-v2/DashboardPortfolioV2"), { ssr: false });

function DesktopDashboard() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCrypto, setShowAddCrypto] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [supportChatEnabled, setSupportChatEnabled] = useState(false);
  const [supportChatWelcome, setSupportChatWelcome] = useState("");
  const [activeTab, setActiveTab] = useState<DashboardTab>("portfolio");
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);
  const [pendingAction, setPendingAction] = useState<"stock" | "crypto" | "asset" | null>(null);
  const { t } = useI18n();
  const { holdings, cashEntries, isInitializing, refreshHoldings, refreshQuotes, activePortfolioId, portfolios, demoMode } =
    usePortfolio();
  usePortfolioSnapshotSync({ demoMode });
  const { user, isLoading: authLoading } = useAuth();
  const track = useTrack();
  const { layoutTheme } = useTheme();

  const needsPortfolioPick = !activePortfolioId && portfolios.length > 1;

  const gatedAdd = useCallback((action: "stock" | "crypto" | "asset") => {
    if (needsPortfolioPick) {
      setPendingAction(action);
      setShowPortfolioPicker(true);
    } else if (action === "stock") {
      setShowAddModal(true);
    } else if (action === "crypto") {
      setShowAddCrypto(true);
    } else {
      setShowAddAsset(true);
    }
  }, [needsPortfolioPick]);


  useEffect(() => {
    if (holdings.length === 0 && activeTab === "diversification") {
      setActiveTab("portfolio");
    }
  }, [holdings.length, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch("/api/support-chat/config")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setSupportChatEnabled(data.enabled);
            setSupportChatWelcome(data.welcomeMessage || "");
          }
        })
        .catch(() => {});
    }, 3_000);
    return () => clearTimeout(timer);
  }, []);

  const investmentCashEntries = useMemo(
    () => cashEntries.filter((c) => !c.type || c.type === "cash"),
    [cashEntries],
  );

  const handleImportComplete = useCallback(async () => {
    await refreshHoldings();
    await refreshQuotes();
  }, [refreshHoldings, refreshQuotes]);

  const isPro = user?.plan === "pro";
  const holdingsCount = holdings.length;
  const holdingsLimit = getHoldingsLimit(user?.plan ?? "free");
  const showHoldingsBanner = !authLoading && holdingsLimit !== Infinity && holdingsCount >= Math.ceil(holdingsLimit / 2) && holdingsCount > 0;
  const holdingsAtLimit = !authLoading && holdingsLimit !== Infinity && holdingsCount >= holdingsLimit;

  const dashboardTabs: { key: DashboardTab; label: string; tierBadge?: "starter" | "pro"; disabled?: boolean }[] = [
    { key: "portfolio", label: t("portfolioTab") },
    { key: "diversification", label: t("diversificationTab"), disabled: holdingsCount === 0 },
    { key: "dividends", label: t("dividendsTab") },
    { key: "metrics", label: t("performanceTab"), tierBadge: "starter" as const },
    { key: "growth", label: t("growthTab"), tierBadge: "starter" as const },
    { key: "events", label: t("eventsTab") },
    { key: "news", label: t("newsTab") },
  ];

  function handleTabChange(tab: DashboardTab) {
    setActiveTab(tab);
    if (tab === "diversification") track("diversification_tab_viewed");
    if (tab === "dividends") track("dividends_tab_viewed");
    if (tab === "metrics") track("metrics_tab_viewed");
    if (tab === "growth") track("growth_tab_viewed");
    if (tab === "events") track("events_tab_viewed");
  }

  function handleTabKeyDown(e: React.KeyboardEvent) {
    const enabledTabs = dashboardTabs.filter((dt) => !dt.disabled);
    const keys = enabledTabs.map((dt) => dt.key);
    const idx = keys.indexOf(activeTab);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (idx + 1) % keys.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (idx - 1 + keys.length) % keys.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = keys.length - 1;
    }
    if (next >= 0) {
      e.preventDefault();
      handleTabChange(keys[next]);
      document.getElementById(`tab-${keys[next]}`)?.focus();
    }
  }

  const hasLoadedOnce = useRef(false);
  if (!isInitializing && (holdingsCount > 0 || cashEntries.length > 0)) {
    hasLoadedOnce.current = true;
  }

  if (isInitializing && !hasLoadedOnce.current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5" role="status" aria-label={t("loading")}>
        <CloverToLogo className="w-20 h-20" once delay={200} transitionMs={1400} />
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
      <DashboardToolbar
        onAddStock={() => gatedAdd("stock")}
        onAddCrypto={() => gatedAdd("crypto")}
        onAddAsset={() => gatedAdd("asset")}
        onOpenSettings={() => setShowSettings(true)}
        onResetPortfolio={() => setShowReset(true)}
      />

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-6 ${layoutTheme === "terminal" ? "space-y-2 sm:space-y-4" : layoutTheme === "canvas" ? "space-y-5 sm:space-y-10" : "space-y-4 sm:space-y-8"}`}>
        {/* Dashboard Tab Bar — theme-aware */}
        {layoutTheme === "terminal" ? (
          <div role="tablist" aria-label={t("portfolioTab")} className="flex gap-0 overflow-x-auto scrollbar-hide border-b border-zinc-800 font-mono" data-testid="tabbar-terminal" data-tour="tabs" onKeyDown={handleTabKeyDown}>
            {dashboardTabs.map((tab) => (
              <button key={tab.key} role="tab" id={`tab-${tab.key}`} aria-selected={activeTab === tab.key} aria-controls={`tabpanel-${tab.key}`} tabIndex={activeTab === tab.key ? 0 : -1} disabled={tab.disabled} aria-disabled={tab.disabled} onClick={() => !tab.disabled && handleTabChange(tab.key)}
                className={`shrink-0 px-3 py-1.5 text-xs transition-colors focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:outline-none border-b-2 ${tab.disabled ? "border-transparent text-zinc-700 opacity-40 cursor-not-allowed" : activeTab === tab.key ? "border-green-500 text-green-400" : "border-transparent text-zinc-600 hover:text-zinc-300"}`}
              >
                {tab.label.toLowerCase()}
                {tab.tierBadge && <TierFeatureBadge requiredPlan={tab.tierBadge} size="xs" className="ml-1" />}
              </button>
            ))}
          </div>
        ) : layoutTheme === "canvas" ? (
          <div role="tablist" aria-label={t("portfolioTab")} className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible scrollbar-hide" data-testid="tabbar-canvas" data-tour="tabs" onKeyDown={handleTabKeyDown}>
            {dashboardTabs.map((tab) => (
              <button key={tab.key} role="tab" id={`tab-${tab.key}`} aria-selected={activeTab === tab.key} aria-controls={`tabpanel-${tab.key}`} tabIndex={activeTab === tab.key ? 0 : -1} disabled={tab.disabled} aria-disabled={tab.disabled} onClick={() => !tab.disabled && handleTabChange(tab.key)}
                className={`shrink-0 px-5 py-2.5 text-sm font-medium rounded-full transition-all focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:outline-none ${tab.disabled ? "bg-white text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed" : activeTab === tab.key ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-800"}`}
              >
                {tab.label}
                {tab.tierBadge && <TierFeatureBadge requiredPlan={tab.tierBadge} size="xs" className="ml-1" />}
              </button>
            ))}
          </div>
        ) : layoutTheme === "studio" ? (
          <div role="tablist" aria-label={t("portfolioTab")} className="flex gap-0 overflow-x-auto scrollbar-hide border-b border-white/10" data-testid="tabbar-studio" data-tour="tabs" onKeyDown={handleTabKeyDown}>
            {dashboardTabs.map((tab) => (
              <button key={tab.key} role="tab" id={`tab-${tab.key}`} aria-selected={activeTab === tab.key} aria-controls={`tabpanel-${tab.key}`} tabIndex={activeTab === tab.key ? 0 : -1} disabled={tab.disabled} aria-disabled={tab.disabled} onClick={() => !tab.disabled && handleTabChange(tab.key)}
                className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none border-b-2 ${tab.disabled ? "border-transparent text-zinc-700 opacity-40 cursor-not-allowed" : activeTab === tab.key ? "border-emerald-400 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                {tab.label}
                {tab.tierBadge && <TierFeatureBadge requiredPlan={tab.tierBadge} size="xs" className="ml-1" />}
              </button>
            ))}
          </div>
        ) : (
          <div role="tablist" aria-label={t("portfolioTab")} className="flex gap-1 overflow-x-auto sm:flex-wrap sm:overflow-visible scrollbar-hide bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-gray-200 dark:border-slate-700 shadow-sm" data-testid="tabbar-default" data-tour="tabs" onKeyDown={handleTabKeyDown}>
            {dashboardTabs.map((tab) => (
              <button key={tab.key} role="tab" id={`tab-${tab.key}`} aria-selected={activeTab === tab.key} aria-controls={`tabpanel-${tab.key}`} tabIndex={activeTab === tab.key ? 0 : -1} disabled={tab.disabled} aria-disabled={tab.disabled} onClick={() => !tab.disabled && handleTabChange(tab.key)}
                className={`shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${tab.disabled ? "text-gray-400 dark:text-slate-600 opacity-50 cursor-not-allowed" : activeTab === tab.key ? "bg-emerald-500 text-white shadow-sm" : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"}`}
              >
                {tab.label}
                {tab.tierBadge && <TierFeatureBadge requiredPlan={tab.tierBadge} size="xs" className="ml-1" />}
              </button>
            ))}
          </div>
        )}

        <TrialCountdownBanner />
        <SnapTradeReconnectBanner />
        <LeafPromoBanner />
        <SampleDataBanner />
        <DashboardUpgradeNudge />
        <SecureAccountPrompt />

        {activeTab === "portfolio" && (
          <div
            role="tabpanel"
            id="tabpanel-portfolio"
            aria-labelledby="tab-portfolio"
            tabIndex={0}
            className="focus-visible:outline-none space-y-6 animate-tab-fade"
          >
            <OnboardingChecklist
              onOpenAddStock={() => gatedAdd("stock")}
              onNavigateTools={() => { window.location.href = "/tools"; }}
              onNavigateAlerts={() => { window.location.href = "/tools?tab=alerts"; }}
            />
            {isInitializing && holdingsCount === 0 ? (
              <div className="space-y-6">
                <HeroSkeleton />
                <TableSkeleton rows={4} />
              </div>
            ) : holdingsCount === 0 ? (
              <EmptyPortfolio
                onAddStock={() => gatedAdd("stock")}
              />
            ) : (
              <>
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

                <DashboardPortfolioV2
                  holdings={holdings}
                  cashEntries={investmentCashEntries}
                  allCashEntries={cashEntries}
                  onAddStock={() => gatedAdd("stock")}
                  onNavigateToEvents={() => handleTabChange("events")}
                  onNavigateToDividends={() => handleTabChange("dividends")}
                  onNavigateToDiversification={() => handleTabChange("diversification")}
                  onShareReferral={() => setShowReferralModal(true)}
                />

                {holdingsAtLimit && (
                  <ProCompareCard surface="holdings_limit" reason="holdings_limit_reached" />
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "diversification" && (
          <div
            role="tabpanel"
            id="tabpanel-diversification"
            aria-labelledby="tab-diversification"
            tabIndex={0}
            className="focus-visible:outline-none space-y-6 animate-tab-fade"
          >
            <Suspense fallback={
              <ChartSkeleton />
            }>
              <TaxonomyView />
              <RebalancingView />
            </Suspense>
          </div>
        )}

        {activeTab === "dividends" && (
          <div
            role="tabpanel"
            id="tabpanel-dividends"
            aria-labelledby="tab-dividends"
            tabIndex={0}
            className="focus-visible:outline-none animate-tab-fade"
          >
            <Suspense fallback={
              <ChartSkeleton />
            }>
              <DividendSummary />
            </Suspense>
          </div>
        )}

        {activeTab === "metrics" && (
          <div
            role="tabpanel"
            id="tabpanel-metrics"
            aria-labelledby="tab-metrics"
            tabIndex={0}
            className="focus-visible:outline-none animate-tab-fade"
          >
            <Suspense fallback={
              <ChartSkeleton />
            }>
              <PerformancePage holdings={holdings} cashEntries={investmentCashEntries} />
            </Suspense>
          </div>
        )}

        {activeTab === "growth" && (
          <div
            role="tabpanel"
            id="tabpanel-growth"
            aria-labelledby="tab-growth"
            tabIndex={0}
            className="focus-visible:outline-none animate-tab-fade"
          >
            <Suspense fallback={
              <ChartSkeleton />
            }>
              <GrowthTab />
            </Suspense>
          </div>
        )}

        {activeTab === "events" && (
          <div
            role="tabpanel"
            id="tabpanel-events"
            aria-labelledby="tab-events"
            tabIndex={0}
            className="focus-visible:outline-none animate-tab-fade"
          >
            <Suspense fallback={
              <ChartSkeleton />
            }>
              <EventCalendar />
            </Suspense>
          </div>
        )}

        {activeTab === "news" && (
          <div
            role="tabpanel"
            id="tabpanel-news"
            aria-labelledby="tab-news"
            tabIndex={0}
            className="focus-visible:outline-none animate-tab-fade"
          >
            <Suspense fallback={
              <ChartSkeleton />
            }>
              <PortfolioNewsFeed />
            </Suspense>
          </div>
        )}
      </main>

      <PortfolioPickerModal
        isOpen={showPortfolioPicker}
        onClose={() => { setShowPortfolioPicker(false); setPendingAction(null); }}
        onSelect={() => {
          setShowPortfolioPicker(false);
          if (pendingAction === "stock") setShowAddModal(true);
          else if (pendingAction === "crypto") setShowAddCrypto(true);
          else if (pendingAction === "asset") setShowAddAsset(true);
          setPendingAction(null);
        }}
      />

      {showAddModal && (
        <AddStockModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showAddCrypto && (
        <AddCryptoModal
          isOpen={showAddCrypto}
          onClose={() => setShowAddCrypto(false)}
        />
      )}

      {showAddAsset && (
        <AddManualAssetModal
          isOpen={showAddAsset}
          onClose={() => setShowAddAsset(false)}
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

      {showFeedback && (
        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
        />
      )}

      {showSupportChat && (
        <SupportChatWidget
          isOpen={showSupportChat}
          onClose={() => setShowSupportChat(false)}
          onEscalate={() => {
            setShowSupportChat(false);
            setShowFeedback(true);
          }}
          welcomeMessage={supportChatWelcome}
        />
      )}

      {showReferralModal && (
        <ReferralShareModal
          isOpen={showReferralModal}
          onClose={() => setShowReferralModal(false)}
        />
      )}

      {/* Floating buttons */}
      <div className="fixed bottom-20 sm:bottom-6 right-6 z-30 flex flex-col gap-2 items-end">
        {supportChatEnabled && (user?.plan === "starter" || user?.plan === "pro") && (
          <button
            onClick={() => setShowSupportChat((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-lg transition-colors"
            title={t("supportChatTitle")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="hidden sm:inline">{t("supportChatTitle")}</span>
          </button>
        )}
        <button
          onClick={() => setShowFeedback(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-lg transition-colors"
          title={t("feedback")}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="hidden sm:inline">{t("feedback")}</span>
        </button>
      </div>
    </>
  );
}
