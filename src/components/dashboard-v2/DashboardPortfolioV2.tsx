"use client";

import dynamic from "next/dynamic";
import { usePortfolioHomeData } from "./use-portfolio-home-data";
import type { AssetFilter } from "./AssetTypeFilter";

import BackfillCTA from "@/components/portfolio-v2/BackfillCTA";
import MarketAwareBreakdown from "@/components/portfolio-v2/MarketAwareBreakdown";
import ErrorBoundary from "@/components/ErrorBoundary";

const PortfolioHeroCard = dynamic(
  () => import("@/components/portfolio-v2/PortfolioHeroCard"),
  {
    ssr: false,
    loading: () => (
      <div className="card h-[320px] animate-pulse rounded-xl bg-gray-50 dark:bg-white/[0.02]" />
    ),
  },
);
import StatsGrid from "./StatsGrid";
import CompactReferralCard from "./CompactReferralCard";
import OnboardingChecklist from "./OnboardingChecklist";
import type { Holding, CashEntry } from "@/lib/types";

function CardSkeleton({ h = "h-24" }: { h?: string }) {
  return <div className={`card rounded-xl ${h} animate-pulse bg-gray-50 dark:bg-white/[0.02]`} />;
}
function TableSkeleton() {
  return <div className="card rounded-xl h-48 animate-pulse bg-gray-50 dark:bg-white/[0.02]" />;
}

const AssetPerformanceTable = dynamic(() => import("./AssetPerformanceTable"), { ssr: false, loading: () => <TableSkeleton /> });
const AllocationTabs = dynamic(() => import("./AllocationTabs"), { ssr: false, loading: () => <CardSkeleton h="h-48" /> });
const GoalProgressCard = dynamic(() => import("./GoalProgressCard"), { ssr: false });
const GoalPromptCard = dynamic(() => import("./GoalPromptCard"), { ssr: false });
const CompactDividendCard = dynamic(() => import("./CompactDividendCard"), { ssr: false, loading: () => <CardSkeleton /> });
const CompactEarningsCard = dynamic(() => import("./CompactEarningsCard"), { ssr: false, loading: () => <CardSkeleton /> });
const PortfolioScoreCard = dynamic(() => import("./PortfolioScoreCard"), { ssr: false, loading: () => <CardSkeleton /> });
const WarrenTrigger = dynamic(() => import("@/components/warren/WarrenTrigger"), { ssr: false });
const ClaraCta = dynamic(() => import("@/components/clara/ClaraCta"), { ssr: false });
const WeeklyDigestCard = dynamic(() => import("./WeeklyDigestCard"), { ssr: false });
const DailyDigestsTeaserCard = dynamic(() => import("./DailyDigestsTeaserCard"), { ssr: false });
const WarrenDrawer = dynamic(() => import("@/components/warren/WarrenDrawer"), { ssr: false });
const PortfolioTable = dynamic(() => import("../PortfolioTable"), { ssr: false, loading: () => <TableSkeleton /> });
const PortfolioGrowthPeriods = dynamic(() => import("../PortfolioGrowthPeriods"), { ssr: false, loading: () => <CardSkeleton /> });
const PerformanceMetrics = dynamic(() => import("../PerformanceMetrics"), { ssr: false, loading: () => <CardSkeleton /> });
const MarketAndCash = dynamic(() => import("../MarketAndCash"), { ssr: false, loading: () => <TableSkeleton /> });
const PortfolioNewsFeed = dynamic(() => import("../PortfolioNewsFeed"), { ssr: false });
const GoalCelebration = dynamic(() => import("../GoalCelebration"), { ssr: false });

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  allCashEntries: CashEntry[];
  onAddStock: () => void;
  onNavigateToEvents: () => void;
  onNavigateToDividends: () => void;
  onNavigateToDiversification: () => void;
  onNavigateToNews: () => void;
  onShareReferral: () => void;
}

function V2Dashboard(props: Props) {
  const {
    holdings,
    cashEntries,
    allCashEntries,
    onAddStock,
    onNavigateToEvents,
    onNavigateToDividends,
    onNavigateToDiversification,
    onNavigateToNews,
    onShareReferral,
  } = props;

  const home = usePortfolioHomeData({ holdings, cashEntries });
  const {
    aiDrawerOpen,
    setAiDrawerOpen,
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
    handleBackfillComplete,
  } = home;

  const heroBlock = (
    <>
      <BackfillCTA holdingsCount={holdings.length} onComplete={handleBackfillComplete} />
      <ErrorBoundary>
        <PortfolioHeroCard
          holdings={holdings}
          cashEntries={cashEntries}
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
              cashEntries={cashEntries}
              dayChangeByType={dayChangeByType}
              onFilterChange={setAssetFilter}
              activeFilter={assetFilter}
            />
          }
        />
      </ErrorBoundary>
    </>
  );

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {heroBlock}
          <AssetPerformanceTable holdings={holdings} cashEntries={cashEntries} />
          <PortfolioTable holdings={holdings} onAddStock={onAddStock} />
          <MarketAndCash holdings={holdings} cashEntries={allCashEntries} />
          <PortfolioNewsFeed variant="compact" maxItems={10} onViewAll={onNavigateToNews} />
          <GoalCelebration holdings={holdings} cashEntries={cashEntries} />
        </div>
        <div className="flex flex-col gap-3">
          <WarrenTrigger onOpen={() => setAiDrawerOpen(true)} />
          <ClaraCta />
          <OnboardingChecklist onOpenAddStock={onAddStock} />
          <DailyDigestsTeaserCard />
          <WeeklyDigestCard position="promoted" />
          <CompactReferralCard onShare={onShareReferral} />
          <GoalPromptCard holdings={holdings} />
          <PortfolioScoreCard holdings={holdings} cashEntries={cashEntries} />
          <GoalProgressCard holdings={holdings} cashEntries={cashEntries} />
          <StatsGrid
            holdings={holdings}
            cashEntries={cashEntries}
            totals={totals}
            dayChange={{ amount: dayGainLoss, pct: dayGainLossPercent }}
          />
          <AllocationTabs holdings={holdings} cashEntries={allCashEntries} onShowMore={onNavigateToDiversification} />
          <CompactDividendCard holdings={holdings} cashEntries={cashEntries} onNavigateToDividends={onNavigateToDividends} />
          <CompactEarningsCard onNavigateToEvents={onNavigateToEvents} />
          <PortfolioGrowthPeriods holdings={holdings} />
          <PerformanceMetrics holdings={holdings} cashEntries={cashEntries} />
          <WeeklyDigestCard position="default" />
        </div>
      </div>
      <WarrenDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
    </>
  );
}

export default function DashboardPortfolioV2(props: Props) {
  return <V2Dashboard {...props} />;
}
