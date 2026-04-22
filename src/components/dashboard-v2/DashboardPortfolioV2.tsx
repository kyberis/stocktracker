"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePortfolio } from "@/lib/portfolio-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { getMarketStatus, wasMarketOpenToday } from "@/lib/market-hours";
import { convertCurrency, resolveQuoteCurrency } from "@/lib/utils";
import { useTrack } from "@/lib/use-track";
import type { AssetFilter } from "./AssetTypeFilter";

// Persisted across desktop/mobile: when true the home dashboards render the
// portfolio graph and fetch history; when false (default for new sessions) the
// chart card shows only the header + a deep-dive CTA.
const CHART_VISIBLE_STORAGE_KEY = "trefolio.dashboardChartVisible";

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

function computeMarketAwareDayPL(
  holdings: Holding[],
  quotes: ReturnType<typeof usePortfolio>["quotes"],
  exchangeRates: ReturnType<typeof usePortfolio>["exchangeRates"],
  baseCurrency: string,
): number {
  let dayPL = 0;
  for (const h of holdings) {
    const isCrypto = h.assetType === "crypto";
    if (!isCrypto && !getMarketStatus(h.exchange).isOpen) continue;
    const quote = quotes[h.ticker];
    if (!quote || quote.regularMarketPrice <= 0) continue;
    const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
    const dayDelta = h.shares * (quote.regularMarketChange ?? 0);
    dayPL += convertCurrency(dayDelta, quoteCurrency, baseCurrency, exchangeRates);
  }
  return dayPL;
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

function CollapsedLayout({ chartBlock, breakdownBlock, holdings, cashEntries, allCashEntries, onAddStock, onNavigateToEvents, onNavigateToDividends, onNavigateToDiversification, onShareReferral, aiDrawerOpen, setAiDrawerOpen, sidebarExtra }: {
  chartBlock: React.ReactNode;
  breakdownBlock?: React.ReactNode;
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
          {breakdownBlock}
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
  const { quotes, exchangeRates, activePortfolioCurrency, demoMode } = usePortfolio();
  const track = useTrack();
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  // Demo always shows the chart so the /demo page keeps a polished first impression.
  // Otherwise start collapsed. DashboardPortfolioV2 is loaded via
  // `dynamic(..., { ssr: false })`, so it's safe to read localStorage in the
  // lazy initializer without hydration mismatch.
  const [chartVisible, setChartVisible] = useState<boolean>(() => {
    if (demoMode) return true;
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(CHART_VISIBLE_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const hasTrackedDeepDiveRef = useRef(false);

  useEffect(() => {
    if (demoMode) return;
    try {
      localStorage.setItem(CHART_VISIBLE_STORAGE_KEY, chartVisible ? "true" : "false");
    } catch {}
  }, [chartVisible, demoMode]);

  const handleToggleChartVisible = useCallback(() => {
    setChartVisible((v) => {
      const next = !v;
      if (next && !hasTrackedDeepDiveRef.current) {
        hasTrackedDeepDiveRef.current = true;
        track("dashboard_chart_deep_dive_opened");
      }
      return next;
    });
  }, [track]);

  const baseCurrency = activePortfolioCurrency;
  const { holdings, cashEntries, allCashEntries, onAddStock, onNavigateToEvents, onNavigateToDividends, onNavigateToDiversification, onShareReferral } = props;

  const filteredHoldings = useMemo(() => {
    if (assetFilter === "all") return holdings;
    return holdings.filter((h) => (h.assetType ?? "stock") === assetFilter);
  }, [holdings, assetFilter]);

  const effectiveCash = useMemo<CashEntry[]>(
    () => (assetFilter === "all" ? cashEntries : []),
    [assetFilter, cashEntries],
  );

  const totals = useMemo(
    () => calculatePortfolioTotals(filteredHoldings, effectiveCash, quotes, exchangeRates, baseCurrency),
    [filteredHoldings, effectiveCash, quotes, exchangeRates, baseCurrency],
  );

  const dayGainLoss = useMemo(
    () => computeMarketAwareDayPL(filteredHoldings, quotes, exchangeRates, baseCurrency),
    [filteredHoldings, quotes, exchangeRates, baseCurrency],
  );

  const dayChangePctByType = useMemo(() => {
    const result: Partial<Record<AssetFilter, number>> = {};
    const groups: AssetFilter[] = ["all", "stock", "etf", "crypto"];
    for (const group of groups) {
      const groupHoldings = group === "all" ? holdings : holdings.filter((h) => (h.assetType ?? "stock") === group);
      if (groupHoldings.length === 0) continue;
      let weightedChange = 0;
      let totalValue = 0;
      for (const h of groupHoldings) {
        const quote = quotes[h.ticker];
        if (!quote || quote.regularMarketPrice <= 0) continue;
        const isCrypto = h.assetType === "crypto";
        const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
        const posValue = Math.abs(h.shares * quote.regularMarketPrice);
        const posValueBase = convertCurrency(posValue, quoteCurrency, baseCurrency, exchangeRates);
        if (!isCrypto && !wasMarketOpenToday(h.exchange)) {
          totalValue += posValueBase;
          continue;
        }
        const dayDelta = h.shares * (quote.regularMarketChange ?? 0);
        const dayDeltaBase = convertCurrency(dayDelta, quoteCurrency, baseCurrency, exchangeRates);
        weightedChange += dayDeltaBase;
        totalValue += posValueBase;
      }
      result[group] = totalValue > 0 ? (weightedChange / totalValue) * 100 : 0;
    }
    return result;
  }, [holdings, quotes, exchangeRates, baseCurrency]);

  const handleBackfillComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/portfolio/backfill-snapshots", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("recalculate failed");
      setRefreshKey((k) => k + 1);
    } catch { /* user can retry */ } finally {
      setRecalculating(false);
    }
  }, []);

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
          dayGainLoss={dayGainLoss}
          dayGainLossPercent={totals.totalCurrentEUR > 0 ? (dayGainLoss / (totals.totalCurrentEUR - dayGainLoss)) * 100 : 0}
          totalGainLossPercent={totals.totalGainLossPercent}
          onAssetFilterChange={setAssetFilter}
          dayChangePctByType={dayChangePctByType}
          chartVisible={chartVisible || chartExpanded}
          onToggleChartVisible={handleToggleChartVisible}
        />
      </ErrorBoundary>
      {(chartVisible || chartExpanded) && (
        <MarketAwareBreakdown
          holdings={holdings}
          cashEntries={cashEntries}
          onFilterChange={setAssetFilter}
          activeFilter={assetFilter}
        />
      )}
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
