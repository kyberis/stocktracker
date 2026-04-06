"use client";

import StockEvaluation from "@/components/StockEvaluation";

interface Props {
  ticker: string;
  exchange: string;
  reportId?: string;
}

export default function EvaluationShell({ ticker, exchange, reportId }: Props) {
  return <StockEvaluation ticker={ticker} exchange={exchange} reportId={reportId} />;
}
