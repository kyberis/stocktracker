"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import StockIntelligence from "@/components/StockIntelligence";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  ticker: string;
  exchange: string;
  initialHoldings: Holding[];
  initialCash: CashEntry[];
}

export default function StockIntelligenceShell({ ticker, exchange, initialHoldings, initialCash }: Props) {
  return (
    <PortfolioProvider initialHoldings={initialHoldings} initialCash={initialCash}>
      <StockIntelligence ticker={ticker} exchange={exchange} />
    </PortfolioProvider>
  );
}
