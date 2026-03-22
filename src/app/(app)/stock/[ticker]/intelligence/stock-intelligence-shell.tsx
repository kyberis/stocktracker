"use client";

import StockIntelligence from "@/components/StockIntelligence";

interface Props {
  ticker: string;
  exchange: string;
}

export default function StockIntelligenceShell({ ticker, exchange }: Props) {
  return <StockIntelligence ticker={ticker} exchange={exchange} />;
}
