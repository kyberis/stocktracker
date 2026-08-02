"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useDashboardTabUrl, type DashboardTab } from "@/lib/use-dashboard-tab-url";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import { usePortfolioCommand } from "@/contexts/portfolio-command-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { getHoldingsLimit } from "@/lib/subscription";
import { useTrack } from "@/lib/use-track";
import { useTheme } from "@/lib/theme-context";
import { useIsNative } from "@/lib/use-native";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";
import { investmentCashEntries } from "@/lib/portfolio-summary-cash";
import CloverToLogo from "./CloverToLogo";

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
const FeedbackModal = dynamic(() => import("./FeedbackModal"), { ssr: false });
const ProCompareCard = dynamic(() => import("./ProCompareCard"), { ssr: false });
const LeafPromoBanner = dynamic(() => import("./LeafPromoBanner"), { ssr: false });
const SnapTradeReconnectBanner = dynamic(() => import("./SnapTradeReconnectBanner"), { ssr: false });
const EventCalendar = dynamic(() => import("./EventCalendar"), { ssr: false });
const SupportChatWidget = dynamic(() => import("./SupportChatWidget"), { ssr: false });
const ReferralShareModal = dynamic(() => import("./ReferralShareModal"), { ssr: false });
import { usePortfolioSnapshotSync } from "@/lib/use-portfolio-snapshot-sync";
import SampleDataBanner from "./SampleDataBanner";
import EmptyPortfolio from "./EmptyPortfolio";
import AidBetaCta from "./aid/AidBetaCta";
import SecureAccountPrompt from "./SecureAccountPrompt";
import ClassicHomeBanner from "./homepage/ClassicHomeBanner";

const DashboardUpgradeNudge = dynamic(() => import("./DashboardUpgradeNudge"), { ssr: false });
const TrialCountdownBanner = dynamic(() => import("./TrialCountdownBanner"), { ssr: false });
import { HeroSkeleton, TableSkeleton, ChartSkeleton } from "./Skeleton";


function DashboardLoadingFallback() {
  const { t } = useI18n();
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

export default function Dashboard() {
  const isNative = useIsNative();
  const isMobileViewport = useIsMobileViewport();
  if (isNative || isMobileViewport) {
    return (
      <Suspense fallback={<DashboardLoadingFallback />}>
        <MobileDashboard />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <DesktopDashboard />
    </Suspense>
  );
}

const DashboardPortfolioV2 = dynamic(() => import("./dashboard-v2/DashboardPortfolioV2"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="card rounded-xl h-[480px] animate-pulse bg-gray-50 dark:bg-white/[0.02]" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="card rounded-xl h-48 animate-pulse bg-gray-50 dark:bg-white/[0.02]" />
        <div className="card rounded-xl h-48 animate-pulse bg-gray-50 dark:bg-white/[0.02]" />
      </div>
    </div>
  ),
});

function DesktopDashboard() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [supportChatEnabled, setSupportChatEnabled] = useState(false);
  const [supportChatWelcome, setSupportChatWelcome] = useState("");
  const { t } = useI18n();
  const { holdings, cashEntries, isInitializing, demoMode } = usePortfolio();
  usePortfolioSnapshotSync({ demoMode });
  const { user, isLoading: authLoading } = useAuth();
  const { gatedAdd } = usePortfolioCommand();
  const track = useTrack();
  const { layoutTheme } = useTheme();


  useEffect(() => {
    if (demoMode) return;
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
  }, [demoMode]);

  const investmentCashOnly = useMemo(
    () => investmentCashEntries(cashEntries),
    [cashEntries],
  );

  const holdingsCount = holdings.length;
  const holdingsLimit = getHoldingsLimit(user?.plan ?? "free");
  const showHoldingsBanner = !authLoading && holdingsLimit !== Infinity && holdingsCount >= Math.ceil(holdingsLimit / 2) && holdingsCount > 0;
  const holdingsAtLimit = !authLoading && holdingsLimit !== Infinity && holdingsCount >= holdingsLimit;

  const { activeTab, navigateToTab } = useDashboardTabUrl({
    holdingsCount,
    tierGate: false,
    userPlan: user?.plan ?? "free",
  });

  function handleTabChange(tab: DashboardTab) {
    navigateToTab(tab);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (tab === "diversification") track("diversification_tab_viewed");
    if (tab === "dividends") track("dividends_tab_viewed");
    if (tab === "metrics") track("metrics_tab_viewed");
    if (tab === "growth") track("growth_tab_viewed");
    if (tab === "events") track("events_tab_viewed");
    if (tab === "news") track("news_tab_viewed");
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
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-6 ${layoutTheme === "terminal" ? "space-y-2 sm:space-y-4" : layoutTheme === "canvas" ? "space-y-5 sm:space-y-10" : "space-y-4 sm:space-y-8"}`}>
        <TrialCountdownBanner />
        <ClassicHomeBanner />
        <AidBetaCta />
        <SnapTradeReconnectBanner />
        <LeafPromoBanner />
        <SampleDataBanner />
        <DashboardUpgradeNudge />
        <SecureAccountPrompt />

        {activeTab === "portfolio" && (
          <div
            role="tabpanel"
            id="tabpanel-portfolio"
            aria-label={t("dashboardHoldingsTab")}
            tabIndex={0}
            className="focus-visible:outline-none space-y-6 animate-tab-fade"
          >
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
                  <div className="glass-panel flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-amber-400/20 bg-amber-500/[0.12] p-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-[color:var(--foreground)]">
                        {t("holdingsUsage").replace("{used}", String(holdingsCount)).replace("{limit}", String(holdingsLimit))}
                      </span>
                    </div>
                  </div>
                )}

                <DashboardPortfolioV2
                  holdings={holdings}
                  cashEntries={investmentCashOnly}
                  allCashEntries={cashEntries}
                  onAddStock={() => gatedAdd("stock")}
                  onNavigateToEvents={() => handleTabChange("events")}
                  onNavigateToDividends={() => handleTabChange("dividends")}
                  onNavigateToDiversification={() => handleTabChange("diversification")}
                  onNavigateToNews={() => handleTabChange("news")}
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
            aria-label={t("diversificationTab")}
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
            aria-label={t("dividendsTab")}
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
            aria-label={t("performanceTab")}
            tabIndex={0}
            className="focus-visible:outline-none animate-tab-fade"
          >
            <Suspense fallback={
              <ChartSkeleton />
            }>
              <PerformancePage holdings={holdings} cashEntries={investmentCashOnly} />
            </Suspense>
          </div>
        )}

        {activeTab === "growth" && (
          <div
            role="tabpanel"
            id="tabpanel-growth"
            aria-label={t("growthTab")}
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
            aria-label={t("eventsTab")}
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
            aria-label={t("newsTab")}
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
        {supportChatEnabled && (user?.plan === "pro") && (
          <button
            onClick={() => setShowSupportChat((v) => !v)}
            className="glass-overlay flex min-h-11 items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/[0.16] px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-blue-500/[0.24]"
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
          className="glass-overlay flex min-h-11 items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/[0.16] px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-emerald-500/[0.24]"
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
