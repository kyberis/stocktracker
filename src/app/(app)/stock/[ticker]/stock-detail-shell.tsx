"use client";

import StockDetail from "@/components/StockDetail";

interface Props {
  ticker: string;
  exchange: string;
}

export default function StockDetailShell({ ticker, exchange }: Props) {
  return <StockDetail ticker={ticker} exchange={exchange} />;
}
