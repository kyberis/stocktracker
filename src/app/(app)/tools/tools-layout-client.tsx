"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  initialHoldings: Holding[];
  initialCash: CashEntry[];
  children: React.ReactNode;
}

export default function ToolsLayoutClient({ initialHoldings, initialCash, children }: Props) {
  return (
    <PortfolioProvider initialHoldings={initialHoldings} initialCash={initialCash}>
      {children}
    </PortfolioProvider>
  );
}
