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
import { useClaraDeskStatus } from "@/hooks/useClaraDeskStatus";
import { useHomeBootstrap } from "@/hooks/useHomeBootstrap";
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
import HomeBrokerMarkGapBanner from "./HomeBrokerMarkGapBanner";
import HomeRecommendationCard from "./HomeRecommendationCard";
import HomeHoldingsExplorerCta from "./HomeHoldingsExplorerCta";
import ScreeningBetaBanner from "@/components/screening/ScreeningBetaBanner";
import { RealEstateScreeningCta } from "@/components/real-estate-screening/RealEstateScreeningCta";
import AgentIntroGate from "@/components/agent-intro/AgentIntroGate";
import { AGENT_INTRO_EXPERIMENT_KEY } from "@/lib/agent-intro";
import { useExperiment, trackExperimentEvent } from "@/lib/use-experiment";
import {
  DEFAULT_FIRST_STOCK_PRICE,
  WARREN_FIRST_STOCK_EXPERIMENT_KEY,
  formatFirstStockExample,
  readActivateFirstStockFlag,
  shouldOpenWarrenFirstStock,
  stripActivateFirstStockSearch,
} from "@/lib/warren-first-stock";
import {
  useAgentIntroEngagementReady,
  useAgentIntroPostAction,
} from "@/hooks/useAgentIntroPostAction";
import { HeroSkeleton, TableSkeleton } from "@/components/Skeleton";

type HeroMode = "simple" | "advanced";
const HERO_MODE_KEY = "home_v2_hero_mode";

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
const HomeMoneyDesk = dynamic(() => import("./HomeMoneyDesk"), { ssr: false });
const WarrenDrawer = dynamic(() => import("@/components/warren/WarrenDrawer"), { ssr: false });
const StatsGrid = dynamic(() => import("@/components/dashboard-v2/StatsGrid"), { ssr: false });
const PortfolioNewsFeed = dynamic(() => import("@/components/PortfolioNewsFeed"), { ssr: false });

export default function HomeV2Dashboard({
  agentIntroAlreadyShownToday = false,
}: {
  agentIntroAlreadyShownToday?: boolean;
}) {
  const { flags, isLoaded } = useFeatureFlagContext();
  const { t } = useI18n();
  const track = useTrack();
  const isMobile = useIsMobileViewport();
  const { holdings, cashEntries, quotes, isInitializing, demoMode, hydrateMarketData, hydratePortfolioBook, hydrateAnalystTargets, activePortfolioId, activePortfolioCurrency } =
    usePortfolio();
  const { gatedAdd } = usePortfolioCommand();
  // Bootstrap must start immediately (not wait for quote init) so it can win the
  // cold-path race and seed PortfolioProvider via hydrateMarketData.
  const bootstrap = useHomeBootstrap(!demoMode);
  const bootstrapSettled = !bootstrap.loading;
  const sectionsLoading = bootstrap.sectionsLoading;
  // AID shell/briefing still needs a real session; demo has none.
  const aidEnabled = !demoMode;
  const aidStatus = useAidStatus(aidEnabled, {
    includeBriefing: false,
    seed: bootstrap.data?.aidStatus ?? null,
    // Wait for bootstrap; on failure fall back to a direct status fetch.
    autoFetch: bootstrapSettled && (!!bootstrap.data || bootstrap.error),
  });
  const claraDesk = useClaraDeskStatus(!demoMode);
  const investmentCash = useMemo(() => investmentCashEntries(cashEntries), [cashEntries]);
  const home = usePortfolioHomeData({ holdings, cashEntries: investmentCash });
  const [aiOpen, setAiOpen] = useState(false);
  const [warrenPrompt, setWarrenPrompt] = useState<string | undefined>();
  const [activateFirstStockFlag, setActivateFirstStockFlag] = useState(false);
  const firstStockShownRef = useRef(false);
  // Always start simple — do not restore advanced from localStorage on mount
  // (avoids history=all + txs on cold load). Preference is written on click.
  const [heroMode, setHeroMode] = useState<HeroMode>("simple");
  const [introDismissed, setIntroDismissed] = useState(agentIntroAlreadyShownToday);
  const pageViewSent = useRef(false);
  const visitMarked = useRef(false);
  const returnTracked = useRef(false);
  const hydratedBookKey = useRef<string | null>(null);
  const hydratedQuotesKey = useRef<string | null>(null);
  const hydratedAnalystTargetsKey = useRef<string | null>(null);
  const showClassicLink = isLoaded && !!flags.classic_home;

  const holdingsTickerSig = useMemo(
    () => holdings.map((h) => h.ticker.trim().toUpperCase()).sort().join(","),
    [holdings],
  );

  useEffect(() => {
    const payload = bootstrap.data;
    if (!payload?.holdings) return;
    const bookKey = `${payload.asOf}|${activePortfolioId ?? ""}`;
    if (hydratedBookKey.current === bookKey) return;
    hydratedBookKey.current = bookKey;
    hydratePortfolioBook(payload.holdings, payload.cashEntries ?? [], activePortfolioId);
  }, [bootstrap.data, hydratePortfolioBook, activePortfolioId]);

  useEffect(() => {
    const payload = bootstrap.data;
    if (!payload?.quotes) return;
    const quotesKey = `${payload.asOf}|${holdingsTickerSig}|${activePortfolioId ?? ""}`;
    if (hydratedQuotesKey.current === quotesKey) return;
    hydratedQuotesKey.current = quotesKey;
    hydrateMarketData(payload.quotes, payload.exchangeRates);
  }, [bootstrap.data, hydrateMarketData, holdingsTickerSig, activePortfolioId]);

  useEffect(() => {
    const payload = bootstrap.data;
    if (!payload?.analystTargets) return;
    const key = `${payload.asOf}|${holdingsTickerSig}|${activePortfolioId ?? ""}|analyst`;
    if (hydratedAnalystTargetsKey.current === key) return;
    hydratedAnalystTargetsKey.current = key;
    hydrateAnalystTargets(payload.analystTargets);
  }, [bootstrap.data, hydrateAnalystTargets, holdingsTickerSig, activePortfolioId]);

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
  // Empty only after portfolio data is loaded — avoids EmptyPortfolio flash while holdings fetch.
  const isEmpty =
    !isInitializing && holdings.length === 0 && cashEntries.length === 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!readActivateFirstStockFlag(window.location.search)) return;
    setActivateFirstStockFlag(true);
    const stripped = stripActivateFirstStockSearch(window.location.search);
    window.history.replaceState(null, "", `${window.location.pathname}${stripped}`);
  }, []);

  const firstStockExperiment = useExperiment(WARREN_FIRST_STOCK_EXPERIMENT_KEY, {
    enabled: aidEnabled && isEmpty,
  });
  const firstStockMode = shouldOpenWarrenFirstStock({
    demoMode,
    isEmpty,
    activateFlag: activateFirstStockFlag,
    variant: firstStockExperiment.variant,
    loading: firstStockExperiment.loading,
  });

  const applePrice = quotes.AAPL?.regularMarketPrice ?? DEFAULT_FIRST_STOCK_PRICE;
  const firstStockExample = formatFirstStockExample(t("warrenFirstStockExample"), applePrice);

  useEffect(() => {
    if (!firstStockMode) return;
    setAiOpen(true);
    if (firstStockShownRef.current || firstStockExperiment.previewing) return;
    firstStockShownRef.current = true;
    void trackExperimentEvent("first_stock_activation_shown", {
      experiment: WARREN_FIRST_STOCK_EXPERIMENT_KEY,
      variant: firstStockExperiment.variant,
    });
  }, [firstStockMode, firstStockExperiment.previewing, firstStockExperiment.variant]);

  const [introVisible, setIntroVisible] = useState(!demoMode && !agentIntroAlreadyShownToday);

  const introExperiment = useExperiment(AGENT_INTRO_EXPERIMENT_KEY, {
    enabled: aidEnabled,
  });
  const engagementReady = useAgentIntroEngagementReady({
    enabled: aidEnabled,
    introDismissed,
    variant: introExperiment.variant,
    status: introExperiment.status,
    assigned: introExperiment.assigned,
    loading: introExperiment.loading,
  });
  const { recordPostIntroAction } = useAgentIntroPostAction({
    enabled: aidEnabled,
    isEmpty,
    engagementReady,
  });

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
  const hasHoldings = holdings.length > 0 || cashEntries.length > 0;
  const moneyDesk = !isInitializing ? (
    <HomeMoneyDesk
      dayGainLoss={dayGainLoss}
      displayCurrency={activePortfolioCurrency}
      hasHoldings={hasHoldings}
      demoMode={demoMode}
      clara={claraDesk.status}
      claraLoading={claraDesk.loading}
      onOpenWarren={() => {
        recordPostIntroAction("warren");
        setAiOpen(true);
      }}
    />
  ) : null;

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

      {(isMobile || isEmpty) && moneyDesk}

      {!isEmpty && (
        <AidBriefingStrip
          status={aidStatus.data}
          loading={aidStatus.loading}
          onCatchUp={() => {
            recordPostIntroAction("aid_catch_up");
            void aidStatus.markVisited();
            document.getElementById("home-v2-highlights")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

      {isInitializing ? (
        <div className="flex flex-col gap-4" role="status" aria-label={t("loading")}>
          <HeroSkeleton />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="card h-40 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />
            <div className="card h-40 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />
          </div>
          <TableSkeleton rows={4} />
        </div>
      ) : isEmpty ? (
        <>
          <RealEstateScreeningCta />
          <EmptyPortfolio
            demoMode={demoMode}
            onAddStock={() => {
              recordPostIntroAction("add");
              openAdd();
            }}
            onEngagementAction={recordPostIntroAction}
            onAskWarren={
              demoMode
                ? undefined
                : (prompt) => {
                    recordPostIntroAction("warren");
                    setWarrenPrompt(prompt);
                    setAiOpen(true);
                  }
            }
          />
        </>
      ) : (
        <>
          <HomeBrokerMarkGapBanner markGap={bootstrap.data?.markGap} />
          <ErrorBoundary>
            {heroMode === "simple" ? (
              <HomePortfolioTotalCard
                totalValue={totals.totalCurrentEUR}
                investedValue={investedValueBase}
                cashValue={cashValueBase}
                dayGainLoss={dayGainLoss}
                dayGainLossPercent={dayGainLossPercent}
                costBasis={totals.totalCostEUR}
                totalReturnPct={totals.totalGainLossPercent}
                holdingsCount={holdings.length}
                onAdvanced={() => {
                  recordPostIntroAction("hero_advanced");
                  setAndPersistHeroMode("advanced");
                }}
              />
            ) : (
              <PortfolioHeroCard
                holdings={holdings}
                cashEntries={cashEntries}
                assetFilter={assetFilter}
                refreshKey={refreshKey}
                onRecalculate={handleRecalculate}
                recalculating={recalculating}
                allowPerTickerHistorical={false}
                onOpenAi={() => {
                  recordPostIntroAction("warren");
                  setAiOpen(true);
                }}
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
          <RealEstateScreeningCta />

          <HomeRecommendationCard
            initialRecommendation={
              bootstrap.data?.recommendation
                ? {
                    current: bootstrap.data.recommendation.current,
                    remaining: bootstrap.data.recommendation.remaining,
                    total: bootstrap.data.recommendation.total,
                    rawTotal: bootstrap.data.recommendation.rawTotal,
                  }
                : null
            }
            bootstrapSettled={bootstrapSettled}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <HomeMoversCard holdings={holdings} />
            <HomeCatalystsCard holdings={holdings} />
          </div>

          <div id="home-v2-highlights">
            <HomeDayHighlights
              highlights={
                bootstrap.error
                  ? undefined
                  : (bootstrap.data?.dayHighlights?.highlights ?? null)
              }
              loading={sectionsLoading && !bootstrap.data?.dayHighlights}
            />
          </div>

          {isMobile && (
            <AllocationTabs holdings={holdings} cashEntries={cashEntries} />
          )}

          <div className="flex flex-col gap-2" data-testid="home-holdings">
            {!demoMode && holdings.length > 0 && <HomeHoldingsExplorerCta />}
            {isMobile ? (
              <PortfolioCards holdings={holdings} />
            ) : (
              <PortfolioTable
                holdings={holdings}
                onAddStock={() => {
                  recordPostIntroAction("add");
                  openAdd();
                }}
              />
            )}
          </div>

          <MarketAndCash holdings={holdings} cashEntries={cashEntries} />

          <HomeFinPulseTeaser enabled={aidEnabled} />

          <PortfolioNewsFeed variant="compact" maxItems={10} deferNetwork />

          {isMobile && (
            <>
              {aidStatus.data?.warrenNudge && (
                <AidWarrenNudge
                  nudge={aidStatus.data.warrenNudge}
                  onAsk={(prompt) => {
                    recordPostIntroAction("warren");
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
      {moneyDesk}
      {aidStatus.data?.warrenNudge && (
        <AidWarrenNudge
          nudge={aidStatus.data.warrenNudge}
          onAsk={(prompt) => {
            recordPostIntroAction("warren");
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
    <>
      <AgentIntroGate
        isEmpty={isEmpty}
        demoMode={demoMode || firstStockMode}
        dashboardReady={!isInitializing}
        alreadyShownToday={agentIntroAlreadyShownToday}
        onIntroDismissed={() => setIntroDismissed(true)}
        onIntroVisibilityChange={setIntroVisible}
      />
      <main
        className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6"
        hidden={introVisible}
        aria-hidden={introVisible}
      >
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
        side="right"
        emptyGreeting={firstStockMode ? t("warrenFirstStockGreeting") : undefined}
        initialComposerValue={firstStockMode ? firstStockExample : undefined}
        pinnedExamplePrompt={firstStockMode ? firstStockExample : undefined}
        pinnedExampleLabel={firstStockMode ? t("warrenFirstStockTryExample") : undefined}
        onPinnedExampleSend={
          firstStockMode
            ? () => {
                void trackExperimentEvent("first_stock_example_sent", {
                  experiment: WARREN_FIRST_STOCK_EXPERIMENT_KEY,
                  variant: firstStockExperiment.variant,
                });
              }
            : undefined
        }
        onClose={() => {
          setAiOpen(false);
          setWarrenPrompt(undefined);
        }}
        triggerPrompt={warrenPrompt}
        onTriggerPromptConsumed={() => setWarrenPrompt(undefined)}
      />
    </main>
    </>
  );
}
