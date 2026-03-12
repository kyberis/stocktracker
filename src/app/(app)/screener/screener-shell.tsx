"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import StockScreener from "@/components/StockScreener";
import type { Holding } from "@/lib/types";

interface Props {
  initialHoldings: Holding[];
}

export default function ScreenerShell({ initialHoldings }: Props) {
  return (
    <PortfolioProvider initialHoldings={initialHoldings} initialCash={[]}>
      <StockScreener />
    </PortfolioProvider>
  );
}
