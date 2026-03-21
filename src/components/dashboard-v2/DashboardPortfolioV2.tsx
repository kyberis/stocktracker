"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePortfolio } from "@/lib/portfolio-context";
import { txAmountToBase } from "@/lib/performance";
import type { Holding, CashEntry, Transaction } from "@/lib/types";

import CompactHeroChart from "./CompactHeroChart";
import StatsGrid from "./StatsGrid";
import CompactReferralCard from "./CompactReferralCard";

const AllocationTabs = dynamic(() => import("./AllocationTabs"), { ssr: false });
const GoalProgressCard = dynamic(() => import("./GoalProgressCard"), { ssr: false });
const CompactDividendCard = dynamic(() => import("./CompactDividendCard"), { ssr: false });
const CompactEarningsCard = dynamic(() => import("./CompactEarningsCard"), { ssr: false });
const PortfolioScoreCard = dynamic(() => import("./PortfolioScoreCard"), { ssr: false });
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
  const { exchangeRates, activePortfolioCurrency, activePortfolioId, demoMode } = usePortfolio();
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [txInvested, setTxInvested] = useState<number | null>(null);

  useEffect(() => {
    if (demoMode) return;
    const pid = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
    fetch(`/api/transactions${pid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((txs: Transaction[] | null) => {
        if (!txs || txs.length === 0) return;
        const base = activePortfolioCurrency;
        let buyTotal = 0;
        let sellProceeds = 0;
        for (const tx of txs) {
          const amt = txAmountToBase(tx.totalAmount, tx, base, exchangeRates);
          const fees = txAmountToBase(tx.fees || 0, tx, base, exchangeRates);
          const taxes = txAmountToBase(tx.taxes || 0, tx, base, exchangeRates);
          if (tx.type === "buy") buyTotal += amt + fees + taxes;
          else if (tx.type === "sell") sellProceeds += amt - fees - taxes;
        }
        const invested = buyTotal - sellProceeds;
        if (invested > 0) setTxInvested(invested);
      })
      .catch(() => {});
  }, [activePortfolioId, demoMode, activePortfolioCurrency, exchangeRates]);

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
          <PortfolioScoreCard holdings={holdings} cashEntries={cashEntries} />
          <GoalProgressCard holdings={holdings} cashEntries={cashEntries} />
          <StatsGrid holdings={holdings} cashEntries={cashEntries} snapshotInvested={txInvested} />
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

      <PortfolioAiDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} autoAnalyze />
    </>
  );
}
