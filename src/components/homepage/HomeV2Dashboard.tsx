"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { investmentCashEntries } from "@/lib/portfolio-summary-cash";
import { usePortfolioCommand } from "@/contexts/portfolio-command-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { useAidStatus } from "@/hooks/useAidStatus";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";
import { usePortfolioHomeData } from "@/components/dashboard-v2/use-portfolio-home-data";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import ErrorBoundary from "@/components/ErrorBoundary";
import AidBriefingStrip from "@/components/aid/AidBriefingStrip";
import AidWarrenNudge from "@/components/aid/AidWarrenNudge";
import EmptyPortfolio from "@/components/EmptyPortfolio";
import HomeMoversCard from "./HomeMoversCard";
import HomeCatalystsCard from "./HomeCatalystsCard";
import HomeDayHighlights from "./HomeDayHighlights";
import HomeMcpCta from "./HomeMcpCta";
import HomeFinPulseTeaser from "./HomeFinPulseTeaser";
import HomePortfolioTotalCard from "./HomePortfolioTotalCard";
import HomeRecommendationCard from "./HomeRecommendationCard";
import ScreeningBetaBanner from "@/components/screening/ScreeningBetaBanner";

type HeroMode = "simple" | "advanced";
const HERO_MODE_KEY = "home_v2_hero_mode";

function readHeroMode(): HeroMode {
  if (typeof window === "undefined") return "simple";
  const stored = window.localStorage.getItem(HERO_MODE_KEY);
  return stored === "advanced" ? "advanced" : "simple";
}

const PortfolioHeroCard = dynamic(() => import("@/components/portfolio-v2/PortfolioHeroCard"), {
  ssr: false,
  loading: () => <div className="card h-[280px] animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />,
});
const MarketAwareBreakdown = dynamic(() => import("@/components/portfolio-v2/MarketAwareBreakdown"), {
  ssr: false,
});
const AllocationTabs = dynamic(() => import("@/components/dashboard-v2/AllocationTabs"), {
  ssr: false,
  loading: () => <div className="card h-48 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />,
});
const PortfolioTable = dynamic(() => import("@/components/PortfolioTable"), {
  ssr: false,
  loading: () => <div className="card h-48 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />,
});
const MarketAndCash = dynamic(() => import("@/components/MarketAndCash"), {
  ssr: false,
  loading: () => <div className="card h-48 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />,
});
const PortfolioCards = dynamic(() => import("@/components/mobile/PortfolioCards"), {
  ssr: false,
});
const DailyDigestsTeaserCard = dynamic(() => import("@/components/dashboard-v2/DailyDigestsTeaserCard"), {
  ssr: false,
});
const WeeklyDigestCard = dynamic(() => import("@/components/dashboard-v2/WeeklyDigestCard"), {
  ssr: false,
});
const WarrenTrigger = dynamic(() => import("@/components/warren/WarrenTrigger"), { ssr: false });
const WarrenDrawer = dynamic(() => import("@/components/warren/WarrenDrawer"), { ssr: false });
const StatsGrid = dynamic(() => import("@/components/dashboard-v2/StatsGrid"), { ssr: false });
const PortfolioNewsFeed = dynamic(() => import("@/components/PortfolioNewsFeed"), { ssr: false });
const FeedbackModal = dynamic(() => import("@/components/FeedbackModal"), { ssr: false });

export default function HomeV2Dashboard() {
  const { flags, isLoaded } = useFeatureFlagContext();
  const { t } = useI18n();
  const track = useTrack();
  const isMobile = useIsMobileViewport();
  const { holdings, cashEntries, isInitializing, demoMode } = usePortfolio();
  const { gatedAdd } = usePortfolioCommand();
  // Aid briefing/feed/day-highlights all require a real session; demo has none.
  const aidEnabled = !isInitializing && !demoMode;
  const aidStatus = useAidStatus(aidEnabled);
  const investmentCash = useMemo(() => investmentCashEntries(cashEntries), [cashEntries]);
  const home = usePortfolioHomeData({ holdings, cashEntries: investmentCash });
  const [aiOpen, setAiOpen] = useState(false);
  const [warrenPrompt, setWarrenPrompt] = useState<string | undefined>();
  const [heroMode, setHeroMode] = useState<HeroMode>("simple");
  const [showFeedback, setShowFeedback] = useState(false);
  const pageViewSent = useRef(false);
  const visitMarked = useRef(false);
  const returnTracked = useRef(false);
  const showClassicLink = isLoaded && !!flags.classic_home;

  useEffect(() => {
    setHeroMode(readHeroMode());
  }, []);

  function setAndPersistHeroMode(mode: HeroMode) {
    setHeroMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HERO_MODE_KEY, mode);
    }
    track(
      mode === "advanced" ? "home_v2_hero_advanced_opened" : "home_v2_hero_simple_restored",
    );
  }

  // Empty only when there are no holdings and no cash/manual assets.
  // Fixed-return (and other Assets & Accounts) must not hide behind EmptyPortfolio.
  const isEmpty = holdings.length === 0 && cashEntries.length === 0;

  useEffect(() => {
    if (!aidEnabled || pageViewSent.current) return;
    pageViewSent.current = true;
    track("home_v2_page_viewed", { state: isEmpty ? "empty" : "holdings" });
  }, [aidEnabled, isEmpty, track]);

  useEffect(() => {
    if (!aidEnabled || isEmpty || visitMarked.current) return;
    visitMarked.current = true;
    const timer = window.setTimeout(() => {
      void aidStatus.markVisited();
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [aidEnabled, isEmpty, aidStatus]);

  useEffect(() => {
    if (!aidEnabled || returnTracked.current || !aidStatus.data) return;
    if (typeof window === "undefined") return;
    const key = "home_v2_last_view";
    const prev = window.localStorage.getItem(key);
    const now = Date.now();
    if (prev) {
      const hours = (now - Number(prev)) / (1000 * 60 * 60);
      if (hours > 0 && hours <= 24) {
        returnTracked.current = true;
        track("home_v2_return_within_24h", { hours: String(Math.round(hours * 10) / 10) });
      }
    }
    window.localStorage.setItem(key, String(now));
  }, [aidEnabled, aidStatus.data, track]);

  const {
    assetFilter,
    setAssetFilter,
    totals,
    cashValueBase,
    investedValueBase,
    dayGainLoss,
    dayGainLossPercent,
    dayChangeByType,
    dayChangePctByType,
    refreshKey,
    recalculating,
    handleRecalculate,
  } = home;

  const openAdd = () => gatedAdd("stock");

  const main = (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
            {t("homeV2Title")}
          </p>
          <p className="text-xs text-[color:var(--muted)]">{t("homeV2CheckInHint")}</p>
        </div>
        {showClassicLink && (
          <Link
            href="/classic"
            className="min-h-9 rounded-full border border-[color:var(--border)] px-3 text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
          >
            {t("homeV2BackClassic")}
          </Link>
        )}
      </div>

      {!isEmpty && (
        <AidBriefingStrip
          status={aidStatus.data}
          loading={aidStatus.loading}
          onCatchUp={() => {
            void aidStatus.markVisited();
            document.getElementById("home-v2-highlights")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

      {isEmpty ? (
        <EmptyPortfolio
          demoMode={demoMode}
          onAddStock={openAdd}
          onAskWarren={
            demoMode
              ? undefined
              : (prompt) => {
                  setWarrenPrompt(prompt);
                  setAiOpen(true);
                }
          }
        />
      ) : (
        <>
          <ErrorBoundary>
            {heroMode === "simple" ? (
              <HomePortfolioTotalCard
                totalValue={totals.totalCurrentEUR}
                dayGainLoss={dayGainLoss}
                dayGainLossPercent={dayGainLossPercent}
                costBasis={totals.totalCostEUR}
                totalReturnPct={totals.totalGainLossPercent}
                holdingsCount={holdings.length}
                onAdvanced={() => setAndPersistHeroMode("advanced")}
              />
            ) : (
              <PortfolioHeroCard
                holdings={holdings}
                cashEntries={cashEntries}
                assetFilter={assetFilter}
                refreshKey={refreshKey}
                onRecalculate={handleRecalculate}
                recalculating={recalculating}
                onOpenAi={() => setAiOpen(true)}
                totalValue={totals.totalCurrentEUR}
                investedValue={investedValueBase}
                cashValue={cashValueBase}
                dayGainLoss={dayGainLoss}
                dayGainLossPercent={dayGainLossPercent}
                dayChangePctByType={dayChangePctByType as Partial<Record<AssetFilter, number>>}
                headerAction={
                  <button
                    type="button"
                    onClick={() => setAndPersistHeroMode("simple")}
                    aria-expanded={true}
                    className="inline-flex min-h-11 items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-2 text-xs font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-highlight)]"
                  >
                    {t("homeV2SimpleCta")}
                  </button>
                }
                breakdownSlot={
                  <MarketAwareBreakdown
                    holdings={holdings}
                    cashEntries={cashEntries}
                    dayChangeByType={dayChangeByType}
                    onFilterChange={setAssetFilter}
                    activeFilter={assetFilter}
                  />
                }
              />
            )}
          </ErrorBoundary>

          <ScreeningBetaBanner />

          <HomeRecommendationCard />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <HomeMoversCard holdings={holdings} />
            <HomeCatalystsCard holdings={holdings} />
          </div>

          <div id="home-v2-highlights">
            <HomeDayHighlights />
          </div>

          {isMobile && (
            <AllocationTabs holdings={holdings} cashEntries={cashEntries} />
          )}

          {isMobile ? (
            <PortfolioCards holdings={holdings} />
          ) : (
            <PortfolioTable holdings={holdings} onAddStock={openAdd} />
          )}

          <MarketAndCash holdings={holdings} cashEntries={cashEntries} />

          <HomeFinPulseTeaser enabled={aidEnabled} />

          <PortfolioNewsFeed variant="compact" maxItems={10} />

          {isMobile && (
            <>
              <WarrenTrigger
                onOpen={() => setAiOpen(true)}
                href={demoMode ? "/signup" : undefined}
              />
              {aidStatus.data?.warrenNudge && (
                <AidWarrenNudge
                  nudge={aidStatus.data.warrenNudge}
                  onAsk={(prompt) => {
                    setWarrenPrompt(prompt);
                    setAiOpen(true);
                  }}
                />
              )}
              <HomeMcpCta />
            </>
          )}
        </>
      )}
    </div>
  );

  const rail = (
    <aside className="flex flex-col gap-3">
      <AllocationTabs holdings={holdings} cashEntries={cashEntries} />
      <WarrenTrigger onOpen={() => setAiOpen(true)} href={demoMode ? "/signup" : undefined} />
      {aidStatus.data?.warrenNudge && (
        <AidWarrenNudge
          nudge={aidStatus.data.warrenNudge}
          onAsk={(prompt) => {
            setWarrenPrompt(prompt);
            setAiOpen(true);
          }}
        />
      )}
      <HomeMcpCta />
      <DailyDigestsTeaserCard />
      <WeeklyDigestCard position="promoted" />
      <StatsGrid
        holdings={holdings}
        cashEntries={cashEntries}
        totals={totals}
        dayChange={{ amount: dayGainLoss, pct: dayGainLossPercent }}
      />
    </aside>
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6">
      {isMobile || isEmpty ? (
        main
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px]">
          {main}
          {rail}
        </div>
      )}
      <WarrenDrawer
        isOpen={aiOpen}
        onClose={() => {
          setAiOpen(false);
          setWarrenPrompt(undefined);
        }}
        triggerPrompt={warrenPrompt}
        onTriggerPromptConsumed={() => setWarrenPrompt(undefined)}
      />

      {!demoMode && showFeedback && (
        <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      )}

      {!demoMode && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-30 flex flex-col gap-2 items-end">
          <button
            type="button"
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
      )}
    </main>
  );
}
