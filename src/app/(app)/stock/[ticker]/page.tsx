"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import StockDetail from "@/components/StockDetail";

interface PageProps {
  params: { ticker: string };
  searchParams: { exchange?: string };
}

export default function StockDetailPage({ params, searchParams }: PageProps) {
  return (
    <PortfolioProvider>
      <StockDetail
        ticker={decodeURIComponent(params.ticker)}
        exchange={searchParams.exchange || ""}
      />
    </PortfolioProvider>
  );
}
