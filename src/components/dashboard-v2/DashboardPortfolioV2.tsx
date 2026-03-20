"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Holding, CashEntry } from "@/lib/types";

import CompactHeroChart from "./CompactHeroChart";
import StatsGrid from "./StatsGrid";
import CompactReferralCard from "./CompactReferralCard";

const AllocationTabs = dynamic(() => import("./AllocationTabs"), { ssr: false });
const GoalProgressCard = dynamic(() => import("./GoalProgressCard"), { ssr: false });
const CompactDividendCard = dynamic(() => import("./CompactDividendCard"), { ssr: false });
const CompactEarningsCard = dynamic(() => import("./CompactEarningsCard"), { ssr: false });
const PortfolioAiTrigger = dynamic(() => import("./PortfolioAiTrigger"), { ssr: false });
const PortfolioAiDrawer = dynamic(() => import("./PortfolioAiDrawer"), { ssr: false });
const PortfolioTable = dynamic(() => import("../PortfolioTable"), { ssr: false });
const PortfolioGrowthPeriods = dynamic(() => import("../PortfolioGrowthPeriods"), { ssr: false });
const PerformanceMetrics = dynamic(() => import("../PerformanceMetrics"), { ssr: false });
const MarketAndCash = dynamic(() => import("../MarketAndCash"), { ssr: false });
const PortfolioProjection = dynamic(() => import("../PortfolioProjection"), { ssr: false });
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

export default function DashboardPortfolioV2({
  holdings,
  cashEntries,
  allCashEntries,
  onAddStock,
  onNavigateToEvents,
  onNavigateToDividends,
  onNavigateToDiversification,
  onShareReferral,
}: Props) {
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4 min-w-0">
          <CompactHeroChart
            holdings={holdings}
            cashEntries={cashEntries}
            onOpenAi={() => setAiDrawerOpen(true)}
          />
          <PortfolioTable holdings={holdings} onAddStock={onAddStock} />
          <MarketAndCash holdings={holdings} cashEntries={allCashEntries} />
          <PortfolioProjection holdings={holdings} cashEntries={cashEntries} />
          <GoalCelebration holdings={holdings} cashEntries={cashEntries} />
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-3">
          <CompactReferralCard onShare={onShareReferral} />
          <GoalProgressCard holdings={holdings} cashEntries={cashEntries} />
          <StatsGrid holdings={holdings} cashEntries={cashEntries} />
          <AllocationTabs
            holdings={holdings}
            cashEntries={allCashEntries}
            onShowMore={onNavigateToDiversification}
          />
          <CompactDividendCard holdings={holdings} cashEntries={cashEntries} onNavigateToDividends={onNavigateToDividends} />
          <CompactEarningsCard onNavigateToEvents={onNavigateToEvents} />
          <PortfolioGrowthPeriods holdings={holdings} />
          <PerformanceMetrics holdings={holdings} cashEntries={cashEntries} />
          <PortfolioAiTrigger onOpen={() => setAiDrawerOpen(true)} />
        </div>
      </div>

      <PortfolioAiDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
    </>
  );
}
