"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import StockDetail from "@/components/StockDetail";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  ticker: string;
  exchange: string;
  initialHoldings: Holding[];
  initialCash: CashEntry[];
}

export default function StockDetailShell({ ticker, exchange, initialHoldings, initialCash }: Props) {
  return (
    <PortfolioProvider initialHoldings={initialHoldings} initialCash={initialCash}>
      <StockDetail ticker={ticker} exchange={exchange} />
    </PortfolioProvider>
  );
}
