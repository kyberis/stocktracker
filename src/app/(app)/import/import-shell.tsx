"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import ImportPageContent from "./import-page-content";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  initialHoldings: Holding[];
  initialCash: CashEntry[];
}

export default function ImportShell({ initialHoldings, initialCash }: Props) {
  return (
    <PortfolioProvider initialHoldings={initialHoldings} initialCash={initialCash}>
      <ImportPageContent />
    </PortfolioProvider>
  );
}
