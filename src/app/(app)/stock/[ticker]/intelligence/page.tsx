"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import StockIntelligence from "@/components/StockIntelligence";

interface PageProps {
  params: { ticker: string };
  searchParams: { exchange?: string };
}

export default function StockIntelligencePage({ params, searchParams }: PageProps) {
  return (
    <PortfolioProvider>
      <StockIntelligence
        ticker={decodeURIComponent(params.ticker)}
        exchange={searchParams.exchange || ""}
      />
    </PortfolioProvider>
  );
}
