"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import Dashboard from "@/components/Dashboard";
import type { Holding, CashEntry, QuoteData, ExchangeRates } from "@/lib/types";

interface Props {
  initialHoldings: Holding[];
  initialCash: CashEntry[];
  demoMode?: boolean;
  initialQuotes?: Record<string, QuoteData>;
  initialExchangeRates?: ExchangeRates;
}

export default function DashboardShell({
  initialHoldings, initialCash,
  demoMode, initialQuotes, initialExchangeRates,
}: Props) {
  return (
    <PortfolioProvider
      initialHoldings={initialHoldings}
      initialCash={initialCash}
      demoMode={demoMode}
      initialQuotes={initialQuotes}
      initialExchangeRates={initialExchangeRates}
    >
      <Dashboard />
    </PortfolioProvider>
  );
}
