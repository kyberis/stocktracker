"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import PortfolioTools from "@/components/PortfolioTools";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  initialHoldings: Holding[];
  initialCash: CashEntry[];
}

export default function ToolsShell({ initialHoldings, initialCash }: Props) {
  return (
    <PortfolioProvider initialHoldings={initialHoldings} initialCash={initialCash}>
      <PortfolioTools />
    </PortfolioProvider>
  );
}
