"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import Dashboard from "@/components/Dashboard";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  initialHoldings: Holding[];
  initialCash: CashEntry[];
}

export default function DashboardShell({ initialHoldings, initialCash }: Props) {
  return (
    <PortfolioProvider initialHoldings={initialHoldings} initialCash={initialCash}>
      <Dashboard />
    </PortfolioProvider>
  );
}
