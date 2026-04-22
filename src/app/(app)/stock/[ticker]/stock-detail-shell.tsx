"use client";

import dynamic from "next/dynamic";

const StockDetail = dynamic(() => import("@/components/StockDetail"), {
  ssr: false,
  loading: () => (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="card rounded-xl h-32 animate-pulse bg-gray-50 dark:bg-white/[0.02]" />
      <div className="card rounded-xl h-[480px] animate-pulse bg-gray-50 dark:bg-white/[0.02]" />
    </div>
  ),
});

interface Props {
  ticker: string;
  exchange: string;
}

export default function StockDetailShell({ ticker, exchange }: Props) {
  return <StockDetail ticker={ticker} exchange={exchange} />;
}
