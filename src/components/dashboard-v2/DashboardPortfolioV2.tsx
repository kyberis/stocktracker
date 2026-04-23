"use client";

import dynamic from "next/dynamic";
import { usePortfolioHomeData } from "./use-portfolio-home-data";
import type { AssetFilter } from "./AssetTypeFilter";

import BackfillCTA from "@/components/portfolio-v2/BackfillCTA";
import MarketAwareBreakdown from "@/components/portfolio-v2/MarketAwareBreakdown";
import ErrorBoundary from "@/components/ErrorBoundary";

// Heavy (~1.5k line) chart component — lazily loaded to keep dashboard shell light.
const PortfolioValueChart = dynamic(
  () => import("@/components/portfolio-v2/PortfolioValueChart"),
  {
    ssr: false,
    loading: () => (
      <div className="card rounded-xl h-[480px] animate-pulse bg-gray-50 dark:bg-white/[0.02]" />
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
const PortfolioAiTrigger = dynamic(() => import("./PortfolioAiTrigger"), { ssr: false });
const WeeklyDigestCard = dynamic(() => import("./WeeklyDigestCard"), { ssr: false });
const DailyDigestsTeaserCard = dynamic(() => import("./DailyDigestsTeaserCard"), { ssr: false });
const PortfolioAiDrawer = dynamic(() => import("./PortfolioAiDrawer"), { ssr: false });
const PortfolioTable = dynamic(() => import("../PortfolioTable"), { ssr: false, loading: () => <TableSkeleton /> });
const PortfolioGrowthPeriods = dynamic(() => import("../PortfolioGrowthPeriods"), { ssr: false, loading: () => <CardSkeleton /> });
const PerformanceMetrics = dynamic(() => import("../PerformanceMetrics"), { ssr: false, loading: () => <CardSkeleton /> });
const MarketAndCash = dynamic(() => import("../MarketAndCash"), { ssr: false, loading: () => <TableSkeleton /> });
const PortfolioProjection = dynamic(() => import("../PortfolioProjection"), { ssr: false, loading: () => <CardSkeleton h="h-32" /> });
const GoalCelebration = dynamic(() => import("../GoalCelebration"), { ssr: false });

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  allCashEntries: CashEntry[];
  onAddStock: () => void;
  onNavigateToEvents: () => void;
  onNavigateToDividends: () => void;
  onNavigateToDiversification: () => void;
  onShareReferral: () => void;
}

// ── Shared sidebar + table sections ──

function ExpandedLayout({ chartBlock, holdings, cashEntries, allCashEntries, onAddStock, onNavigateToEvents, onNavigateToDividends, onNavigateToDiversification, onShareReferral, aiDrawerOpen, setAiDrawerOpen }: {
  chartBlock: React.ReactNode;
  holdings: Holding[];
  cashEntries: CashEntry[];
  allCashEntries: CashEntry[];
  onAddStock: () => void;
  onNavigateToEvents: () => void;
  onNavigateToDividends: () => void;
  onNavigateToDiversification: () => void;
  onShareReferral: () => void;
  aiDrawerOpen: boolean;
  setAiDrawerOpen: (v: boolean) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-4">
        {chartBlock}
        <AssetPerformanceTable holdings={holdings} cashEntries={cashEntries} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
          <div className="flex flex-col gap-4 min-w-0">
            <PortfolioTable holdings={holdings} onAddStock={onAddStock} />
            <MarketAndCash holdings={holdings} cashEntries={allCashEntries} />
            <PortfolioProjection holdings={holdings} cashEntries={cashEntries} />
            <GoalCelebration holdings={holdings} cashEntries={cashEntries} />
          </div>
          <div className="flex flex-col gap-3">
            <OnboardingChecklist onOpenAddStock={onAddStock} />
            <DailyDigestsTeaserCard />
            <WeeklyDigestCard position="promoted" />
            <CompactReferralCard onShare={onShareReferral} />
            <GoalPromptCard holdings={holdings} />
            <PortfolioScoreCard holdings={holdings} cashEntries={cashEntries} />
            <GoalProgressCard holdings={holdings} cashEntries={cashEntries} />
            <AllocationTabs holdings={holdings} cashEntries={allCashEntries} onShowMore={onNavigateToDiversification} />
            <CompactDividendCard holdings={holdings} cashEntries={cashEntries} onNavigateToDividends={onNavigateToDividends} />
            <CompactEarningsCard onNavigateToEvents={onNavigateToEvents} />
            <PortfolioGrowthPeriods holdings={holdings} />
            <PerformanceMetrics holdings={holdings} cashEntries={cashEntries} />
            <PortfolioAiTrigger onOpen={() => setAiDrawerOpen(true)} />
            <WeeklyDigestCard position="default" />
          </div>
        </div>
      </div>
      <PortfolioAiDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} autoAnalyze />
    </>
  );
}

function CollapsedLayout({ chartBlock, holdings, cashEntries, allCashEntries, onAddStock, onNavigateToEvents, onNavigateToDividends, onNavigateToDiversification, onShareReferral, aiDrawerOpen, setAiDrawerOpen, sidebarExtra }: {
  chartBlock: React.ReactNode;
  holdings: Holding[];
  cashEntries: CashEntry[];
  allCashEntries: CashEntry[];
  onAddStock: () => void;
  onNavigateToEvents: () => void;
  onNavigateToDividends: () => void;
  onNavigateToDiversification: () => void;
  onShareReferral: () => void;
  aiDrawerOpen: boolean;
  setAiDrawerOpen: (v: boolean) => void;
  sidebarExtra?: React.ReactNode;
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {chartBlock}
          <AssetPerformanceTable holdings={holdings} cashEntries={cashEntries} />
          <PortfolioTable holdings={holdings} onAddStock={onAddStock} />
          <MarketAndCash holdings={holdings} cashEntries={allCashEntries} />
          <PortfolioProjection holdings={holdings} cashEntries={cashEntries} />
          <GoalCelebration holdings={holdings} cashEntries={cashEntries} />
        </div>
        <div className="flex flex-col gap-3">
          <OnboardingChecklist onOpenAddStock={onAddStock} />
          <DailyDigestsTeaserCard />
          <WeeklyDigestCard position="promoted" />
          <CompactReferralCard onShare={onShareReferral} />
          <GoalPromptCard holdings={holdings} />
          <PortfolioScoreCard holdings={holdings} cashEntries={cashEntries} />
          <GoalProgressCard holdings={holdings} cashEntries={cashEntries} />
          {sidebarExtra}
          <AllocationTabs holdings={holdings} cashEntries={allCashEntries} onShowMore={onNavigateToDiversification} />
          <CompactDividendCard holdings={holdings} cashEntries={cashEntries} onNavigateToDividends={onNavigateToDividends} />
          <CompactEarningsCard onNavigateToEvents={onNavigateToEvents} />
          <PortfolioGrowthPeriods holdings={holdings} />
          <PerformanceMetrics holdings={holdings} cashEntries={cashEntries} />
          <PortfolioAiTrigger onOpen={() => setAiDrawerOpen(true)} />
          <WeeklyDigestCard position="default" />
        </div>
      </div>
      <PortfolioAiDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} autoAnalyze />
    </>
  );
}

// ── Dashboard with V2 chart ──

function V2Dashboard(props: Props) {
  const { holdings, cashEntries, allCashEntries, onAddStock, onNavigateToEvents, onNavigateToDividends, onNavigateToDiversification, onShareReferral } = props;

  const home = usePortfolioHomeData({ holdings, cashEntries });
  const {
    chartVisible,
    handleToggleChartVisible,
    chartExpanded,
    setChartExpanded,
    aiDrawerOpen,
    setAiDrawerOpen,
    assetFilter,
    setAssetFilter,
    totals,
    cashValueBase,
    investedValueBase,
    dayGainLoss,
    dayChangePctByType,
    refreshKey,
    recalculating,
    handleRecalculate,
    handleBackfillComplete,
  } = home;

  const v2ChartBlock = (
    <>
      <BackfillCTA holdingsCount={holdings.length} onComplete={handleBackfillComplete} />
      <ErrorBoundary>
        <PortfolioValueChart
          holdings={holdings}
          assetFilter={assetFilter}
          refreshKey={refreshKey}
          onRecalculate={handleRecalculate}
          recalculating={recalculating}
          onOpenAi={() => setAiDrawerOpen(true)}
          expanded={chartExpanded}
          onToggleExpand={() => setChartExpanded(!chartExpanded)}
          totalValue={totals.totalCurrentEUR}
          investedValue={investedValueBase}
          cashValue={cashValueBase}
          onUpdateCash={() => {
            if (typeof document === "undefined") return;
            const el = document.getElementById("dashboard-cash-assets");
            if (!el) return;
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            // Briefly highlight so the user sees which widget opened.
            el.classList.add("ring-2", "ring-emerald-400/60", "transition");
            window.setTimeout(() => {
              el.classList.remove("ring-2", "ring-emerald-400/60", "transition");
            }, 1600);
          }}
          dayGainLoss={dayGainLoss}
          dayGainLossPercent={investedValueBase - dayGainLoss > 0 ? (dayGainLoss / (investedValueBase - dayGainLoss)) * 100 : 0}
          totalGainLossPercent={totals.totalGainLossPercent}
          onAssetFilterChange={setAssetFilter}
          dayChangePctByType={dayChangePctByType as Partial<Record<AssetFilter, number>>}
          chartVisible={chartVisible || chartExpanded}
          onToggleChartVisible={handleToggleChartVisible}
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
    </>
  );

  if (chartExpanded) {
    return (
      <ExpandedLayout
        chartBlock={v2ChartBlock}
        holdings={holdings} cashEntries={cashEntries} allCashEntries={allCashEntries}
        onAddStock={onAddStock} onNavigateToEvents={onNavigateToEvents}
        onNavigateToDividends={onNavigateToDividends} onNavigateToDiversification={onNavigateToDiversification}
        onShareReferral={onShareReferral} aiDrawerOpen={aiDrawerOpen} setAiDrawerOpen={setAiDrawerOpen}
      />
    );
  }

  return (
    <CollapsedLayout
      chartBlock={v2ChartBlock}
      holdings={holdings} cashEntries={cashEntries} allCashEntries={allCashEntries}
      onAddStock={onAddStock} onNavigateToEvents={onNavigateToEvents}
      onNavigateToDividends={onNavigateToDividends} onNavigateToDiversification={onNavigateToDiversification}
      onShareReferral={onShareReferral} aiDrawerOpen={aiDrawerOpen} setAiDrawerOpen={setAiDrawerOpen}
      sidebarExtra={<StatsGrid holdings={holdings} cashEntries={cashEntries} />}
    />
  );
}

export default function DashboardPortfolioV2(props: Props) {
  return <V2Dashboard {...props} />;
}
