"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
import { usePortfolio } from "@/lib/portfolio-context";
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

export default function HomeV2Dashboard() {
  const { flags, isLoaded } = useFeatureFlagContext();
  const { t } = useI18n();
  const track = useTrack();
  const isMobile = useIsMobileViewport();
  const { holdings, cashEntries, isInitializing } = usePortfolio();
  const { gatedAdd } = usePortfolioCommand();
  const aidEnabled = !isInitializing;
  const aidStatus = useAidStatus(aidEnabled);
  const home = usePortfolioHomeData({ holdings, cashEntries });
  const [aiOpen, setAiOpen] = useState(false);
  const [warrenPrompt, setWarrenPrompt] = useState<string | undefined>();
  const pageViewSent = useRef(false);
  const visitMarked = useRef(false);
  const returnTracked = useRef(false);
  const showClassicLink = isLoaded && !!flags.classic_home;

  // Match Classic: empty when there are no stock/ETF/crypto/fund holdings
  // (cash-only still shows the add/import empty state).
  const isEmpty = holdings.length === 0;

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
        <EmptyPortfolio onAddStock={openAdd} />
      ) : (
        <>
          <ErrorBoundary>
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
              breakdownSlot={
                <MarketAwareBreakdown
                  holdings={holdings}
                  cashEntries={cashEntries}
                  onFilterChange={setAssetFilter}
                  activeFilter={assetFilter}
                />
              }
            />
          </ErrorBoundary>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <HomeMoversCard holdings={holdings} />
            <HomeCatalystsCard holdings={holdings} />
          </div>

          <div id="home-v2-highlights">
            <HomeDayHighlights />
          </div>

          <AllocationTabs holdings={holdings} cashEntries={cashEntries} />

          {isMobile ? (
            <PortfolioCards holdings={holdings} />
          ) : (
            <PortfolioTable holdings={holdings} onAddStock={openAdd} />
          )}

          <HomeFinPulseTeaser enabled={aidEnabled} />

          <PortfolioNewsFeed variant="compact" maxItems={10} />

          {isMobile && (
            <>
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
      <WarrenTrigger onOpen={() => setAiOpen(true)} />
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
      <StatsGrid holdings={holdings} cashEntries={cashEntries} />
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
    </main>
  );
}
