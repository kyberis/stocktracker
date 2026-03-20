"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import Dashboard from "@/components/Dashboard";
import type { Holding, CashEntry, QuoteData, ExchangeRates } from "@/lib/types";
import type { Portfolio } from "@/lib/db";

interface Props {
  initialHoldings: Holding[];
  initialCash: CashEntry[];
  demoMode?: boolean;
  initialQuotes?: Record<string, QuoteData>;
  initialExchangeRates?: ExchangeRates;
  initialPortfolios?: Portfolio[];
}

export default function DashboardShell({
  initialHoldings, initialCash,
  demoMode, initialQuotes, initialExchangeRates, initialPortfolios,
}: Props) {
  return (
    <PortfolioProvider
      initialHoldings={initialHoldings}
      initialCash={initialCash}
      demoMode={demoMode}
      initialQuotes={initialQuotes}
      initialExchangeRates={initialExchangeRates}
      initialPortfolios={initialPortfolios}
    >
      <Dashboard />
    </PortfolioProvider>
  );
}
